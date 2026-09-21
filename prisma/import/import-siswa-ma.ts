/**
 * Impor siswa MA dari dua berkas angkatan:
 * - `DATA SISWA TA 2025_2026.xlsx` (angkatan 1, 11 siswa) → kelas **11**
 * - `DATA SISWA TA 2026_2027.xlsx` (angkatan 2, 8 siswa) → kelas **10**
 * keduanya diposisikan pada TahunAjaran aktif (2026/2027 Gasal) — lihat
 * RENCANA-IMPORT.md §0 tabel posisi kelas.
 *
 * Tiap berkas berisi 3 sheet: DATA DIRI SISWA, DATA WALI MURID, DATA
 * KESEHATAN, dicocokkan lewat kolom "No" (posisi baris konsisten di ketiga
 * sheet pada berkas yang sama). Menulis Santri + Orang + GuardianRelation
 * (Ayah/Ibu/Wali) + ProfilKesehatan. NIS dibuat deterministik
 * (`lib/nis.ts`); NISN adalah kunci pencocokan idempoten.
 *
 * Jalankan: `npm run import:siswa-ma` (path default ke docs/, bisa dioverride
 * lewat --xi/--x).
 */
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { JenisKelamin, StatusSantri } from '@prisma/client';
import { bacaXlsx, angkaKeTeksUtuh, type Lembar } from './lib/xlsx';
import { parseTtl } from './lib/tanggal-id';
import { buatNis } from './lib/nis';
import { tulisGuardianRelation } from './lib/tulis-wali';

type Galat = { berkas: string; baris: number; pesan: string };
const AKTOR_SKRIP = { nama: 'Importir siswa MA (skrip)' };
const KODE_UNIT = 'MA';

type SiapSiswa = {
  berkas: string;
  baris: number;
  nama: string;
  tmpLahir: string;
  tglLahir: Date;
  jk: JenisKelamin;
  nik: string | null;
  noKk: string | null;
  nisn: string;
  alamat: string;
  anakKe: number | null;
  jumlahSaudara: number | null;
  hobi: string | null;
  citaCita: string | null;
  hp: string | null;
  asalSekolah: string | null;
  wali: { B: string; row: Record<string, string> } | undefined;
  kesehatan: Record<string, string> | undefined;
};

const bacaArgumen = (argv: string[]): Record<string, string> => {
  const hasil: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      hasil[argv[i].slice(2)] = argv[i + 1] ?? '';
      i += 1;
    }
  }
  return hasil;
};

/** Bangun peta "No" (kolom B) → baris, dipakai untuk mencocokkan sheet wali/kesehatan ke sheet diri. */
const petaByNo = (lembar: Lembar, mulaiBaris: number): Map<string, Record<string, string>> => {
  const peta = new Map<string, Record<string, string>>();
  for (const [r, row] of lembar) {
    if (r < mulaiBaris) continue;
    const no = row.B?.trim();
    if (no) peta.set(no, row);
  }
  return peta;
};

