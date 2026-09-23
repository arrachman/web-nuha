import { unlink } from 'node:fs/promises';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';
import { kirimWa, renderTemplate } from '@/lib/wa';
import { pathAbsolutBerkas } from '@/lib/berkas';
import { namaHariPelajaran } from '@/lib/penjadwal/waktu';
import { hariWib, menitDariJam, menitWib, sesiAktifPadaHari, tanggalDb, tanggalWib } from './inti';
import { statusOtomatis } from './akses';

/**
 * Tugas cron presensi (02 §2.3, §2.5, §3.4, §3.9). Semua idempoten — aman
 * dijalankan tiap tick; waktu dihitung WIB dari jam server.
 */

/** Isi otomatis Izin (izin pondok) & Sakit (Poskestren) untuk sesi hari ini — hanya bila belum ada baris. */
export async function isiOtomatisSantri(sekarang = new Date()): Promise<number> {
  const tanggal = tanggalWib(sekarang);
  const hari = hariWib(sekarang);
  const sesi = (await prisma.attendanceSession.findMany({ where: { aktif: true } })).filter((s) => sesiAktifPadaHari(s.hariAktif, hari) && s.code !== 'MADIN');
  if (!sesi.length) return 0;
  const [izin, medis] = await Promise.all([
    prisma.leavePermit.findMany({ where: { status: { in: ['Approved', 'Completed'] }, departedAt: { lte: new Date(tanggalDb(tanggal).getTime() + 86_400_000) } }, select: { studentId: true } }),
    prisma.medicalRecord.findMany({ where: { date: tanggalDb(tanggal), followUpStatus: { in: ['Istirahat', 'Rawat', 'Rujuk'] } }, select: { studentId: true } }),
  ]);
  const kandidat = [...new Set([...izin, ...medis].map((r) => r.studentId))];
  if (!kandidat.length) return 0;
  const otomatis = await statusOtomatis(kandidat, tanggal);
  const santri = await prisma.santri.findMany({ where: { id: { in: [...otomatis.keys()].map((k) => BigInt(k)) }, status: 'Aktif' }, include: { unit: true } });
  let n = 0;
  for (const s of santri) {
    const o = otomatis.get(String(s.id))!;
    for (const se of sesi) {
      const cocok = se.grouping === 'ASRAMA' ? s.roomId != null : ['SMP', 'MA'].includes(s.unit?.key ?? '');
      if (!cocok) continue;
      const ada = await prisma.attendance.findUnique({ where: { studentId_date_session: { studentId: s.id, date: tanggalDb(tanggal), session: se.code } } });
      if (ada) continue;
      await prisma.attendance.create({ data: { studentId: s.id, date: tanggalDb(tanggal), session: se.code, status: o.status, source: o.source, note: o.ket } });
      n++;
    }
  }
  return n;
}

/**
 * Pegawai yang tidak check-in sampai jam pulang → Alpa (02 §3.4), kecuali hari
 * libur, sudah ada baris (izin/cuti disetujui), atau guru yang hari ini tidak
 * punya jadwal mengajar padahal biasanya mengajar (06 P4).
 */
export async function tandaiAlpaPegawai(sekarang = new Date()): Promise<number> {
  const tanggal = tanggalWib(sekarang);
  const hari = hariWib(sekarang);
  const menit = menitWib(sekarang);
  const libur = await prisma.holiday.findMany({ where: { date: tanggalDb(tanggal) } });
  if (libur.some((l) => l.unitId == null)) return 0;
  const staf = await prisma.staff.findMany({ where: { status: 'Aktif', person: { user: { aktif: true } } }, select: { id: true, unitId: true } });
  const jadwalUnit = await prisma.workSchedule.findMany({ where: { hari } });
  const sudah = new Set((await prisma.staffAttendance.findMany({ where: { date: tanggalDb(tanggal) }, select: { staffId: true } })).map((r) => String(r.staffId)));
  const namaHari = namaHariPelajaran(hari === 7 ? 0 : hari);
  let n = 0;
  for (const s of staf) {
    if (sudah.has(String(s.id)) || !s.unitId || libur.some((l) => l.unitId === s.unitId)) continue;
    const j = jadwalUnit.find((x) => x.staffId === s.id) ?? jadwalUnit.find((x) => x.staffId == null && x.unitId === s.unitId);
    if (!j || menit < menitDariJam(j.jamPulang)) continue;
    const mengajar = await prisma.jadwalPelajaran.count({ where: { staffId: s.id } });
    if (mengajar > 0 && (await prisma.jadwalPelajaran.count({ where: { staffId: s.id, hari: namaHari } })) === 0) continue;
    await prisma.staffAttendance.create({ data: { staffId: s.id, date: tanggalDb(tanggal), status: 'Absent', source: 'SISTEM', notes: 'Tidak check-in sampai jam pulang' } }).catch(() => undefined);
    n++;
  }
  return n;
}

