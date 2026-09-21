/**
 * Pindahkan santri yang masih menempati `Kelas` milik **tahun ajaran lama** ke
 * `Kelas` bernama sama pada **tahun ajaran aktif**.
 *
 * Masalahnya: `import-santri-madin-riwayat.ts` menyetel `santri.kelasId` ke
 * kelas TA 2025/2026 (TA berkas presensinya), sedangkan TA aktif adalah
 * 2026/2027. Akibatnya tiap tingkat Madin tampil **dua baris** di pohon
 * lembaga /induk — mis. "Kelas 6" muncul dua kali (5 santri di kelas TA lama,
 * 2 di TA aktif) padahal rombelnya satu.
 *
 * Skrip ini memindahkan **penempatan saat ini** saja: `santri.kelasId` (unit
 * utama) dan baris `santri_kelas` (penempatan jamak, mis. SMP + Madin).
 * Sejarah tetap utuh di `riwayat_pendidikan` — tabel itu tidak disentuh.
 *
 * Catatan: pemindahan ini **bukan kenaikan tingkat**. Santri pindah ke kelas
 * dengan nama yang sama persis (Kelas 3 TA lama → Kelas 3 TA aktif). Bila
 * operator memang ingin menaikkan tingkat, itu proses terpisah (promosi).
 *
 * Baris `Kelas` lama sengaja **tidak dihapus** — masih jadi jangkar rombel
 * pada tahun ajarannya sendiri.
 *
 * Idempoten: aman dijalankan ulang.
 *
 *   npm run pindah:santri-ta-aktif
 */
import { PrismaClient } from '@prisma/client';
import { recordAudit } from '@/lib/audit';

const AKTOR_SKRIP = { nama: 'Pindah santri ke kelas TA aktif (skrip)' };

const prisma = new PrismaClient();

async function main() {
  const taAktif = await prisma.academicYear.findFirst({ where: { isActive: true } });
  if (!taAktif) throw new Error('Tidak ada tahun ajaran aktif — batal');
  console.log(`Tahun ajaran aktif: ${taAktif.code} ${taAktif.semester}`);

  // Kelas TA aktif, dikunci per (unit, nama) untuk mencari tujuan pindah.
  const kelasAktif = await prisma.kelas.findMany({ where: { academicYearId: taAktif.id } });
  const tujuan = new Map(kelasAktif.map((k) => [`${k.unitId}@${k.nama}`, k]));

  const kelasLama = await prisma.kelas.findMany({
    where: { academicYearId: { not: taAktif.id } },
    include: { unit: true, academicYear: true },
  });

  // Validasi seluruh pemetaan dulu, baru menulis (hindari partial write).
  const rencana: { dari: (typeof kelasLama)[number]; ke: (typeof kelasAktif)[number]; jumlah: number }[] = [];
  for (const k of kelasLama) {
    const [utama, jamak] = await Promise.all([
      prisma.santri.count({ where: { kelasId: k.id } }),
      prisma.santriKelas.count({ where: { kelasId: k.id } }),
    ]);
    const jumlah = Math.max(utama, jamak);
    if (jumlah === 0) continue;
    const ke = tujuan.get(`${k.unitId}@${k.nama}`);
    if (!ke) {
      throw new Error(
        `Kelas "${k.nama}" (${k.unit.nama}, TA ${k.academicYear?.code ?? "-"}) berisi ${jumlah} santri ` +
          'tetapi tidak punya kelas bernama sama di TA aktif — batal, buat kelasnya dulu',
      );
    }
    rencana.push({ dari: k, ke, jumlah });
  }

  if (rencana.length === 0) {
    console.log('Tidak ada santri di kelas TA lama — tidak ada yang dipindah.');
    return;
  }

  let total = 0;
  for (const { dari, ke, jumlah } of rencana) {
    const { count } = await prisma.santri.updateMany({
      where: { kelasId: dari.id },
      data: { kelasId: ke.id },
    });

    // Penempatan jamak: pindahkan barisnya ke kelas tujuan. `@@id([santriId,
    // kelasId])` bisa bentrok bila santri sudah punya baris di kelas tujuan —
    // dalam hal itu baris lamanya cukup dihapus.
    const jamak = await prisma.santriKelas.findMany({ where: { kelasId: dari.id } });
    for (const sk of jamak) {
      const sudahAda = await prisma.santriKelas.findUnique({
        where: { santriId_kelasId: { santriId: sk.santriId, kelasId: ke.id } },
      });
      if (sudahAda) {
        await prisma.santriKelas.delete({
          where: { santriId_kelasId: { santriId: sk.santriId, kelasId: dari.id } },
        });
        continue;
      }
      await prisma.santriKelas.create({
        data: { santriId: sk.santriId, kelasId: ke.id, unitId: ke.unitId, utama: sk.utama },
      });
      await prisma.santriKelas.delete({
        where: { santriId_kelasId: { santriId: sk.santriId, kelasId: dari.id } },
      });
    }
    total += Math.max(count, jamak.length);
    await recordAudit({
      aksi: 'update',
      entitas: 'Santri',
      entitasId: `kelas:${dari.id}->${ke.id}`,
      ringkasan:
        `Pindahkan ${count} santri ${dari.unit.nama} "${dari.nama}" dari TA ` +
        `${dari.academicYear?.code ?? "-"} ke TA aktif`,
      perubahan: { dari: { kelasId: dari.id }, ke: { kelasId: ke.id } },
      aktor: AKTOR_SKRIP,
    });
    console.log(
      `${dari.unit.nama} "${dari.nama}": ${jumlah} santri, kelas #${dari.id} (TA ${dari.academicYear?.code ?? "-"}) → #${ke.id}`,
    );
  }
  console.log(`Total dipindah: ${total} santri.`);

  // Ringkasan akhir: tiap (unit, nama kelas) harus tinggal satu baris berisi santri.
  const sisa = await prisma.kelas.findMany({
    where: { academicYearId: { not: taAktif.id } },
    include: { unit: true, _count: { select: { santri: true, santriKelas: true } } },
  });
  const bermasalah = sisa.filter((k) => k._count.santri > 0 || k._count.santriKelas > 0);
  console.log(
    bermasalah.length === 0
      ? 'Tidak ada lagi santri yang menempati kelas TA lama.'
      : `MASIH ADA santri di kelas TA lama: ${bermasalah.map((k) => `${k.unit.nama} ${k.nama}`).join(', ')}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
