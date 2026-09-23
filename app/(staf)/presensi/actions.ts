'use server';

import sharp from 'sharp';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { AttendanceStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { readSession, isSuperAdmin, type SessionPayload } from '@/lib/auth';
import { can, requireAction } from '@/lib/access';
import { recordAudit } from '@/lib/audit';
import { simpanBerkas, BerkasError } from '@/lib/berkas';
import { assertUnit } from '@/lib/unit-scope';
import { jalankanAksi, teks, teksAtauNull, angka, wajib } from '@/lib/aksi-form';
import {
  KODE_STATUS, cekGeofence, hariWib, menitDariJam, menitWib, pulangCepat, sesiAktifPadaHari, statusMasuk, tanggalDb, tanggalWib, terkunci, hariDariTanggal,
} from '@/lib/presensi/inti';
import { asramaBolehInput, jadwalKerja, rombelBolehInput, santriAsrama, santriRombel, statusOtomatis, stafSaya, titikUnitPegawai } from '@/lib/presensi/akses';

const OPSI = { bawaan: '/presensi', prefiks: ['/presensi'], revalidate: ['/presensi'] };
const aktor = (s: SessionPayload) => ({ id: s.userId, nama: s.nama });
const SUMBER_TERLINDUNG = ['IZIN', 'POSKESTREN'];

// ─────────────────────────── Presensi siswa / santri ───────────────────────────

/**
 * Simpan presensi satu rombel/asrama untuk satu sesi (02 §2.2): upsert per
 * santri dalam SATU transaksi, audit SATU entri per rombel. Default Hadir;
 * status IZIN/POSKESTREN hanya bisa ditimpa pemegang presensi.override;
 * tanggal lampau (terkunci) butuh presensi.lock + alasan, diaudit sebelum/sesudah.
 */
export async function simpanPresensiRombel(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('presensi.input');
    const tanggal = wajib(fd, 'tanggal', 'Tanggal');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new Error('Tanggal tidak valid.');
    if (tanggal > tanggalWib()) throw new Error('Tidak bisa mengisi presensi untuk tanggal yang akan datang.');
    const sesi = await prisma.attendanceSession.findUnique({ where: { code: wajib(fd, 'sesi', 'Sesi') } });
    if (!sesi || !sesi.aktif) throw new Error('Sesi presensi tidak dikenal atau nonaktif.');
    if (!sesiAktifPadaHari(sesi.hariAktif, hariDariTanggal(tanggal))) throw new Error(`Sesi ${sesi.name} tidak berlangsung pada hari itu.`);

    const kunci = terkunci(tanggal);
    const alasan = teksAtauNull(fd, 'alasan');
    if (kunci) {
      if (!(await can(session, 'presensi.lock'))) throw new Error('Presensi tanggal ini sudah terkunci. Perubahan membutuhkan izin kepala unit (presensi.lock).');
      if (!alasan) throw new Error('Mengubah presensi yang sudah terkunci wajib disertai alasan.');
    }

    let label: string;
    let santri: Array<{ id: bigint; person: { fullName: string } }>;
    if (sesi.grouping === 'ASRAMA') {
      const asramaId = Number(teks(fd, 'asramaId'));
      const boleh = await asramaBolehInput(session);
      const asrama = boleh.find((a) => a.id === asramaId);
      if (!asrama) throw new Error('Anda tidak berwenang mengisi presensi asrama ini.');
      label = asrama.name;
      santri = await santriAsrama(asramaId);
    } else {
      const kelasId = Number(teks(fd, 'kelasId'));
      const boleh = await rombelBolehInput(session, tanggal, sesi.unitId);
      const kelas = boleh.find((k) => k.id === kelasId);
      // 02 §7 negatif: guru mengisi rombel yang bukan miliknya → ditolak di server.
      if (!kelas) throw new Error('Anda tidak berwenang mengisi presensi rombel ini.');
      assertUnit(session, kelas.unitId);
      label = `${kelas.nama} ${kelas.unit.nama}`;
      santri = await santriRombel(kelasId);
    }
    if (!santri.length) throw new Error('Tidak ada santri aktif di rombel/asrama ini.');

    const ids = santri.map((s) => s.id);
    const tgl = tanggalDb(tanggal);
    const [lama, otomatis, bolehTimpa] = await Promise.all([
      prisma.attendance.findMany({ where: { studentId: { in: ids }, date: tgl, session: sesi.code } }),
      statusOtomatis(ids, tanggal),
      can(session, 'presensi.override'),
    ]);
    const lamaById = new Map(lama.map((r) => [String(r.studentId), r]));
    let dilindungi = 0;
    const perubahan: Array<{ santri: string; dari: string | null; ke: string }> = [];
    const ops = santri.map((s) => {
      const k = String(s.id);
      const kode = teks(fd, `st_${k}`) || 'H';
      let status: AttendanceStatus = KODE_STATUS[kode] ?? 'Present';
      let source = 'MANUAL';
      const sebelum = lamaById.get(k);
      const auto = otomatis.get(k);
      const terlindung = sebelum && SUMBER_TERLINDUNG.includes(sebelum.source) ? { status: sebelum.status, source: sebelum.source } : auto ? { status: auto.status, source: auto.source } : null;
      if (terlindung && status !== terlindung.status && !bolehTimpa) {
        status = terlindung.status as AttendanceStatus; source = terlindung.source; dilindungi++;
      } else if (terlindung && status === terlindung.status) {
        source = terlindung.source;
      }
      if (!sebelum || sebelum.status !== status) perubahan.push({ santri: s.person.fullName, dari: sebelum?.status ?? null, ke: status });
      const note = teksAtauNull(fd, `cat_${k}`) ?? (source !== 'MANUAL' ? auto?.ket ?? sebelum?.note ?? null : null);
      return prisma.attendance.upsert({
        where: { studentId_date_session: { studentId: s.id, date: tgl, session: sesi.code } },
        create: { studentId: s.id, date: tgl, session: sesi.code, status, source, note, recordedBy: BigInt(session.userId) },
        update: { status, source, note, recordedBy: BigInt(session.userId) },
      });
    });
    await prisma.$transaction(ops);
    const hitung = (st: string) => santri.filter((s) => (KODE_STATUS[teks(fd, `st_${s.id}`) || 'H'] ?? 'Present') === st).length;
    await recordAudit({
      aksi: kunci ? 'PRESENSI_UBAH_TERKUNCI' : 'PRESENSI_SIMPAN_ROMBEL',
      entitas: 'attendance_records',
      entitasId: `${sesi.code}:${tanggal}:${label}`.slice(0, 64),
      ringkasan: `Presensi ${sesi.name} ${label} ${tanggal}: ${santri.length} santri, ${hitung('Absent')} alpa, ${hitung('Sick')} sakit, ${hitung('Excused')} izin${kunci ? ` — alasan: ${alasan}` : ''}.`.slice(0, 255),
      perubahan: kunci ? { alasan, perubahan } : undefined,
      aktor: aktor(session),
    });
    return `Presensi ${label} tersimpan (${santri.length} santri)${dilindungi ? `; ${dilindungi} status Izin/Sakit otomatis dipertahankan` : ''}.`;
  }, OPSI);
}

