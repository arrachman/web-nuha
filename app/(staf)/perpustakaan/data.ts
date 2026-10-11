import { prisma } from '@/lib/prisma';

/** Unit yang punya perpustakaan: SMP, MA, Pondok Pesantren (urut: SMP, MA, Pondok). */
export async function unitPerpustakaan() {
  const units = await prisma.unit.findMany({
    where: { aktif: true, jenjang: { in: ['SMP', 'MA', 'Pesantren'] } },
    select: { id: true, key: true, nama: true, jenjang: true },
  });
  const bobot: Record<string, number> = { SMP: 0, MA: 1, Pesantren: 2 };
  return units.sort((a, b) => (bobot[a.jenjang ?? ''] ?? 9) - (bobot[b.jenjang ?? ''] ?? 9));
}

export const KATEGORI_BUKU = [
  'Agama',
  'Al-Qur\u2019an & Tafsir',
  'Hadis',
  'Fikih',
  'Akhlak',
  'Bahasa Arab',
  'Bahasa Indonesia',
  'Bahasa Inggris',
  'Matematika',
  'IPA',
  'IPS',
  'Sastra & Novel',
  'Sejarah',
  'Keterampilan',
  'Referensi',
  'Lainnya',
] as const;

export const TIPE_PEMINJAM = [
  { key: 'santri', label: 'Santri' },
  { key: 'pegawai', label: 'Pegawai / Guru' },
  { key: 'umum', label: 'Umum' },
] as const;

export const STATUS_PINJAM = ['Dipinjam', 'Dikembalikan'] as const;

/** Sisa eksemplar yang bisa dipinjam = jumlah - yang sedang dipinjam. */
export async function sisaEksemplar(bookId: bigint): Promise<number> {
  const [buku, dipinjam] = await Promise.all([
    prisma.book.findUnique({ where: { id: bookId }, select: { jumlah: true } }),
    prisma.bookLoan.count({ where: { bookId, status: 'Dipinjam' } }),
  ]);
  if (!buku) return 0;
  return Math.max(0, buku.jumlah - dipinjam);
}

export function labelTerlambat(tglJatuhTempo: Date): string {
  const hari = Math.floor((Date.now() - new Date(tglJatuhTempo).getTime()) / 86400000);
  return hari > 0 ? `Terlambat ${hari} hari` : 'Dipinjam';
}
