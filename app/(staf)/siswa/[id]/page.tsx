import { notFound } from 'next/navigation';
import { requirePage } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { ProfilSantri } from '../../induk/ProfilSantri';

/** Profil siswa di modul Siswa sendiri — TIDAK memantul ke Data Induk
 * (permintaan user). Hanya siswa yang terdaftar di unit SMP/MA (penempatan
 * rombel atau unit utama, pola yang sama dengan daftar /siswa) yang bisa
 * dibuka di sini; di luar itu 404. */
export default async function DetailSiswaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePage('siswa');
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const unitRows = await prisma.unit.findMany({ where: { nama: { in: ['SMP', 'MA'] } }, select: { id: true } });
  const scope = unitRows.map((u) => u.id);
  const anggota = await prisma.santri.findFirst({
    where: {
      id: BigInt(id),
      OR: [
        { kelasLain: { some: { unitId: { in: scope } } } },
        { unitId: { in: scope } },
      ],
    },
    select: { id: true },
  });
  if (!anggota) notFound();

  const sp = await searchParams;
  return <ProfilSantri idParam={id} sp={sp} basis="/siswa" />;
}
