/**
 * Impor "2. Form Pendataan SMP (1) (2).xlsx" — 4 sheet (`KELAS 7`, `KELAS 8`,
 * `KELAS 9 A&B`, `alumni`) → `Santri` unit SMP. Kelas 7/8/9 diposisikan pada
 * TahunAjaran aktif (2026/2027 Gasal); `alumni` ditulis dengan status
 * `Alumni` dan TANPA kelasId/tahunMasuk (client mengonfirmasi sheet ini
 * sungguh alumni, tapi tahun lulus/masuk mereka tidak dinyatakan di berkas
 * — jangan ditebak).
 *
 * CATATAN PENTING (bukan asumsi yang dipaksakan, melainkan temuan nyata
 * dari berkas, dikonfirmasi ke client): teks judul di baris 1 tiap sheet
 * ("...TAHUN AJARAN 2025/2026 KELAS 7/8/9") adalah sisa copy-paste dari
 * template dan TIDAK konsisten dengan isi sheet maupun sheet ringkasan
 * "DATA JUMLAH SISWA" — importir mengambil kelas dari NAMA SHEET (bukan
 * teks judul, bukan sheet ringkasan), sesuai konfirmasi client.
 *
 * Sheet "Sheet1" (29 baris tanpa header, kontak alamat/wali duplikat nama
 * dari "KELAS 9 A&B") SENGAJA diabaikan (konfirmasi client).
 *
 * Layout kolom TIDAK seragam antar sheet: `KELAS 7`/`KELAS 8` punya kolom
 * "EMAIL AKTIF" (O), sehingga blok wali ada di P/Q/R. `KELAS 9 A&B`/`alumni`
 * TIDAK punya kolom email, sehingga blok wali bergeser satu kolom lebih awal
 * (O/P/Q). Importir mendeteksi ini dari header, bukan hardcode per sheet.
 *
 * Baris "Contoh pengisian" (baris instruksi template) dilewati lewat cek
 * kolom "NO." harus bilangan bulat positif — bukan tebakan nama baris.
 *
 * NIS = NISN (konfirmasi client — berkas tidak punya NIS internal terpisah).
 *
 * `tahunMasuk` untuk kelas 7/8/9 aktif adalah ASUMSI (client tidak
 * menyatakannya eksplisit): dihitung mundur dari tingkat saat ini terhadap
 * tahun ajaran aktif (2026/2027) dengan asumsi masa studi 3 tahun linear
 * tanpa tinggal-kelas — kelas 7 → masuk 2026, kelas 8 → masuk 2025, kelas 9
 * → masuk 2024. Perlu dikonfirmasi ke client bila ada siswa yang tidak naik
 * kelas biasa.
 *
 * Jalankan: `npm run import:siswa-smp` (path default docs/, override --file).
 */
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { JenisKelamin, StatusSantri } from '@prisma/client';
import { bacaXlsx, angkaKeTeksUtuh } from './lib/xlsx';
import { parseTtl } from './lib/tanggal-id';
import { tulisGuardianRelation } from './lib/tulis-wali';

type Galat = { sheet: string; baris: number; pesan: string };
const AKTOR_SKRIP = { nama: 'Importir siswa SMP (skrip)' };
const KODE_UNIT = 'SMP';
const TAHUN_AJARAN_AKTIF_UNTUK_MASUK = 2026; // tahun awal TA aktif 2026/2027, basis hitung mundur tahunMasuk

/** `tingkat: null` menandai sheet alumni — tidak dipasangkan ke Kelas/TahunAjaran aktif. */
const SHEET_KE_TINGKAT: Record<string, string | null> = {
  'KELAS 7': '7',
  'KELAS 8': '8',
  'KELAS 9 A&B': '9',
  alumni: null,
};

