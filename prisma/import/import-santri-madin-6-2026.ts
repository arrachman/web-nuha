/**
 * Daftarkan **7 santri Madin Kelas 6 (tingkat 6) TA 2026/2027** sesuai daftar
 * nama yang diserahkan operator 2026-08-29 ("madin tingkat VI").
 *
 * Konteks & keputusan operator:
 *
 *   1. **"Tingkat VI" = `Kelas 6`** pada unit `Pondok` (nama tampilan "Madin",
 *      jenjang Pesantren). Madin memakai penomoran Kelas 1–6, bukan angka
 *      Romawi ala MA — konfirmasi operator setelah daftar awal tertulis "XI".
 *
 *   2. **Tiga dari tujuh nama sudah ada di DB sebagai pegawai MA aktif**
 *      (M. Bismar As Sidiq → Guru Mapel, Wardatul Haizatil Husna → Guru Mapel,
 *      Wildana Izza Afkarina → Bendahara/TU). Operator menegaskan itu **orang
 *      yang sama**: guru/TU MA yang juga mengaji di Madin. Karena satu `Orang`
 *      boleh punya baris `Pegawai` dan `Santri` sekaligus, skrip ini menambah
 *      baris `Santri` ke `Orang` yang sudah ada — **tidak** membuat orang baru,
 *      supaya tidak ada duplikat identitas. Baris `Pegawai` tidak disentuh.
 *
 *   3. Empat sisanya belum ada di DB dan dibuat sebagai `Orang` baru.
 *
 *   4. **NIS memakai pola generator** `buatNis()` → `2026PONDOK001..007`
 *      (`<tahunMasuk><kodeUnit><urut>`), atas permintaan operator. Santri Madin
 *      lama (Isma Izha Utama) ber-NIS `null` dan tidak ikut dinomori ulang di
 *      sini — dia bukan bagian dari daftar ini.
 *
 * Data yang tersedia hanya **nama + jenis kelamin** (dikonfirmasi operator);
 * NIK/NISN/TTL/alamat/wali belum diserahkan, jadi kolom itu dibiarkan kosong
 * untuk orang baru dan biodata pegawai yang sudah ada tidak ditimpa.
 *
 * Pencocokan idempoten: nama persis untuk orang baru, dan `personId` tetap
 * untuk tiga pegawai. Dijalankan berapa kali pun hasil akhirnya sama.
 *
 * Jalankan: `npm run import:santri-madin-6-2026`
 */
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { JenisKelamin, StatusSantri } from '@prisma/client';
import { buatNis } from './lib/nis';

const AKTOR_SKRIP = { nama: 'Import santri Madin Kelas 6 2026/2027 (skrip)' };

const KODE_UNIT = 'PONDOK';
const UNIT_KEY = 'Pondok';
const TAHUN_MASUK = '2026';
const KELAS_MADIN_6 = { nama: 'Kelas 6', tingkat: '6' };

type BarisSantri = {
  no: number;
  nama: string;
  jk: JenisKelamin;
  /**
   * Diisi bila orangnya sudah ada di DB (pegawai MA aktif) — pencocokan lewat
   * id agar tidak tergantung ejaan nama yang berbeda (bergelar).
   */
  orangIdExisting?: number;
};

/**
 * Daftar tertutup 7 santri, urut sesuai daftar operator. Urutan menentukan
 * nomor urut NIS, jadi jangan diacak.
 */
const DAFTAR: BarisSantri[] = [
  { no: 1, nama: 'Agus Rosifat Aqli', jk: JenisKelamin.L },
  { no: 2, nama: 'Ahmad Dzakkir Waspodo', jk: JenisKelamin.L },
  { no: 3, nama: 'Fahruz Zakiyyah Almah', jk: JenisKelamin.P },
  // Sudah ada sebagai "Muhammmad Bismar As Sidiq, S.H" — Guru Mapel MA.
  { no: 4, nama: 'M. Bismar As Sidiq', jk: JenisKelamin.L, orangIdExisting: 414 },
  { no: 5, nama: 'M. Misbahussurur', jk: JenisKelamin.L },
  // Sudah ada sebagai "Wardatul Haizatil Husna, S.Sos., Gr" — Guru Mapel MA.
  { no: 6, nama: 'Wardatul Haizatil Husna', jk: JenisKelamin.P, orangIdExisting: 419 },
  // Sudah ada sebagai "Wildana Izza Afkarina" — Bendahara/TU MA.
  { no: 7, nama: 'Wildana Izza Afkarina', jk: JenisKelamin.P, orangIdExisting: 423 },
];

