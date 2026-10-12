import { requirePage } from '@/lib/access';
import { HalamanDaftarUnit } from '../induk/DaftarUnit';

/** Daftar Siswa — cakupan dikunci ke unit SMP & MA (lihat HalamanDaftarUnit). */
export default async function SiswaPage({
  searchParams,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePage('siswa');
  const sp = await searchParams;
  return (
    <HalamanDaftarUnit
      sp={sp}
      basis="/siswa"
      namaUnit={['SMP', 'MA']}
      judul="Daftar Siswa"
      sub="Siswa unit SMP dan MA — klik satu nama untuk membuka profil lengkapnya di modul ini."
      sebutan="siswa"
    />
  );
}