// ─────────────────────────── Presensi selfie pegawai ───────────────────────────

export type HasilPresensiDiri = { ok: boolean; pesan: string; perluAlasan?: boolean; jenis?: 'masuk' | 'pulang' };

async function tempelOverlay(buffer: Buffer, baris: string[]): Promise<Buffer> {
  // Resize dulu ke buffer supaya lebar overlay = lebar gambar hasil (foto potret
  // yang dikecilkan bisa < 720 px; komposit lebih lebar dari gambar akan gagal).
  const kecil = await sharp(buffer, { failOn: 'error' }).rotate().resize({ width: 720, height: 960, fit: 'inside', withoutEnlargement: true }).toBuffer();
  const gambar = sharp(kecil);
  const w = (await gambar.metadata()).width ?? 720;
  const tinggi = 26 * baris.length + 16;
  const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  const svg = `<svg width="${w}" height="${tinggi}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="rgba(0,0,0,0.55)"/>${baris.map((b, i) => `<text x="12" y="${26 * (i + 1)}" font-family="sans-serif" font-size="18" fill="#fff">${esc(b)}</text>`).join('')}</svg>`;
  return gambar.composite([{ input: Buffer.from(svg), gravity: 'south' }]).jpeg({ quality: 72 }).toBuffer();
}

/**
 * Check-in / check-out selfie (02 §3.2). Waktu dari SERVER; foto wajib dari
 * kamera (UI tidak menyediakan unggah galeri), dikompres di browser lalu diberi
 * overlay nama + waktu server + unit di sini. Di luar radius tidak ditolak
 * tetapi wajib alasan dan masuk antrean tinjau (02 §3.3).
 */