/** WA ke wali bila santri Alpa di sesi sekolah — sekali per hari per santri, setelah batas terlambat + 60 menit (02 §2.5, 06 P8). */
export async function kirimWaAlpa(sekarang = new Date()): Promise<number> {
  const sesi = await prisma.attendanceSession.findUnique({ where: { code: 'SEKOLAH' } });
  const tpl = await prisma.waTemplate.findUnique({ where: { code: 'PRESENSI_ALPA' } });
  if (!sesi || !tpl || !tpl.isActive) return 0;
  if (menitWib(sekarang) < menitDariJam(sesi.batasTerlambat) + 60) return 0;
  const tanggal = tanggalWib(sekarang);
  const alpa = await prisma.attendance.findMany({ where: { date: tanggalDb(tanggal), session: 'SEKOLAH', status: 'Absent' }, include: { student: { include: { person: true } } } });
  let n = 0;
  for (const a of alpa) {
    const antre = await prisma.notificationQueue.create({ data: { templateCode: 'PRESENSI_ALPA', recipientId: String(a.studentId), scheduledDate: tanggalDb(tanggal), status: 'Diproses' } }).catch(() => null);
    if (!antre) continue; // sudah pernah diantrekan hari ini
    const wali = await prisma.guardianRelation.findFirst({ where: { anakId: a.student.personId }, include: { wali: true }, orderBy: { utama: 'desc' } });
    if (!wali?.wali.phone) { await prisma.notificationQueue.update({ where: { id: antre.id }, data: { status: 'Tanpa HP' } }); continue; }
    const isi = renderTemplate(tpl.content.replace(/\{(\w+)\}/g, '{{$1}}'), { wali: wali.wali.fullName, nama: a.student.person.fullName, tanggal, sesi: sesi.name });
    const r = await kirimWa({ nomor: wali.wali.phone, tujuan: wali.wali.fullName, isi, templateId: tpl.id }).catch(() => null);
    await prisma.notificationQueue.update({ where: { id: antre.id }, data: { status: r ? 'Terkirim' : 'Gagal' } });
    n++;
  }
  return n;
}

/** Retensi foto presensi 90 hari (06 P7): berkas fisik dihapus, baris presensi & metadata tetap. */
export async function hapusFotoPresensiLama(hari = 90): Promise<number> {
  const batas = new Date(Date.now() - hari * 86_400_000);
  const lama = await prisma.fileObject.findMany({ where: { domain: 'presensi', deletedAt: null, createdAt: { lt: batas } }, select: { id: true, path: true }, take: 500 });
  for (const f of lama) await unlink(pathAbsolutBerkas(f.path)).catch(() => undefined);
  if (lama.length) await prisma.fileObject.updateMany({ where: { id: { in: lama.map((f) => f.id) } }, data: { deletedAt: new Date() } });
  return lama.length;
}

export async function sapuPresensi(): Promise<void> {
  try {
    const sekarang = new Date();
    const otomatis = await isiOtomatisSantri(sekarang);
    const alpa = await tandaiAlpaPegawai(sekarang);
    const wa = await kirimWaAlpa(sekarang);
    const foto = menitWib(sekarang) < 5 ? await hapusFotoPresensiLama() : 0;
    if (otomatis || alpa || wa || foto) log('info', 'Sapu presensi', { otomatis, alpaPegawai: alpa, waAlpa: wa, fotoDihapus: foto });
  } catch (error) {
    log('error', 'Sapu presensi gagal', { error: error instanceof Error ? error.message : String(error) });
  }
}
