import { prisma } from '@/lib/prisma';
import { wherePegawai, TANPA_LEMBAGA, type FilterPegawai } from './filter';

export type SimpulLembaga = { key: string; nama: string; jumlah: number };

export type PohonPegawai = {
  total: number;
  lembaga: SimpulLembaga[];
  /** Nilai `status` yang benar-benar ada di data, beserta jumlahnya. */
  status: { nama: string; jumlah: number }[];
};

/**
 * Hitung sebaran pegawai per lembaga (SMP / MA / Pondok / Poskestren) dan per
 * status kepegawaian.
 *
 * Jumlah dihitung dengan filter lain tetap berlaku (pencarian, jenis kelamin)
 * tapi tanpa filter yang sedang dihitung itu sendiri — supaya angka di chip
 * menunjukkan "kalau saya klik ini, dapat berapa", bukan nol semua.
 */
export async function bacaPohonPegawai(f: FilterPegawai): Promise<PohonPegawai> {
  const [perStatus, unitRows, total, tanpa] = await Promise.all([
    prisma.staff.groupBy({
      by: ['status'],
      where: wherePegawai({ ...f, status: undefined }),
      _count: { _all: true },
    }),
    prisma.unit.findMany({ orderBy: { id: 'asc' } }),
    prisma.staff.count({ where: wherePegawai({ ...f, unit: undefined }) }),
    prisma.staff.count({ where: wherePegawai({ ...f, unit: TANPA_LEMBAGA }) }),
  ]);

  // Dihitung per unit lewat `whereUnit` yang sama dengan daftarnya (unit utama
  // ATAU penugasan tambahan), bukan `groupBy('unitId')` — pegawai lintas
  // lembaga harus terhitung di setiap unit tempat ia bertugas, dan angka chip
  // harus persis sama dengan jumlah baris saat chip itu diklik.
  const jumlahUnit = await Promise.all(
    unitRows.map((u) => prisma.staff.count({ where: wherePegawai({ ...f, unit: u.key }) })),
  );

  const lembaga: SimpulLembaga[] = unitRows
    .map((u, i) => ({
      key: u.key,
      nama: u.nama.replace(/ Nurul Huda Mergosono$/, ''),
      jumlah: jumlahUnit[i],
    }))
    .filter((u) => u.jumlah > 0)
    .sort((a, b) => b.jumlah - a.jumlah);

  if (tanpa > 0) lembaga.push({ key: TANPA_LEMBAGA, nama: 'Tanpa lembaga', jumlah: tanpa });

  const status = perStatus
    .map((r) => ({ nama: r.status, jumlah: r._count._all }))
    .sort((a, b) => b.jumlah - a.jumlah);

  return { total, lembaga, status };
}