export async function presensiDiri(fd: FormData): Promise<HasilPresensiDiri> {
  const session = await readSession();
  if (!session) return { ok: false, pesan: 'Sesi berakhir, silakan masuk kembali.' };
  if (!(await can(session, 'presensi.self'))) return { ok: false, pesan: 'Tidak punya izin presensi diri.' };
  const staff = await stafSaya(session);
  if (!staff) return { ok: false, pesan: 'Akun Anda belum ditautkan ke data pegawai. Hubungi admin SDM.' };

  const lat = Number(fd.get('lat'));
  const lng = Number(fd.get('lng'));
  const akurasi = Math.round(Number(fd.get('akurasi')));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { ok: false, pesan: 'Lokasi tidak terbaca. Izinkan akses lokasi (GPS) di browser lalu coba lagi.' };
  }
  const foto = fd.get('foto');
  if (!(foto instanceof File) || foto.size === 0) return { ok: false, pesan: 'Foto selfie wajib diambil dari kamera.' };

  const sekarang = new Date(); // waktu SERVER — jam HP tidak dipakai sama sekali
  const tanggal = tanggalWib(sekarang);
  const tgl = tanggalDb(tanggal);
  const ada = await prisma.staffAttendance.findUnique({ where: { staffId_date: { staffId: staff.id, date: tgl } } });
  const jenis: 'masuk' | 'pulang' = ada?.checkInAt ? 'pulang' : 'masuk';
  if (ada?.checkInAt && ada.checkOutAt) return { ok: false, pesan: 'Presensi hari ini sudah lengkap (masuk & pulang).' };

  const titik = await titikUnitPegawai(staff);
  const geo = cekGeofence(lat, lng, titik);
  const alasan = String(fd.get('alasan') ?? '').trim();
  if (geo.luar && !alasan) {
    return { ok: false, perluAlasan: true, pesan: `Anda berada ${geo.jarakM != null ? `±${geo.jarakM} m dari titik unit` : 'di luar lokasi unit'}. Isi alasan (mis. dinas luar) untuk melanjutkan.` };
  }
  const unit = titik.find((t) => t.unitId === geo.unitId);
  const waktuTeks = sekarang.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'medium' });

  let berkasId: bigint;
  try {
    const olah = await tempelOverlay(Buffer.from(await foto.arrayBuffer()), [
      `${staff.person.fullName} — ${jenis === 'masuk' ? 'MASUK' : 'PULANG'}`,
      `${waktuTeks} WIB · ${geo.luar ? `luar lokasi ±${geo.jarakM ?? '?'} m` : unit?.nama ?? '-'}`,
    ]);
    const berkas = await simpanBerkas({ domain: 'presensi', buffer: olah, originalName: `selfie-${jenis}-${tanggal}.jpg`, uploadedBy: BigInt(session.userId) });
    berkasId = berkas.id;
  } catch (err) {
    return { ok: false, pesan: err instanceof BerkasError ? err.message : 'Foto tidak dapat diproses. Ambil ulang foto.' };
  }

  const h = await headers();
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;
  const ua = h.get('user-agent')?.slice(0, 255) ?? null;
  const jadwal = await jadwalKerja(staff.id, geo.unitId ?? staff.unitId, hariWib(sekarang));
  const menit = menitWib(sekarang);
  const jamTeks = new Date(sekarang.getTime() + 7 * 3600_000).toISOString().slice(11, 16);
  const tidakAkurat = !Number.isFinite(akurasi) || akurasi > 100;

  if (jenis === 'masuk') {
    const st = jadwal ? statusMasuk(menit, jadwal.jamMasuk, jadwal.toleransiMenit) : { status: 'Present' as const, lateMinutes: 0 };
    const data = {
      checkIn: jamTeks, checkInAt: sekarang, checkInPhotoId: berkasId, checkInLat: lat, checkInLng: lng, checkInAccuracyM: Number.isFinite(akurasi) ? akurasi : null,
      checkInDistanceM: geo.jarakM, unitId: geo.unitId ?? staff.unitId, outsideGeofence: geo.luar, outsideReason: geo.luar ? alasan : null,
      inaccurateLocation: tidakAkurat, status: st.status, lateMinutes: st.lateMinutes, source: 'SELFIE', ip, userAgent: ua,
    };
    await prisma.staffAttendance.upsert({ where: { staffId_date: { staffId: staff.id, date: tgl } }, create: { staffId: staff.id, date: tgl, ...data }, update: data });
  } else {
    const cepat = jadwal ? pulangCepat(menit, jadwal.jamPulang) : false;
    await prisma.staffAttendance.update({
      where: { staffId_date: { staffId: staff.id, date: tgl } },
      data: {
        checkOut: jamTeks, checkOutAt: sekarang, checkOutPhotoId: berkasId, checkOutLat: lat, checkOutLng: lng, checkOutAccuracyM: Number.isFinite(akurasi) ? akurasi : null,
        checkOutDistanceM: geo.jarakM, earlyDeparture: cepat, ...(geo.luar ? { outsideGeofence: true, outsideReason: [ada?.outsideReason, `pulang: ${alasan}`].filter(Boolean).join(' · ').slice(0, 255) } : {}),
        ...(tidakAkurat ? { inaccurateLocation: true } : {}),
      },
    });
  }
  await recordAudit({
    aksi: jenis === 'masuk' ? 'PRESENSI_CHECK_IN' : 'PRESENSI_CHECK_OUT', entitas: 'staff_attendances', entitasId: `${staff.id}:${tanggal}`,
    ringkasan: `${staff.person.fullName} ${jenis === 'masuk' ? 'check-in' : 'check-out'} ${jamTeks} WIB${geo.luar ? ` (luar lokasi ±${geo.jarakM ?? '?'} m: ${alasan})` : ''}.`.slice(0, 255),
    aktor: aktor(session), ip,
  });
  revalidatePath('/presensi');
  return { ok: true, jenis, pesan: `${jenis === 'masuk' ? 'Check-in' : 'Check-out'} tercatat pukul ${jamTeks} WIB${geo.luar ? ' — di luar lokasi, menunggu tinjauan atasan' : ''}.` };
}

