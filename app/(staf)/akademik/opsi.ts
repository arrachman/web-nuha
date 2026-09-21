import { prisma } from '@/lib/prisma';
import type { OpsiFilter } from './BarisFilter';

/** Pilihan penyaring diambil dari data yang benar-benar ada, bukan konstanta,
 * supaya operator tidak pernah memilih nilai yang hasilnya nol. */
export async function bacaOpsi(): Promise<OpsiFilter> {
  const [program, angkatan, asrama] = await Promise.all([
    prisma.santri.findMany({ where: { program: { not: null } }, distinct: ['program'], select: { program: true } }),
    prisma.santri.findMany({ where: { tahunMasuk: { not: null } }, distinct: ['tahunMasuk'], select: { tahunMasuk: true } }),
    prisma.dormitory.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  return {
    program: program.map((p) => p.program!).filter(Boolean).sort((a, b) => a.localeCompare(b, 'id')),
    angkatan: angkatan.map((a) => a.tahunMasuk!).filter(Boolean).sort((a, b) => b.localeCompare(a)),
    asrama: asrama.map(({ id, name }) => ({ id, nama: name })),
  };
}