function siapkanSatuBerkas(path: string, tahunMasuk: string, galat: Galat[]): SiapSiswa[] {
  const wb = bacaXlsx(path);
  const diri = wb.ambilSheet('DATA DIRI SISWA');
  const wali = wb.ambilSheet('DATA WALI MURID');
  const kesehatan = wb.ambilSheet('DATA KESEHATAN');

  const header = diri.get(4);
  if (!header || header.C?.trim() !== 'NAMA' || header.F !== 'NIK' || header.H !== 'NISN') {
    throw new Error(`"${path}": header sheet DATA DIRI SISWA tidak sesuai dugaan (NAMA/NIK/NISN) — struktur mungkin berubah.`);
  }

  const petaWali = petaByNo(wali, 5);
  const petaKesehatan = petaByNo(kesehatan, 5);

  const hasil: SiapSiswa[] = [];
  const nomorBaris = [...diri.keys()].filter((r) => r >= 5).sort((a, b) => a - b);

  for (const r of nomorBaris) {
    const row = diri.get(r)!;
    const nama = row.C?.trim();
    if (!nama) continue; // baris kosong (nomor urut template tanpa data), bukan galat

    try {
      const ttlMentah = row.D?.trim();
      if (!ttlMentah) throw new Error('TEMPAT, TANGGAL LAHIR kosong');
      const { tempat, tanggal } = parseTtl(ttlMentah);

      const jkMentah = row.E?.trim().toUpperCase();
      if (jkMentah !== 'LAKI-LAKI' && jkMentah !== 'PEREMPUAN') {
        throw new Error(`JENIS KELAMIN harus "LAKI-LAKI"/"PEREMPUAN" (dapat: "${row.E}")`);
      }

      const nisnMentah = row.H?.trim();
      if (!nisnMentah) throw new Error('NISN kosong');
      const nisn = angkaKeTeksUtuh(nisnMentah);
      if (!/^\d+$/.test(nisn)) throw new Error(`NISN "${row.H}" harus berisi digit saja (setelah konversi: "${nisn}")`);

      const nik = row.F?.trim() ? angkaKeTeksUtuh(row.F.trim()) : null;
      const noKk = row.G?.trim() ? angkaKeTeksUtuh(row.G.trim()) : null;
      const alamat = row.J?.trim() ?? '';
      const anakKe = row.K?.trim() ? Number(row.K.trim()) : null;
      const jumlahSaudara = row.L?.trim() ? Number(row.L.trim()) : null;

      const no = row.B?.trim();
      hasil.push({
        berkas: path,
        baris: r,
        nama,
        tmpLahir: tempat,
        tglLahir: tanggal,
        jk: jkMentah === 'PEREMPUAN' ? JenisKelamin.P : JenisKelamin.L,
        nik,
        noKk,
        nisn,
        alamat,
        anakKe: Number.isFinite(anakKe) ? anakKe : null,
        jumlahSaudara: Number.isFinite(jumlahSaudara) ? jumlahSaudara : null,
        hobi: row.M?.trim() || null,
        citaCita: row.N?.trim() || null,
        hp: row.O?.trim() || null,
        asalSekolah: row.P?.trim() || null,
        wali: no ? { B: no, row: petaWali.get(no) ?? {} } : undefined,
        kesehatan: no ? petaKesehatan.get(no) : undefined,
      });
    } catch (error) {
      galat.push({ berkas: path, baris: r, pesan: error instanceof Error ? error.message : String(error) });
    }
  }

  void tahunMasuk;
  return hasil;
}

