import { requirePage } from '@/lib/access';
import { JudulHalaman, Tabs, tabAktif } from '@/components';
import { TabTahunAjaran } from './TabTahunAjaran';
import { TabUnit } from './TabUnit';
import { TabPengguna } from './TabPengguna';

const TABS = [
  { key: 'tahun-ajaran', label: 'Tahun ajaran' },
  { key: 'unit', label: 'Unit' },
  { key: 'pengguna', label: 'Pengguna & peran' },
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
      <JudulHalaman judul="Pengaturan" sub="Unit, tahun ajaran aktif, serta pengguna & peran." />
      <Tabs tabs={TABS} aktif={aktif} basePath="/pengaturan" />
      {aktif === 'tahun-ajaran' && <TabTahunAjaran />}
      {aktif === 'unit' && <TabUnit />}
      {aktif === 'pengguna' && <TabPengguna searchParams={sp} />}
    </>
  );
}
