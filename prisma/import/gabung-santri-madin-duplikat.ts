/**
 * Gabungkan `Orang` duplikat yang lahir dari `import-santri-madin-riwayat.ts`.
 *
 * Dua guru MA yang juga mengaji di Madin sudah ada di DB dengan nama bergelar
 * ("Muhammmad Bismar As Sidiq, S.H", "Wardatul Haizatil Husna, S.Sos., Gr"),
 * tetapi roster Madin menulis nama tanpa gelar. Karena skrip riwayat mencocokkan
 * **nama persis** dan barisnya tidak diberi `orangIdExisting`, pencocokan gagal
 * dan skrip membuat `Orang` + `Santri` baru — sehingga keduanya tampak masuk
 * Madin Kelas 6 dua kali. Ini pola yang sama dengan duplikat Alfan Jamil.
 *
 * Keputusan operator (2026-08-29): keduanya **memang** santri Madin Kelas 6,
 * yang salah hanya duplikatnya. Jadi baris asli (yang punya baris Pegawai)
 * dipertahankan; `riwayat_pendidikan` milik duplikat dipindah ke sana, lalu
 * `Orang` duplikat dihapus (Santri-nya ikut lewat cascade).
 *
 * Aman: duplikat hanya punya baris riwayat — tidak ada nilai, invoices,
 * presensi, hafalan, atau user yang menempel (sudah dicek sebelum ditulis, dan
 * dicek ulang oleh skrip ini sebelum menghapus).
 *
 * Idempoten: aman dijalankan ulang.
 *
 *   npx tsx prisma/import/gabung-santri-madin-duplikat.ts
 */
import { PrismaClient } from '@prisma/client';
import { recordAudit } from '@/lib/audit';

const AKTOR_SKRIP = { nama: 'Gabung duplikat santri Madin (skrip)' };

/** Pasangan (nama duplikat → nama yang dipertahankan). */
const PASANGAN = [
  { namaHapus: 'M. Bismar As Sidiq', namaSimpan: 'Muhammmad Bismar As Sidiq, S.H' },
  { namaHapus: 'Wardatul Haizatil Husna', namaSimpan: 'Wardatul Haizatil Husna, S.Sos., Gr' },
];

const prisma = new PrismaClient();

async function main() {
  for (const { namaHapus, namaSimpan } of PASANGAN) {
    const simpan = await prisma.person.findFirst({ where: { fullName: namaSimpan, deletedAt: null } });
    if (!simpan) throw new Error(`Orang "${namaSimpan}" tidak ditemukan — batal`);

    const hapus = await prisma.person.findFirst({ where: { fullName: namaHapus, deletedAt: null } });
    if (!hapus) {
      console.log(`"${namaHapus}" sudah tidak ada — penggabungan tampaknya sudah dijalankan.`);
      continue;
    }
    if (hapus.id === simpan.id) continue;

    // Duplikat tidak boleh membawa data akademik/keuangan. Kalau ada, berhenti:
    // penggabungannya butuh keputusan manusia, bukan cascade delete.
    const santriHapus = await prisma.santri.findUnique({ where: { personId: hapus.id } });
    if (santriHapus) {
      const tanggungan = await Promise.all([
        prisma.nilai.count({ where: { santriId: santriHapus.id } }),
        prisma.nilaiUjian.count({ where: { santriId: santriHapus.id } }),
        prisma.attendance.count({ where: { studentId: santriHapus.id } }),
        prisma.invoice.count({ where: { santriId: santriHapus.id } }),
        prisma.memorization.count({ where: { studentId: santriHapus.id } }),
      ]);
      const total = tanggungan.reduce((a, b) => a + b, 0);
      if (total > 0) {
        throw new Error(
          `Santri duplikat "${namaHapus}" (#${santriHapus.id}) punya ${total} baris data terkait — batal, tangani manual`,
        );
      }
    }
    const jumlahUser = await prisma.user.count({ where: { personId: hapus.id } });
    if (jumlahUser > 0) throw new Error(`"${namaHapus}" punya akun user — batal, tangani manual`);

    // Riwayat pendidikan duplikat dipindah; bentrok (orang+unit+TA sudah ada
    // di baris yang bertahan) cukup dibuang karena isinya sama.
    const riwayat = await prisma.riwayatPendidikan.findMany({ where: { personId: hapus.id } });
    let dipindah = 0;
    for (const r of riwayat) {
      const bentrok = await prisma.riwayatPendidikan.findUnique({
        where: {
          personId_unitId_academicYearId: {
            personId: simpan.id,
            unitId: r.unitId,
            academicYearId: r.academicYearId,
          },
        },
      });
      if (bentrok) continue;
      await prisma.riwayatPendidikan.update({ where: { id: r.id }, data: { personId: simpan.id } });
      dipindah += 1;
    }

    await prisma.person.delete({ where: { id: hapus.id } });
    await recordAudit({
      aksi: 'delete',
      entitas: 'Orang',
      entitasId: String(hapus.id),
      ringkasan: `Gabungkan duplikat "${namaHapus}" (#${hapus.id}) ke "${namaSimpan}" (#${simpan.id})`,
      perubahan: { dari: { personId: hapus.id, riwayatDipindah: dipindah } },
      aktor: AKTOR_SKRIP,
    });
    console.log(
      `Digabung: "${namaHapus}" #${hapus.id} → "${namaSimpan}" #${simpan.id} (${dipindah} riwayat dipindah)`,
    );
  }

  for (const { namaSimpan } of PASANGAN) {
    const orang = await prisma.person.findFirst({
      where: { fullName: namaSimpan, deletedAt: null },
      include: {
        santri: { include: { kelas: true, unit: true } },
        riwayatPendidikan: { include: { academicYear: true } },
      },
    });
    console.log(
      `${orang?.fullName}: santri ${orang?.santri?.unit?.nama ?? '-'} ${orang?.santri?.kelas?.nama ?? '-'} ` +
        `(NIS ${orang?.santri?.nis ?? '-'}), riwayat: ` +
        orang?.riwayatPendidikan
          .map((r) => `${r.academicYear.code} ${r.kelasNama}`)
          .sort()
          .join(', '),
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