// ─────────────────────────── Izin pegawai & tinjauan ───────────────────────────

const JENIS_IZIN = ['Sakit', 'Izin', 'Cuti', 'DinasLuar'];

export async function ajukanIzinPegawai(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('presensi.self');
    const staff = await stafSaya(session);
    if (!staff) throw new Error('Akun Anda belum ditautkan ke data pegawai.');
    const jenis = teks(fd, 'jenis');
    if (!JENIS_IZIN.includes(jenis)) throw new Error('Jenis izin tidak valid.');
    const dari = wajib(fd, 'dari', 'Tanggal mulai');
    const sampai = teks(fd, 'sampai') || dari;
    if (sampai < dari) throw new Error('Tanggal selesai tidak boleh sebelum tanggal mulai.');
    let lampiranId: bigint | null = null;
    const f = fd.get('lampiran');
    if (f instanceof File && f.size > 0) {
      try {
        lampiranId = (await simpanBerkas({ domain: 'presensi', buffer: Buffer.from(await f.arrayBuffer()), originalName: f.name, uploadedBy: BigInt(session.userId) })).id;
      } catch (err) { throw new Error(err instanceof BerkasError ? err.message : 'Lampiran gagal diunggah.'); }
    }
    const izin = await prisma.staffLeave.create({ data: { staffId: staff.id, jenis, dari: tanggalDb(dari), sampai: tanggalDb(sampai), alasan: wajib(fd, 'alasan', 'Alasan'), lampiranId } });
    await recordAudit({ aksi: 'PRESENSI_IZIN_AJUKAN', entitas: 'staff_leaves', entitasId: String(izin.id), ringkasan: `${staff.person.fullName} mengajukan ${jenis} ${dari} s.d. ${sampai}.`, aktor: aktor(session) });
    return `Pengajuan ${jenis} ${dari}${sampai !== dari ? ` s.d. ${sampai}` : ''} terkirim, menunggu persetujuan.`;
  }, OPSI);
}

async function assertTinjauPegawai(session: SessionPayload, staffId: bigint) {
  if (isSuperAdmin(session) || session.unitIds == null) return;
  const staff = await prisma.staff.findUniqueOrThrow({ where: { id: staffId }, include: { otherUnits: true } });
  const units = [staff.unitId, ...staff.otherUnits.map((u) => u.unitId)].filter((x): x is number => x != null);
  if (!units.some((u) => session.unitIds!.includes(u))) throw new Error('Pegawai ini di luar unit yang Anda tinjau.');
}

