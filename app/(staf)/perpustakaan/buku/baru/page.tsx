import { redirect } from 'next/navigation';
import { requirePage } from '@/lib/access';
import { getUnitAktif } from '@/lib/unit-scope';
import { JudulHalaman, PesanAksi, satu, type SearchParams } from '@/components';
import { prisma } from '@/lib/prisma';
import { unitPerpustakaan } from '../../data';
import { BukuForm } from '../../BukuForm';

export default async function BukuBaruPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requirePage('perpustakaan');
  const sp = await searchParams;
  const units = await unitPerpustakaan();
  // Unit mengikuti pemilih unit global (sama seperti halaman Perpustakaan).
  const unitAktif = await getUnitAktif(session);
  const unit = units.find((u) => u.id === unitAktif) ?? units[0];
  if (!unit) redirect('/perpustakaan');

  return (
    <>
      <JudulHalaman judul="Tambah buku" sub={`Katalog perpustakaan ${unit.nama}.`} />
      <PesanAksi pesan={satu(sp.pesan) || undefined} galat={satu(sp.galat) || undefined} />
      <BukuForm unit={unit} buku={null} />
    </>
  );
}
