import { redirect } from 'next/navigation';
import { requirePage } from '@/lib/access';
import { JudulHalaman, PesanAksi, satu, type SearchParams } from '@/components';
import { prisma } from '@/lib/prisma';
import { unitPerpustakaan } from '../../data';
import { BukuForm } from '../../BukuForm';

export default async function BukuBaruPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePage('perpustakaan');
  const sp = await searchParams;
  const units = await unitPerpustakaan();
  const unit = units.find((u) => u.id === Number(satu(sp.unit))) ?? units[0];
  if (!unit) redirect('/perpustakaan');

  return (
    <>
      <JudulHalaman judul="Tambah buku" sub={`Katalog perpustakaan ${unit.nama}.`} />
      <PesanAksi pesan={satu(sp.pesan) || undefined} galat={satu(sp.galat) || undefined} />
      <BukuForm unit={unit} buku={null} />
    </>
  );
}