async function main() {
  // --- Validasi seluruh baris dulu, baru tulis (no partial write). ---
  const namaTerpakai = new Set<string>();
  for (const s of DAFTAR) {
    if (!s.nama.trim()) throw new Error(`Baris ${s.no}: nama kosong`);
    if (namaTerpakai.has(s.nama)) throw new Error(`Baris ${s.no}: nama duplikat "${s.nama}"`);
    namaTerpakai.add(s.nama);
  }

  const unit = await prisma.unit.findUniqueOrThrow({ where: { key: UNIT_KEY } });
  const academicYear = await prisma.academicYear.findFirstOrThrow({ where: { isActive: true } });

  // Pastikan tiga orang yang diklaim sudah ada memang ada, sebelum menulis apa pun.
  for (const s of DAFTAR.filter((x) => x.orangIdExisting)) {
    const ada = await prisma.person.findUnique({ where: { id: s.orangIdExisting! } });
    if (!ada) {
      throw new Error(`Baris ${s.no}: Orang #${s.orangIdExisting} ("${s.nama}") tidak ditemukan`);
    }
  }

  const kelas = await prisma.kelas.upsert({
    where: {
      unitId_nama_academicYearId: {
        unitId: unit.id,
        nama: KELAS_MADIN_6.nama,
        academicYearId: academicYear.id,
      },
    },
    update: {},
    create: {
      unitId: unit.id,
      nama: KELAS_MADIN_6.nama,
      tingkat: KELAS_MADIN_6.tingkat,
      academicYearId: academicYear.id,
    },
  });

  const hasil: string[] = [];

  for (const s of DAFTAR) {
    const nis = buatNis(TAHUN_MASUK, KODE_UNIT, s.no);

    // 1. Orang: pakai yang sudah ada bila ditandai, else cocokkan nama, else buat.
    let orang = s.orangIdExisting
      ? await prisma.person.findUniqueOrThrow({ where: { id: s.orangIdExisting } })
      : await prisma.person.findFirst({ where: { fullName: s.nama, deletedAt: null } });

    if (!orang) {
      orang = await prisma.person.create({ data: { fullName: s.nama, gender: s.jk } });
      await recordAudit({
        aksi: 'create',
        entitas: 'Orang',
        entitasId: String(orang.id),
        ringkasan: `Tambah orang baru "${s.nama}" untuk santri Madin Kelas 6`,
        perubahan: { ke: { fullName: s.nama, gender: s.jk } },
        aktor: AKTOR_SKRIP,
      });
    }

    // 2. Santri: satu Orang = paling banyak satu Santri (personId unique).
    const santriLama = await prisma.santri.findUnique({ where: { personId: orang.id } });
    const dataSantri = {
      nis,
      unitId: unit.id,
      kelasId: kelas.id,
      status: StatusSantri.Aktif,
      tahunMasuk: TAHUN_MASUK,
    };

    if (santriLama) {
      await prisma.santri.update({ where: { personId: orang.id }, data: dataSantri });
      hasil.push(`  ${nis}  ${orang.fullName}  (perbarui penempatan)`);
      await recordAudit({
        aksi: 'update',
        entitas: 'Santri',
        entitasId: String(santriLama.id),
        ringkasan: `Tempatkan "${orang.fullName}" di Madin ${KELAS_MADIN_6.nama} ${academicYear.code}`,
        perubahan: {
          dari: {
            nis: santriLama.nis,
            unitId: santriLama.unitId,
            kelasId: santriLama.kelasId,
            status: santriLama.status,
          },
          ke: dataSantri,
        },
        aktor: AKTOR_SKRIP,
      });
    } else {
      const dibuat = await prisma.santri.create({ data: { personId: orang.id, ...dataSantri } });
      hasil.push(`  ${nis}  ${orang.fullName}  (santri baru)`);
      await recordAudit({
        aksi: 'create',
        entitas: 'Santri',
        entitasId: String(dibuat.id),
        ringkasan: `Daftarkan "${orang.fullName}" sebagai santri Madin ${KELAS_MADIN_6.nama} ${academicYear.code}`,
        perubahan: { ke: dataSantri },
        aktor: AKTOR_SKRIP,
      });
    }

    // 3. Jejak jenjang per tahun ajaran.
    await prisma.riwayatPendidikan.upsert({
      where: {
        personId_unitId_academicYearId: {
          personId: orang.id,
          unitId: unit.id,
          academicYearId: academicYear.id,
        },
      },
      update: {
        kelasNama: KELAS_MADIN_6.nama,
        tingkat: KELAS_MADIN_6.tingkat,
        status: StatusSantri.Aktif,
      },
      create: {
        personId: orang.id,
        unitId: unit.id,
        kelasNama: KELAS_MADIN_6.nama,
        tingkat: KELAS_MADIN_6.tingkat,
        academicYearId: academicYear.id,
        status: StatusSantri.Aktif,
      },
    });
  }

  console.log(`Madin ${KELAS_MADIN_6.nama} — TA ${academicYear.code} ${academicYear.semester}`);
  console.log(hasil.join('\n'));

  // Assertion akhir: 7 santri daftar ini harus duduk di kelas tersebut.
  const nisDaftar = DAFTAR.map((s) => buatNis(TAHUN_MASUK, KODE_UNIT, s.no));
  const terdaftar = await prisma.santri.count({
    where: { kelasId: kelas.id, nis: { in: nisDaftar } },
  });
  if (terdaftar !== DAFTAR.length) {
    throw new Error(`Verifikasi gagal: ${terdaftar} dari ${DAFTAR.length} santri terdaftar`);
  }
  const totalKelas = await prisma.santri.count({ where: { kelasId: kelas.id } });
  console.log(`\nOK — ${terdaftar} santri daftar ini terdaftar; total isi kelas: ${totalKelas}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
