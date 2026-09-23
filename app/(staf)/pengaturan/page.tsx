import { requirePage } from '@/lib/access';
import { JudulHalaman, PesanAksi, Tabs, tabAktif, satu } from '@/components';
import { TabTahunAjaran } from './TabTahunAjaran';
import { TabUnit } from './TabUnit';
import { TabPengguna } from './TabPengguna';
import { TabIzin } from './TabIzin';

const TABS = [
  { key: 'tahun-ajaran', label: 'Tahun ajaran' },
  { key: 'unit', label: 'Unit' },
  { key: 'pengguna', label: 'Pengguna & peran' },
  { key: 'izin', label: 'Izin per peran' },
];

export default async function PengaturanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePage('pengaturan');
  const sp = await searchParams;
  const aktif = tabAktif(TABS, sp.tab);

  return (
    <>
      <JudulHalaman judul="Pengaturan" sub="Unit, tahun ajaran aktif, pengguna & peran, serta matriks izin per peran." />
      <PesanAksi pesan={satu(sp.pesan) || undefined} galat={satu(sp.galat) || undefined} />
      <Tabs tabs={TABS} aktif={aktif} basePath="/pengaturan" />
      {aktif === 'tahun-ajaran' && <TabTahunAjaran />}
      {aktif === 'unit' && <TabUnit />}
      {aktif === 'pengguna' && <TabPengguna searchParams={sp} />}
      {aktif === 'izin' && <TabIzin sp={sp} />}
    </>
  );
}
