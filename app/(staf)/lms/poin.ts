import { prisma } from '@/lib/prisma';

/**
 * Skema tidak punya model poin/badge/level gamifikasi — prototype menghitungnya dari
 * aktivitas santri (hafalan, modul LMS, evidence, dsb). Karena field-field itu tak ada,
 * poin di sini murni diturunkan dari data akademik nyata yang sudah tersedia (Nilai.akhir),
 * dijumlah per santri. Bukan angka tetap.
 */
export type SantriPoin = {
  id: string;
  nama: string;
  kelas: string;
  poin: number;
};

export async function hitungPoinSantri(): Promise<SantriPoin[]> {
  const rows = await prisma.santri.findMany({
    include: { person: true, kelas: true, unit: true, nilai: true },
  });
  return rows
    .map((s) => ({
      id: String(s.id),
      nama: s.person.fullName,
      kelas: `${s.unit?.nama ?? '-'}${s.kelas ? ' ' + s.kelas.nama : ''}`,
      poin: Math.round(s.nilai.reduce((total, n) => total + Number(n.akhir), 0)),
    }))
    .sort((a, b) => b.poin - a.poin);
}

/** Enam tingkatan presentasi (nama/warna), urut naik. Batas ambangnya dihitung dari
 *  sebaran poin nyata (persentase dari poin tertinggi), bukan angka tetap per santri. */
export const TINGKAT = [
  { nama: 'Pemula', warna: '#9CA3AF' },
  { nama: 'Giat', warna: '#E8973A' },
  { nama: 'Cakap', warna: '#17804A' },
  { nama: 'Mahir', warna: '#0F6B3D' },
  { nama: 'Utama', warna: '#1D4ED8' },
  { nama: 'Legend Pondok', warna: '#5B21B6' },
] as const;

export function tingkatUntuk(poin: number, maxPoin: number): (typeof TINGKAT)[number] {
  if (maxPoin <= 0) return TINGKAT[0];
  const rasio = Math.min(1, Math.max(0, poin / maxPoin));
  const idx = Math.min(TINGKAT.length - 1, Math.floor(rasio * TINGKAT.length));
  return TINGKAT[idx];
}
