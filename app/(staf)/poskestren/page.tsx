import { requirePage } from '@/lib/access';
import { JudulHalaman, Tabs, tabAktif } from '@/components';
import { TabDashboard } from './TabDashboard';
import { TabPeriksa } from './TabPeriksa';
import { TabRekam } from './TabRekam';
import { TabObat } from './TabObat';
import { TabPiket } from './TabPiket';
import { TabLapor } from './TabLapor';

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'periksa', label: 'Form Pemeriksaan' },
  { key: 'rekam', label: 'Rekam Medis' },
  { key: 'obat', label: 'Stok Obat' },
  { key: 'piket', label: 'Piket Kader' },
  { key: 'lapor', label: 'Laporan Puskesmas' },
];

export default async function PoskestrenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePage('poskestren');
  const params = await searchParams;
  const aktif = tabAktif(TABS, params.tab);

  return (
    <>
      <JudulHalaman
        judul="Modul Poskestren"
        sub="1 perawat tetap · 2 dokter kunjung (Selasa & Jumat) · kader Santri Husada mendampingi piket harian."
      />
      <Tabs tabs={TABS} aktif={aktif} basePath="/poskestren" />
      {aktif === 'dashboard' && <TabDashboard />}
      {aktif === 'periksa' && <TabPeriksa />}
      {aktif === 'rekam' && <TabRekam />}
      {aktif === 'obat' && <TabObat q={typeof params.q === 'string' ? params.q : ''} />}
      {aktif === 'piket' && <TabPiket />}
      {aktif === 'lapor' && <TabLapor />}
    </>
  );
}
