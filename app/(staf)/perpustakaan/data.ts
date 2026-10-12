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

export const KONDISI_EKSEMPLAR = ['Baik', 'Rusak', 'Diperbaiki', 'Hilang'] as const;
export const STATUS_EKSEMPLAR = ['Tersedia', 'Dipinjam', 'Hilang'] as const;

/** Kode eksemplar: kode buku + nomor urut 2 digit, mis. "B0001-03". */
export function formatKodeEksemplar(kodeBuku: string, urut: number): string {
  return `${kodeBuku}-${String(urut).padStart(2, '0')}`;
}

export type AturanPerpus = {
  /** Lama pinjam bawaan (hari). */
  lamaPinjam: number;
  /** Maks. buku yang boleh dipinjam bersamaan per anggota. */
  maksBuku: number;
  /** Denda keterlambatan per hari (Rp). */
  dendaPerHari: number;
  /** Maks. kali perpanjangan per peminjaman. */
  maksPerpanjang: number;
  /** Tanggal libur (YYYY-MM-DD) yang tidak dihitung denda, selain hari Minggu. */
  libur: string[];
};

export const ATURAN_BAWAAN: AturanPerpus = {
  lamaPinjam: 7,
  maksBuku: 2,
  dendaPerHari: 500,
  maksPerpanjang: 1,
  libur: [],
};

const kunciAturan = (unitId: number, nama: string) => `perpus:${unitId}:${nama}`;

/** Aturan sirkulasi per unit dari AppSetting (jatuh ke bawaan bila belum diatur). */
export async function bacaAturanPerpus(unitId: number): Promise<AturanPerpus> {
  const keys = ['lama-pinjam', 'maks-buku', 'denda-per-hari', 'maks-perpanjang', 'libur'].map((n) => kunciAturan(unitId, n));
  const rows = await prisma.appSetting.findMany({ where: { key: { in: keys } } });
  const peta = new Map(rows.map((r) => [r.key, r.value]));
  const angka = (nama: string, bawaan: number) => {
    const n = Number(peta.get(kunciAturan(unitId, nama)));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : bawaan;
  };
  const liburMentah = peta.get(kunciAturan(unitId, 'libur')) ?? '';
  return {
    lamaPinjam: angka('lama-pinjam', ATURAN_BAWAAN.lamaPinjam),
    maksBuku: angka('maks-buku', ATURAN_BAWAAN.maksBuku),
    dendaPerHari: (() => { const n = Number(peta.get(kunciAturan(unitId, 'denda-per-hari'))); return Number.isFinite(n) && n >= 0 ? Math.floor(n) : ATURAN_BAWAAN.dendaPerHari; })(),
    maksPerpanjang: angka('maks-perpanjang', ATURAN_BAWAAN.maksPerpanjang),
    libur: liburMentah.split(/[\n,;]+/).map((s) => s.trim()).filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s)),
  };
}

const isoHari = (d: Date) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

/**
 * Hari yang dikenai denda: hari kalender setelah jatuh tempo s.d. tanggal
 * kembali (inklusif), dikurangi hari Minggu dan tanggal libur terdaftar.
 */
export function hitungHariDenda(jatuhTempo: Date, tanggal: Date, libur: string[]): number {
  const liburSet = new Set(libur);
  const awal = new Date(jatuhTempo); awal.setHours(0, 0, 0, 0);
  const akhir = new Date(tanggal); akhir.setHours(0, 0, 0, 0);
  let hari = 0;
  const kursor = new Date(awal);
  while (kursor < akhir) {
    kursor.setDate(kursor.getDate() + 1);
    if (kursor.getDay() === 0) continue; // Minggu tidak dihitung
    if (liburSet.has(isoHari(kursor))) continue;
    hari++;
  }
  return hari;
}

/** Denda berjalan untuk pinjaman yang belum kembali (tampilan saja). */
export function dendaProspektif(jatuhTempo: Date, aturan: AturanPerpus, pada: Date = new Date()): number {
  return hitungHariDenda(jatuhTempo, pada, aturan.libur) * aturan.dendaPerHari;
}