type SiapSantriSmp = {
  sheet: string;
  baris: number;
  nama: string;
  identitasKelas: string;
  tmpLahir: string;
  tglLahir: Date;
  jk: JenisKelamin;
  nik: string;
  nisn: string;
  alamat: string;
  rt: string | null;
  rw: string | null;
  kelurahan: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  hp: string | null;
  namaWali: string | null;
  nikWali: string | null;
  hpWali: string | null;
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

/** Angka dengan sufiks ".0" dari format numerik XLSX (mis. RT "6.0") → teks bersih "6". */
const bersihkanAngka = (mentah: string | undefined): string | null => {
  const teks = mentah?.trim();
  if (!teks) return null;
  const n = Number(teks);
  return Number.isFinite(n) ? String(Math.trunc(n)) : teks;
};

function siapkanSheet(path: string, namaSheet: string, galat: Galat[]): SiapSantriSmp[] {
  const wb = bacaXlsx(path);
  const sheet = wb.ambilSheet(namaSheet);
  const header = sheet.get(5);
  if (!header || header.B !== 'NAMA LENGKAP SISWA SESUAI KK' || header.D !== 'NIK' || header.E !== 'NISN') {
    throw new Error(`"${path}" sheet "${namaSheet}": header baris ke-5 tidak sesuai dugaan (NAMA/NIK/NISN) — struktur mungkin berubah.`);
  }
  // Sheet dengan kolom "EMAIL AKTIF" (O) punya blok wali di P/Q/R; sheet
  // tanpa kolom email (KELAS 9 A&B, alumni) blok walinya bergeser ke O/P/Q.
  const punyaKolomEmail = header.O === 'EMAIL AKTIF';
  const kolWali = punyaKolomEmail
    ? { nama: 'P' as const, nik: 'Q' as const, hp: 'R' as const }
    : { nama: 'O' as const, nik: 'P' as const, hp: 'Q' as const };

  const hasil: SiapSantriSmp[] = [];
  const nomorBaris = [...sheet.keys()].filter((r) => r >= 6).sort((a, b) => a - b);

  for (const r of nomorBaris) {
    const row = sheet.get(r)!;
    const noMentah = row.A?.trim();
    const no = noMentah ? Number(noMentah) : NaN;
    if (!Number.isInteger(no) || no < 1) continue; // baris instruksi/contoh template, bukan galat

    try {
      const nama = row.B?.trim();
      if (!nama) throw new Error('NAMA LENGKAP kosong');

      const identitasKelas = row.C?.trim();
      if (!identitasKelas) throw new Error('IDENTITAS KELAS kosong');

      const nikMentah = row.D?.trim();
      if (!nikMentah) throw new Error('NIK kosong');
      const nik = angkaKeTeksUtuh(nikMentah);
      if (!/^\d{16}$/.test(nik)) throw new Error(`NIK "${row.D}" harus 16 digit (dapat setelah konversi: "${nik}")`);

      const nisnMentah = row.E?.trim();
      if (!nisnMentah) throw new Error('NISN kosong');
      const nisn = angkaKeTeksUtuh(nisnMentah);
      if (!/^\d{6,}$/.test(nisn)) throw new Error(`NISN "${row.E}" tidak valid (dapat setelah konversi: "${nisn}")`);

      const ttlMentah = row.F?.trim();
      if (!ttlMentah) throw new Error('TEMPAT, TANGGAL LAHIR kosong');
      const { tempat, tanggal } = parseTtl(ttlMentah);

      const jkMentah = row.G?.trim().toUpperCase();
      if (jkMentah !== 'L' && jkMentah !== 'P') throw new Error(`JENIS KELAMIN harus "L"/"P" (dapat: "${row.G}")`);

      const alamat = row.H?.trim() ?? '';

      hasil.push({
        sheet: namaSheet,
        baris: r,
        nama,
        identitasKelas,
        tmpLahir: tempat,
        tglLahir: tanggal,
        jk: jkMentah === 'P' ? JenisKelamin.P : JenisKelamin.L,
        nik,
        nisn,
        alamat,
        rt: bersihkanAngka(row.I),
        rw: bersihkanAngka(row.J),
        kelurahan: row.K?.trim() || null,
        kecamatan: row.L?.trim() || null,
        kabupaten: row.M?.trim() || null,
        hp: row.N?.trim() ? angkaKeTeksUtuh(row.N.trim()) : null,
        namaWali: row[kolWali.nama]?.trim() || null,
        nikWali: row[kolWali.nik]?.trim() ? angkaKeTeksUtuh(row[kolWali.nik].trim()) : null,
        hpWali: row[kolWali.hp]?.trim() ? angkaKeTeksUtuh(row[kolWali.hp].trim()) : null,
      });
    } catch (error) {
      galat.push({ sheet: namaSheet, baris: r, pesan: error instanceof Error ? error.message : String(error) });
    }
  }

  return hasil;
}

async function jalankan(): Promise<void> {
  const argumen = bacaArgumen(process.argv.slice(2));
  const path = argumen.file || 'docs/2. Form Pendataan SMP (1) (2).xlsx';

  const galat: Galat[] = [];
  const semua: SiapSantriSmp[] = [];
  for (const namaSheet of Object.keys(SHEET_KE_TINGKAT)) {
    semua.push(...siapkanSheet(path, namaSheet, galat));
  }

  const nisnTerlihat = new Set<string>();
  for (const s of semua) {
    if (nisnTerlihat.has(s.nisn)) {
      galat.push({ sheet: s.sheet, baris: s.baris, pesan: `NISN "${s.nisn}" duplikat dengan baris lain` });
    }
    nisnTerlihat.add(s.nisn);
  }

  // Baris cacat dilewati, bukan membatalkan seluruh berkas: form pendataan SMP
  // diisi manual oleh banyak orang, jadi selalu ada beberapa sel yang salah
  // (NIK 17 digit, NISN kosong). Membatalkan semuanya berarti 50+ siswa yang
  // datanya benar ikut tertahan oleh 2 baris yang salah. Baris yang dilewati
  // dicetak lengkap supaya operator bisa memperbaikinya di sumber lalu
  // menjalankan ulang — importir ini idempoten, jadi aman diulang.
  if (galat.length > 0) {
    console.error(`${galat.length} baris DILEWATI karena datanya tidak valid (perbaiki di berkas sumber lalu jalankan ulang):\n`);
    for (const g of galat) console.error(`  - [${g.sheet}:${g.baris}] ${g.pesan}`);
    console.error('');
  }

  if (semua.length === 0) {
    console.error('Tidak ada baris valid sama sekali. Tidak ada data yang ditulis ke DB.');
    process.exitCode = 1;
    return;
  }

  const unit = await prisma.unit.findUniqueOrThrow({ where: { key: KODE_UNIT } });
  const academicYear = await prisma.academicYear.findFirstOrThrow({ where: { isActive: true } });

  console.log(`Validasi lolos: ${semua.length} siswa SMP dari "${path}". Menulis ke database...`);

  // Huruf rombel hanya dipakai ketika tingkatnya memang terbagi lebih dari satu
  // rombel (mis. kelas 3A & 3B untuk tingkat 9). Tingkat dengan rombel tunggal
  // cukup bernama "Kelas <urutan>" — angka urutan lokal SMP (7→1, 8→2, 9→3),
  // bukan nomor tingkat sekolah. Sheet alumni (tingkat null) tidak ikut
  // dikelompokkan ke Kelas sama sekali.
  const identitasPerTingkat = new Map<string, Set<string>>();
  for (const s of semua) {
    const tingkat = SHEET_KE_TINGKAT[s.sheet];
    if (tingkat === null) continue;
    const set = identitasPerTingkat.get(tingkat) ?? new Set<string>();
    set.add(s.identitasKelas);
    identitasPerTingkat.set(tingkat, set);
  }

  const kelasCache = new Map<string, number>();

  for (const s of semua) {
    const tingkat = SHEET_KE_TINGKAT[s.sheet];

    let kelasId: number | null = null;
    let tahunMasuk: string | null = null;
    let status: StatusSantri = StatusSantri.TidakAktif;

    if (tingkat !== null) {
      const urutanLokal = Number(tingkat) - 6;
      const rombelTunggal = (identitasPerTingkat.get(tingkat)?.size ?? 1) <= 1;
      const namaKelas = rombelTunggal ? `Kelas ${urutanLokal}` : `Kelas ${urutanLokal}${s.identitasKelas}`;
      let idKelas = kelasCache.get(namaKelas);
      if (idKelas === undefined) {
        const kelas = await prisma.kelas.upsert({
          where: { unitId_nama_academicYearId: { unitId: unit.id, nama: namaKelas, academicYearId: academicYear.id } },
          create: { unitId: unit.id, nama: namaKelas, tingkat, academicYearId: academicYear.id },
          update: {},
        });
        idKelas = kelas.id;
        kelasCache.set(namaKelas, idKelas);
      }
      kelasId = idKelas;
      tahunMasuk = String(TAHUN_AJARAN_AKTIF_UNTUK_MASUK - (Number(tingkat) - 7));
    }

    const orang = await prisma.person.upsert({
      where: { email: `santri.${s.nisn}@nuha.local` },
      create: {
        fullName: s.nama, gender: s.jk, birthDate: s.tglLahir, birthPlace: s.tmpLahir, nik: s.nik, addressLine: s.alamat,
        neighborhoodRt: s.rt, neighborhoodRw: s.rw, villageName: s.kelurahan, districtName: s.kecamatan, regencyName: s.kabupaten, phone: s.hp,
        email: `santri.${s.nisn}@nuha.local`,
      },
      update: {
        fullName: s.nama, gender: s.jk, birthDate: s.tglLahir, birthPlace: s.tmpLahir, nik: s.nik, addressLine: s.alamat,
        neighborhoodRt: s.rt, neighborhoodRw: s.rw, villageName: s.kelurahan, districtName: s.kecamatan, regencyName: s.kabupaten, phone: s.hp,
      },
    });

    // NIS = NISN (konfirmasi client — berkas tidak punya NIS internal terpisah).
    const nis = s.nisn;

    const santri = await prisma.santri.upsert({
      where: { nisn: s.nisn },
      create: { personId: orang.id, nis, nisn: s.nisn, unitId: unit.id, kelasId, status, tahunMasuk },
      update: { personId: orang.id, nis, unitId: unit.id, kelasId, status, tahunMasuk },
    });
    void santri;

    await tulisGuardianRelation(orang.id, s.nisn, 'Wali', { nama: s.namaWali ?? '', nik: s.nikWali, hp: s.hpWali });
  }

  await recordAudit({
    aksi: 'import',
    entitas: 'Santri',
    entitasId: 'batch',
    ringkasan: `Impor XLSX siswa SMP: ${semua.length} baris dari 4 sheet (KELAS 7/8/9 A&B + alumni) (${path}).`,
    aktor: AKTOR_SKRIP,
  });

  console.log(`Selesai. ${semua.length} Santri SMP di-upsert.`);
}

jalankan()
  .catch((error) => {
    console.error('Galat tak terduga saat impor siswa SMP:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