async function jalankan(): Promise<void> {
  const argumen = bacaArgumen(process.argv.slice(2));
  const pathXi = argumen.xi || 'docs/DATA SISWA TA 2025_2026.xlsx';
  const pathX = argumen.x || 'docs/DATA SISWA TA 2026_2027.xlsx';

  const galat: Galat[] = [];
  const siapXi = siapkanSatuBerkas(pathXi, '2025', galat);
  const siapX = siapkanSatuBerkas(pathX, '2026', galat);

  // Duplikat NISN lintas kedua berkas (mestinya tidak terjadi, dua angkatan berbeda).
  const nisnTerlihat = new Map<string, string>();
  for (const s of [...siapXi, ...siapX]) {
    const kunci = `${s.berkas}:${s.baris}`;
    const existing = nisnTerlihat.get(s.nisn);
    if (existing && existing !== kunci) {
      galat.push({ berkas: s.berkas, baris: s.baris, pesan: `NISN "${s.nisn}" duplikat dengan baris ${existing}` });
    }
    nisnTerlihat.set(s.nisn, kunci);
  }

  if (galat.length > 0) {
    console.error(`Ditemukan ${galat.length} galat validasi. Tidak ada data yang ditulis ke DB.\n`);
    for (const g of galat) console.error(`  - [${g.berkas}:${g.baris}] ${g.pesan}`);
    process.exitCode = 1;
    return;
  }

  const unit = await prisma.unit.findUniqueOrThrow({ where: { key: KODE_UNIT } });
  const academicYear = await prisma.academicYear.findFirstOrThrow({ where: { isActive: true } });

  console.log(`Validasi lolos: ${siapXi.length} siswa (kelas 11, ${pathXi}) + ${siapX.length} siswa (kelas 10, ${pathX}). Menulis ke database...`);

  const kelasXi = await prisma.kelas.upsert({
    where: { unitId_nama_academicYearId: { unitId: unit.id, nama: 'Kelas 2', academicYearId: academicYear.id } },
    create: { unitId: unit.id, nama: 'Kelas 2', tingkat: '11', academicYearId: academicYear.id },
    update: {},
  });
  const kelasX = await prisma.kelas.upsert({
    where: { unitId_nama_academicYearId: { unitId: unit.id, nama: 'Kelas 1', academicYearId: academicYear.id } },
    create: { unitId: unit.id, nama: 'Kelas 1', tingkat: '10', academicYearId: academicYear.id },
    update: {},
  });

  const tulisSatuAngkatan = async (siap: SiapSiswa[], tahunMasuk: string, kelasId: number): Promise<void> => {
    let urut = 0;
    for (const s of siap) {
      urut += 1;
      const orang = await prisma.person.upsert({
        where: { email: `santri.${s.nisn}@nuha.local` },
        create: {
          fullName: s.nama, gender: s.jk, birthDate: s.tglLahir, birthPlace: s.tmpLahir, nik: s.nik, familyCardNumber: s.noKk,
          addressLine: s.alamat, birthOrder: s.anakKe, siblingCount: s.jumlahSaudara, hobby: s.hobi, aspiration: s.citaCita,
          phone: s.hp, previousSchool: s.asalSekolah, email: `santri.${s.nisn}@nuha.local`,
        },
        update: {
          fullName: s.nama, gender: s.jk, birthDate: s.tglLahir, birthPlace: s.tmpLahir, nik: s.nik, familyCardNumber: s.noKk,
          addressLine: s.alamat, birthOrder: s.anakKe, siblingCount: s.jumlahSaudara, hobby: s.hobi, aspiration: s.citaCita,
          phone: s.hp, previousSchool: s.asalSekolah,
        },
      });

      const nis = buatNis(tahunMasuk, KODE_UNIT, urut);
      const santri = await prisma.santri.upsert({
        where: { nisn: s.nisn },
        create: { personId: orang.id, nis, nisn: s.nisn, unitId: unit.id, kelasId, status: StatusSantri.Aktif, tahunMasuk },
        update: { personId: orang.id, nis, unitId: unit.id, kelasId, tahunMasuk },
      });

      const w = s.wali?.row ?? {};
      await tulisGuardianRelation(orang.id, s.nisn, 'Ayah', { nama: w.E, nik: w.F, ttl: w.G, pekerjaan: w.H, pendapatan: w.I, pendidikan: w.J, hp: w.K });
      await tulisGuardianRelation(orang.id, s.nisn, 'Ibu', { nama: w.L, nik: w.M, ttl: w.N, pekerjaan: w.O, pendapatan: w.P, pendidikan: w.Q, hp: w.R });
      await tulisGuardianRelation(orang.id, s.nisn, 'Wali', { nama: w.T, nik: w.U, ttl: w.V, pendidikan: w.W, pekerjaan: w.X, hp: w.Y });

      const k = s.kesehatan;
      if (k && (k.D || k.E || k.F || k.G)) {
        await prisma.healthProfile.upsert({
          where: { studentId: santri.id },
          create: {
            studentId: santri.id,
            weightKg: k.D ? Number(angkaKeTeksUtuh(k.D)) : null,
            heightCm: k.E ? Number(angkaKeTeksUtuh(k.E)) : null,
            medicalHistory: k.F?.trim() || null,
            specialNeeds: k.G?.trim() || null,
          },
          update: {
            weightKg: k.D ? Number(angkaKeTeksUtuh(k.D)) : null,
            heightCm: k.E ? Number(angkaKeTeksUtuh(k.E)) : null,
            medicalHistory: k.F?.trim() || null,
            specialNeeds: k.G?.trim() || null,
          },
        });
      }
    }
  };

  await tulisSatuAngkatan(siapXi, '2025', kelasXi.id);
  await tulisSatuAngkatan(siapX, '2026', kelasX.id);

  await recordAudit({
    aksi: 'import',
    entitas: 'Santri',
    entitasId: 'batch',
    ringkasan: `Impor XLSX siswa MA: ${siapXi.length} kelas 11 + ${siapX.length} kelas 10 (${pathXi}, ${pathX}).`,
    aktor: AKTOR_SKRIP,
  });

  console.log(`Selesai. ${siapXi.length + siapX.length} Santri MA di-upsert.`);
}

jalankan()
  .catch((error) => {
    console.error('Galat tak terduga saat impor siswa MA:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
