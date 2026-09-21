/**
 * Naikkan 11 santri MA angkatan 2025 dari **Kelas 1 (tingkat 10, TA 2025/2026)**
 * ke **Kelas 2 (tingkat 11, TA 2026/2027)** — "kelas XI" dalam istilah operator.
 *
 * Mereka diimpor oleh `import-siswa-ma-2025.ts` dan sejak itu masih menunjuk
 * kelas TA 2025/2026 walau tahun ajaran aktif sudah 2026/2027, sehingga rombel
 * Kelas 2 TA 2026/2027 kosong. Skrip ini:
 *
 *   1. Menambal NIS resmi No. 7 (Muhammad Fajar Putra Sulhari). Baris ini dulu
 *      memakai NIS sintetis `2025MA007` karena sumber belum menerbitkan NIS;
 *      operator menyusulkannya pada 2026-08-29. `import-siswa-ma-2025.ts` sudah
 *      dikoreksi, tapi baris DB yang telanjur ada perlu dipindah di sini.
 *   2. Mencatat `RiwayatPendidikan` MA Kelas 1 TA 2025/2026 (status `Mukim` —
 *      naik kelas, bukan lulus) supaya jejak jenjangnya tidak hilang.
 *   3. Memindahkan `Santri.kelasId` ke Kelas 2 TA 2026/2027.
 *
 * `Santri` sengaja TIDAK diduplikasi: satu `Orang` hanya boleh punya satu baris
 * `Santri` aktif, jadi kenaikan kelas = pindah `kelasId`, dan riwayat jenjang
 * ditulis terpisah — pola yang sama dipakai `import-alumni-smp-2025-2026.ts`.
 *
 * Idempoten: pencocokan lewat NIK (identitas terkuat), upsert riwayat lewat
 * kunci unik `personId_unitId_academicYearId`, dan pindah kelas yang menulis nilai
 * akhir yang sama berapa kali pun dijalankan.
 *
 * Jalankan: `npm run promosi:ma-2026`
 */
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { StatusRiwayatPendidikan, StatusSantri } from '@prisma/client';

const AKTOR_SKRIP = { nama: 'Promosi kelas MA 2026/2027 (skrip)' };
const KODE_UNIT = 'MA';

/** Kelas asal — dicatat sebagai riwayat pendidikan. */
const TA_ASAL = { kode: '2025/2026', semester: 'Gasal' };
const KELAS_ASAL = { nama: 'Kelas 1', tingkat: '10' };

/** Kelas tujuan — rombel aktif yang baru. */
const TA_TUJUAN = { kode: '2026/2027', semester: 'Gasal' };
const KELAS_TUJUAN = { nama: 'Kelas 2', tingkat: '11' };

/**
 * NIS sintetis lama → NIS resmi dari operator. Dipakai sekali untuk menambal
 * baris DB yang dibuat sebelum operator menerbitkan NIS-nya.
 */
const KOREKSI_NIS: Record<string, string> = {
  '3579021105100002': '131235730007250129', // Muhammad Fajar Putra Sulhari
};

/** NIK ke-11 santri, urut sesuai tabel operator. */
const NIK_SANTRI = [
  '3507131208090002', // 1  Ahmad Shafly Al Kautsar
  '3528055608100001', // 2  Dinda Aulia Ramadani
  '3505105405100001', // 3  Dzihni Laila Maftuha
  '3507185502100001', // 4  Meutya Saila Imania Az Zahra
  '3573042502100002', // 5  Muhammad Abdulloh Azamy
  '3573040807090006', // 6  Muhammad Choirul Anam
  '3579021105100002', // 7  Muhammad Fajar Putra Sulhari
  '7503060110090001', // 8  Muhammad Faris Aufa Syahmi
  '3507182904100001', // 9  Muhammad Izzy Fadhlu Robby
  '3518135207090001', // 10 Tazkiya Nur Madina
  '3573032909090003', // 11 Muhammad Hamdan Zaini
];