/** Setujui izin → hari-hari yang tercakup otomatis terisi di StaffAttendance (02 §3.6). */
export async function putuskanIzinPegawai(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('presensi.review');
    const id = BigInt(wajib(fd, 'id', 'ID'));
    const izin = await prisma.staffLeave.findUniqueOrThrow({ where: { id } });
    if (izin.status !== 'Diajukan') throw new Error('Pengajuan ini sudah diputuskan.');
    await assertTinjauPegawai(session, izin.staffId);
    const setuju = teks(fd, 'keputusan') === 'setuju';
    await prisma.staffLeave.update({ where: { id }, data: { status: setuju ? 'Disetujui' : 'Ditolak', approvedBy: BigInt(session.userId), note: teksAtauNull(fd, 'note') } });
    let hari = 0;
    if (setuju) {
      const status: AttendanceStatus = izin.jenis === 'Sakit' ? 'Sick' : izin.jenis === 'DinasLuar' ? 'Present' : 'Excused';
      for (let d = new Date(izin.dari); d <= izin.sampai; d = new Date(d.getTime() + 86_400_000)) {
        const ada = await prisma.staffAttendance.findUnique({ where: { staffId_date: { staffId: izin.staffId, date: d } } });
        if (ada?.checkInAt) continue; // hari yang sudah check-in tidak ditimpa
        await prisma.staffAttendance.upsert({
          where: { staffId_date: { staffId: izin.staffId, date: d } },
          create: { staffId: izin.staffId, date: d, status, source: 'IZIN', notes: `${izin.jenis}: ${izin.alasan}`.slice(0, 255) },
          update: { status, source: 'IZIN', notes: `${izin.jenis}: ${izin.alasan}`.slice(0, 255) },
        });
        hari++;
      }
    }
    await recordAudit({ aksi: 'PRESENSI_IZIN_PUTUS', entitas: 'staff_leaves', entitasId: String(id), ringkasan: `${izin.jenis} pegawai #${izin.staffId} ${setuju ? `disetujui (${hari} hari terisi)` : 'ditolak'}.`, aktor: aktor(session) });
    return setuju ? `Izin disetujui, ${hari} hari presensi terisi otomatis.` : 'Pengajuan izin ditolak.';
  }, OPSI);
}

/** Antrean "Perlu ditinjau" (02 §3.7): luar lokasi / lokasi tidak akurat / manual. */
export async function tinjauPresensi(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('presensi.review');
    const id = BigInt(wajib(fd, 'id', 'ID'));
    const row = await prisma.staffAttendance.findUniqueOrThrow({ where: { id }, include: { staff: { include: { person: true } } } });
    await assertTinjauPegawai(session, row.staffId);
    const setuju = teks(fd, 'keputusan') === 'setuju';
    await prisma.staffAttendance.update({
      where: { id },
      data: { verifiedBy: BigInt(session.userId), reviewStatus: setuju ? 'Disetujui' : 'Ditolak', reviewNote: teksAtauNull(fd, 'note'), ...(setuju ? {} : { status: 'Absent' }) },
    });
    await recordAudit({ aksi: 'PRESENSI_TINJAU', entitas: 'staff_attendances', entitasId: String(id), ringkasan: `Presensi ${row.staff.person.fullName} ${row.date.toISOString().slice(0, 10)} ${setuju ? 'disetujui' : 'ditolak (jadi Alpa)'}.`, aktor: aktor(session) });
    return `Presensi ${row.staff.person.fullName} ${setuju ? 'disetujui' : 'ditolak'}.`;
  }, OPSI);
}

// ─────────────────────────── Pengaturan ───────────────────────────

const polaJam = /^\d{2}:\d{2}$/;

