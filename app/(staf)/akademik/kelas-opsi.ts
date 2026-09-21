import { prisma } from '@/lib/prisma';
import type { FilterAkademik } from './filter';

/** Daftar rombel yang boleh dipilih di tab Nilai/Rapor, dipersempit oleh
 * penjelajah unit/tingkat. Tanpa ini operator MA harus menyisir semua rombel
 * SMP di satu dropdown panjang. */
export function bacaKelasOpsi(f: FilterAkademik) {
  return prisma.kelas.findMany({
    where: {
      ...(f.unit ? { unit: { key: f.unit } } : {}),
      ...(f.tingkat ? { tingkat: f.tingkat } : {}),
    },
    include: { unit: true },
    orderBy: [{ unitId: 'asc' }, { nama: 'asc' }],
  });
}
