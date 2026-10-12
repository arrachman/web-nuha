import { notFound, redirect } from 'next/navigation';
import { requirePage } from '@/lib/access';
import { JudulHalaman, PesanAksi, satu, type SearchParams } from '@/components';
import { prisma } from '@/lib/prisma';
import { unitPerpustakaan } from '../../data';
import { BukuForm } from '../../BukuForm';
import { EksemplarPanel } from '../../EksemplarPanel';

export default async function BukuUbahPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await requirePage('perpustakaan');
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^\d+$/.test(id)) notFound();
  const buku = await prisma.book.findUnique({ where: { id: BigInt(id) }, include: { unit: true } });
  if (!buku) notFound();
  const units = await unitPerpustakaan();
  const unit = units.find((u) => u.id === buku.unitId) ?? units[0];
  if (!unit) redirect('/perpustakaan');

  return (
    <>
      <JudulHalaman judul="Ubah buku" sub={`${buku.kode} — ${unit.nama}.`} />
      <PesanAksi pesan={satu(sp.pesan) || undefined} galat={satu(sp.galat) || undefined} />
      <BukuForm unit={unit} buku={buku} />
      <EksemplarPanel buku={buku} />
    </>
  );
}