async function jalankan(): Promise<void> {
  const unit = await prisma.unit.findUniqueOrThrow({ where: { key: KODE_UNIT } });

  const taAsal = await prisma.academicYear.upsert({
    where: { code_semester: { code: TA_ASAL.kode, semester: TA_ASAL.semester } },
    create: { code: TA_ASAL.kode, semester: TA_ASAL.semester },
    update: {},
  });
  const taTujuan = await prisma.academicYear.findFirstOrThrow({
    where: { code: TA_TUJUAN.kode, semester: TA_TUJUAN.semester },
  });
  const kelasTujuan = await prisma.kelas.findUniqueOrThrow({
    where: { unitId_nama_academicYearId: { unitId: unit.id, nama: KELAS_TUJUAN.nama, academicYearId: taTujuan.id } },
  });

  console.log(
    `Menaikkan ${NIK_SANTRI.length} santri MA ke ${KELAS_TUJUAN.nama} `
      + `(tingkat ${KELAS_TUJUAN.tingkat}, TA ${TA_TUJUAN.kode} ${TA_TUJUAN.semester})...`,
  );

  let jumlahNisDikoreksi = 0;
  let jumlahDipindah = 0;

  for (const nik of NIK_SANTRI) {
    const orang = await prisma.person.findUniqueOrThrow({
      where: { nik },
      select: { id: true, fullName: true, santri: { select: { id: true, nis: true, kelasId: true } } },
    });
    const santri = orang.santri;
    if (!santri) {
      throw new Error(`Orang "${orang.fullName}" (NIK ${nik}) belum punya baris Santri — jalankan import:siswa-ma-2025 dulu.`);
    }

    const nisResmi = KOREKSI_NIS[nik];
    if (nisResmi && santri.nis !== nisResmi) {
      await prisma.santri.update({ where: { id: santri.id }, data: { nis: nisResmi } });
      jumlahNisDikoreksi += 1;
      console.log(`  NIS ${orang.fullName}: ${santri.nis ?? '(kosong)'} → ${nisResmi}`);
    }

    // Riwayat kelas asal: naik kelas, jadi statusnya tetap Mukim (bukan Alumni).
    await prisma.riwayatPendidikan.upsert({
      where: { personId_unitId_academicYearId: { personId: orang.id, unitId: unit.id, academicYearId: taAsal.id } },
      create: {
        personId: orang.id, unitId: unit.id, kelasNama: KELAS_ASAL.nama, tingkat: KELAS_ASAL.tingkat,
        academicYearId: taAsal.id, status: StatusSantri.Aktif,
      },
      update: { kelasNama: KELAS_ASAL.nama, tingkat: KELAS_ASAL.tingkat, status: StatusSantri.Aktif },
    });

    if (santri.kelasId !== kelasTujuan.id) {
      await prisma.santri.update({ where: { id: santri.id }, data: { kelasId: kelasTujuan.id } });
      jumlahDipindah += 1;
    }
  }

  await recordAudit({
    aksi: 'update',
    entitas: 'Santri',
    entitasId: 'batch',
    ringkasan:
      `Promosi ${NIK_SANTRI.length} santri MA ke ${KELAS_TUJUAN.nama} TA ${TA_TUJUAN.kode} ${TA_TUJUAN.semester}: `
      + `${jumlahDipindah} pindah kelas, ${jumlahNisDikoreksi} NIS dikoreksi.`,
    aktor: AKTOR_SKRIP,
  });

  console.log(
    `Selesai. ${jumlahDipindah} santri dipindah kelas, ${jumlahNisDikoreksi} NIS dikoreksi, `
      + `${NIK_SANTRI.length} riwayat pendidikan di-upsert.`,
  );
}

jalankan()
  .catch((error) => {
    console.error('Galat tak terduga saat promosi kelas MA:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
