/**
 * Backfill `relasi_wali.utama` untuk data yang terlanjur masuk tanpa kontak
 * utama sama sekali.
 *
 * Penyebabnya: `import/lib/tulis-wali.ts` dulu menyetel `utama = peran !== 'Wali'`
 * tanpa syarat, sedangkan form pendataan SMP cuma punya satu kolom
 * "NAMA IBU/AYAH/WALI" sehingga SEMUA relasi tercatat `peran='Wali'`,
 * `utama=false`. Akibatnya tab "Wali & Keluarga" di /induk dan pemicu
 * notifikasi tidak menemukan kontak siapa pun.
 *
 * Aturan yang dipulihkan (sama dengan `apakahUtama` di tulis-wali.ts):
 *   - Ayah & Ibu selalu `utama = true`.
 *   - Wali pihak ketiga `utama = true` HANYA bila anak itu tidak punya
 *     relasi Ayah/Ibu.
 *
 * Idempoten: aman dijalankan berulang, hanya menyentuh baris yang nilainya
 * memang berbeda. Tidak pernah menghapus relasi.
 *
 * Jalankan: `npx tsx prisma/import/perbaiki-wali-utama.ts`
 */
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';

const AKTOR_SKRIP = { nama: 'Perbaikan wali utama (skrip)' };

async function jalankan(): Promise<void> {
  const semua = await prisma.guardianRelation.findMany({
    select: { id: true, anakId: true, peran: true, utama: true },
    orderBy: { id: 'asc' },
  });

  const punyaOrtu = new Set<string>();
  for (const r of semua) {
    if (r.peran === 'Ayah' || r.peran === 'Ibu') punyaOrtu.add(r.anakId.toString());
  }

  const perluUbah = semua.filter((r) => {
    const seharusnya = r.peran === 'Ayah' || r.peran === 'Ibu' || !punyaOrtu.has(r.anakId.toString());
    return seharusnya !== r.utama;
  });

  for (const r of perluUbah) {
    const seharusnya = r.peran === 'Ayah' || r.peran === 'Ibu' || !punyaOrtu.has(r.anakId.toString());
    await prisma.guardianRelation.update({ where: { id: r.id }, data: { utama: seharusnya } });
  }

  if (perluUbah.length > 0) {
    await recordAudit({
      aksi: 'perbaikan',
      entitas: 'RelasiWali',
      entitasId: 'batch',
      ringkasan: `Backfill kontak wali utama: ${perluUbah.length} dari ${semua.length} relasi disetel ulang (Ayah/Ibu utama; Wali utama bila tanpa ortu).`,
      aktor: AKTOR_SKRIP,
    });
  }

  console.log(`Selesai. ${perluUbah.length} dari ${semua.length} relasi diperbarui.`);
}

jalankan()
  .catch((error) => {
    console.error('Galat saat backfill wali utama:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