export async function simpanSesi(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('presensi.setting');
    const code = wajib(fd, 'code', 'Kode').toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const jamMulai = wajib(fd, 'jamMulai', 'Jam mulai');
    const batas = wajib(fd, 'batasTerlambat', 'Batas terlambat');
    if (!polaJam.test(jamMulai) || !polaJam.test(batas)) throw new Error('Format jam HH:MM.');
    const hariAktif = fd.getAll('hari').map(Number).reduce((s, h) => s | (1 << (h - 1)), 0);
    if (!hariAktif) throw new Error('Pilih minimal satu hari aktif.');
    const data = {
      name: wajib(fd, 'name', 'Nama sesi'), unitId: teks(fd, 'unitId') ? Number(teks(fd, 'unitId')) : null, grouping: teks(fd, 'grouping') === 'ASRAMA' ? 'ASRAMA' : 'KELAS',
      jamMulai, batasTerlambat: batas, hariAktif, aktif: fd.get('aktif') === 'on',
    };
    await prisma.attendanceSession.upsert({ where: { code }, create: { code, ...data }, update: data });
    await recordAudit({ aksi: 'PRESENSI_SESI_SIMPAN', entitas: 'attendance_sessions', entitasId: code, ringkasan: `Sesi ${code} disimpan.`, aktor: aktor(session) });
    return `Sesi ${code} tersimpan.`;
  }, OPSI);
}

export async function simpanJadwalKerja(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('presensi.setting');
    const unitId = Number(wajib(fd, 'unitId', 'Unit'));
    let n = 0;
    for (let hari = 1; hari <= 7; hari++) {
      const masuk = teks(fd, `masuk_${hari}`);
      const pulang = teks(fd, `pulang_${hari}`);
      const tol = angka(fd, `toleransi_${hari}`) ?? 15;
      const ada = await prisma.workSchedule.findFirst({ where: { unitId, staffId: null, hari } });
      if (!masuk || !pulang) { if (ada) await prisma.workSchedule.delete({ where: { id: ada.id } }); continue; }
      if (!polaJam.test(masuk) || !polaJam.test(pulang) || menitDariJam(pulang) <= menitDariJam(masuk)) throw new Error(`Jam hari ke-${hari} tidak valid.`);
      if (ada) await prisma.workSchedule.update({ where: { id: ada.id }, data: { jamMasuk: masuk, jamPulang: pulang, toleransiMenit: tol } });
      else await prisma.workSchedule.create({ data: { unitId, hari, jamMasuk: masuk, jamPulang: pulang, toleransiMenit: tol } });
      n++;
    }
    await recordAudit({ aksi: 'PRESENSI_JAM_KERJA', entitas: 'work_schedules', entitasId: String(unitId), ringkasan: `Jam kerja unit #${unitId} disimpan (${n} hari kerja).`, aktor: aktor(session) });
    return `Jam kerja tersimpan (${n} hari kerja).`;
  }, OPSI);
}

export async function tambahLibur(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('presensi.setting');
    const tanggal = wajib(fd, 'date', 'Tanggal');
    const h = await prisma.holiday.create({ data: { date: tanggalDb(tanggal), name: wajib(fd, 'name', 'Nama libur'), unitId: teks(fd, 'unitId') ? Number(teks(fd, 'unitId')) : null } });
    await recordAudit({ aksi: 'PRESENSI_LIBUR_TAMBAH', entitas: 'holidays', entitasId: String(h.id), ringkasan: `Libur ${tanggal} ${h.name}.`, aktor: aktor(session) });
    return `Libur ${h.name} ditambahkan.`;
  }, OPSI);
}

export async function hapusLibur(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('presensi.setting');
    const id = Number(wajib(fd, 'id', 'ID'));
    await prisma.holiday.delete({ where: { id } });
    await recordAudit({ aksi: 'PRESENSI_LIBUR_HAPUS', entitas: 'holidays', entitasId: String(id), ringkasan: `Libur #${id} dihapus.`, aktor: aktor(session) });
    return 'Libur dihapus.';
  }, OPSI);
}

export async function simpanTitikUnit(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('presensi.setting');
    const unitId = Number(wajib(fd, 'unitId', 'Unit'));
    const lat = angka(fd, 'latitude');
    const lng = angka(fd, 'longitude');
    const radius = angka(fd, 'radius');
    if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new Error('Koordinat tidak valid.');
    if (radius == null || radius < 20 || radius > 5000) throw new Error('Radius 20–5000 meter.');
    await prisma.unit.update({ where: { id: unitId }, data: { latitude: lat, longitude: lng, radiusPresensiM: Math.round(radius) } });
    await recordAudit({ aksi: 'PRESENSI_TITIK_UNIT', entitas: 'unit', entitasId: String(unitId), ringkasan: `Titik presensi unit #${unitId}: ${lat},${lng} r=${radius} m.`, aktor: aktor(session) });
    return 'Titik & radius unit tersimpan.';
  }, OPSI);
}
