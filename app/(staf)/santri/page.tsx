import { requirePage } from '@/lib/access';
import { HalamanDaftarUnit } from '../induk/DaftarUnit';

/** Daftar Santri — cakupan dikunci ke unit Pondok Pesantren (lihat HalamanDaftarUnit). */
export default async function SantriPage({
  searchParams,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePage('santri');
  const sp = await searchParams;
  return (
    <HalamanDaftarUnit
      sp={sp}
      basis="/santri"
      namaUnit={['Pondok Pesantren']}
      judul="Daftar Santri"
      sub="Santri unit Pondok Pesantren — klik satu nama untuk membuka profil lengkapnya di modul ini."
      sebutan="santri"
    />
  );
}
