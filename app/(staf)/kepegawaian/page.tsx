import { requirePage } from '@/lib/access';
import { JudulHalaman, Tabs, tabAktif, bacaHalaman } from '@/components';
import { bacaFilterPegawai, hrefKepegawaian } from './filter';
import { bacaPohonPegawai } from './pohon';
import { Penjelajah } from './Penjelajah';
import { BarisFilter } from './BarisFilter';
import { TabDaftar } from './TabDaftar';
import { TabPiket } from './TabPiket';
import { TabJurnal } from './TabJurnal';
import { TabPresensi } from './TabPresensi';
import { TabBebanJam } from './TabBebanJam';
import { TabArsipSk } from './TabArsipSk';
import { TabStruktur } from './TabStruktur';

const TABS = [
  { key: 'daftar', label: 'Daftar Pegawai' },
  { key: 'piket', label: 'Guru Piket' },
  { key: 'jurnal', label: 'Jurnal Mengajar' },
  { key: 'presensi', label: 'Presensi Pegawai' },
  { key: 'beban-jam', label: 'Beban Jam' },
  { key: 'arsip-sk', label: 'Arsip SK' },
  { key: 'struktur', label: 'Struktur Organisasi' },
];

export default async function KepegawaianPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePage('kepegawaian');
  const sp = await searchParams;
  const aktif = tabAktif(TABS, sp.tab);
  const f = bacaFilterPegawai(sp);
  const halaman = bacaHalaman(sp);
  const pohon = await bacaPohonPegawai(f);

  return (
    <>
      <JudulHalaman
        judul="Kepegawaian"
        sub="Data induk guru & pegawai, jadwal piket, jurnal mengajar, presensi, beban jam, arsip SK, dan struktur organisasi."
      />

      {/* Penjelajah & pencarian sengaja di ATAS tabbar: pilihan lembaga adalah
          konteks untuk semua tab, jadi ia harus bertahan saat operator
          berpindah tab — bukan penyaring milik satu tab saja. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Penjelajah f={f} pohon={pohon} tab={aktif} />
        <BarisFilter f={f} tab={aktif} />
      </div>

      <Tabs
        tabs={TABS}
        aktif={aktif}
        basePath="/kepegawaian"
        hrefTab={(key) => hrefKepegawaian(key, f)}
      />
      {aktif === 'daftar' && <TabDaftar f={f} halaman={halaman} />}
      {aktif === 'piket' && <TabPiket f={f} />}
      {aktif === 'jurnal' && <TabJurnal f={f} />}
      {aktif === 'presensi' && <TabPresensi f={f} />}
      {aktif === 'beban-jam' && <TabBebanJam f={f} />}
      {aktif === 'arsip-sk' && <TabArsipSk f={f} />}
      {aktif === 'struktur' && <TabStruktur f={f} />}
    </>
  );
}
