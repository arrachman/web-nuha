import { requirePage } from '@/lib/access';
import { JudulHalaman, PesanAksi, Tabs, tabAktif, satu, type SearchParams } from '@/components';
import { izinPresensi, type IzinPresensi } from '@/lib/presensi/akses';
import { TabDashboard } from './TabDashboard';
import { TabSiswa } from './TabSiswa';
import { TabSaya } from './TabSaya';
import { TabTinjau } from './TabTinjau';
import { TabPengaturan } from './TabPengaturan';
import { TabLaporan } from './TabLaporan';

/** Tab mengikuti izin (05 §3): pegawai/bendahara/sarpras hanya "Presensi Saya". */
const SEMUA_TAB: Array<{ key: string; label: string; boleh: (i: IzinPresensi) => boolean }> = [
  { key: 'dashboard', label: 'Dashboard', boleh: (i) => i.view },
  { key: 'siswa', label: 'Input Siswa/Santri', boleh: (i) => i.input },
  { key: 'saya', label: 'Presensi Saya', boleh: (i) => i.self },
  { key: 'tinjau', label: 'Perlu Ditinjau', boleh: (i) => i.review },
  { key: 'laporan', label: 'Laporan', boleh: (i) => i.export },
  { key: 'pengaturan', label: 'Pengaturan', boleh: (i) => i.setting },
];

export default async function PresensiPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requirePage('presensi');
  const sp = await searchParams;
  const izin = await izinPresensi(session);
  const tabs = SEMUA_TAB.filter((t) => t.boleh(izin)).map(({ key, label }) => ({ key, label }));
  if (!tabs.length) tabs.push({ key: 'saya', label: 'Presensi Saya' });
  const aktif = tabAktif(tabs, sp.tab);
  return (
    <>
      <JudulHalaman judul="Presensi" sub="Presensi harian santri per sesi, presensi selfie guru & pegawai, dan dashboard kehadiran." />
      <PesanAksi pesan={satu(sp.pesan) || undefined} galat={satu(sp.galat) || undefined} />
      <Tabs tabs={tabs} aktif={aktif} basePath="/presensi" />
      {aktif === 'dashboard' && <TabDashboard session={session} izin={izin} sp={sp} />}
      {aktif === 'siswa' && <TabSiswa session={session} izin={izin} sp={sp} />}
      {aktif === 'saya' && <TabSaya session={session} />}
      {aktif === 'tinjau' && <TabTinjau session={session} />}
      {aktif === 'laporan' && <TabLaporan session={session} sp={sp} />}
      {aktif === 'pengaturan' && <TabPengaturan />}
    </>
  );
}
