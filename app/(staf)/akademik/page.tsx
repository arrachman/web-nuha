import { requirePage } from '@/lib/access';
import { JudulHalaman, Tabs, tabAktif, type TabDef } from '@/components';
import { bacaFilter, hrefAkademik } from './filter';
import { bacaPohon } from './pohon';
import { bacaOpsi } from './opsi';
import { Penjelajah } from './Penjelajah';
import { BarisFilter } from './BarisFilter';
import { TabSiswa } from './TabSiswa';
import { TabPresensi } from './TabPresensi';
import { TabNilai } from './TabNilai';
import { TabRapor } from './TabRapor';

const TABS: TabDef[] = [
  { key: 'siswa', label: 'Siswa' },
  { key: 'presensi', label: 'Presensi' },
  { key: 'nilai', label: 'Nilai' },
  { key: 'rapor', label: 'Rapor' },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AkademikPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requirePage('akademik');
  const sp = await searchParams;
  const aktif = tabAktif(TABS, sp.tab);
  const f = bacaFilter(sp);

  // Penjelajah & penyaring dulu diulang di dalam tiap tab, sehingga berpindah
  // tab terasa seperti mereset konteks. Dinaikkan ke atas tabbar: ia menyaring
  // keempat tab sekaligus, dan `hrefTab` membawa filternya saat tab berganti.
  const [pohon, opsi] = await Promise.all([bacaPohon(f), bacaOpsi()]);

  return (
    <>
      <JudulHalaman judul="Modul Akademik" sub="Daftar siswa, rekap presensi, input nilai, dan cetak rapor." />

      <div className="card" style={{ marginBottom: 16 }}>
        <Penjelajah f={f} pohon={pohon} tab={aktif} />
        <div style={{ borderTop: '1px solid var(--garis)', marginTop: 12, paddingTop: 12 }}>
          <BarisFilter f={f} opsi={opsi} tab={aktif} />
        </div>
      </div>

      <Tabs tabs={TABS} aktif={aktif} basePath="/akademik" hrefTab={(key) => hrefAkademik(key, f)} />
      {aktif === 'siswa' && <TabSiswa searchParams={sp} />}
      {aktif === 'presensi' && <TabPresensi searchParams={sp} />}
      {aktif === 'nilai' && <TabNilai searchParams={sp} />}
      {aktif === 'rapor' && <TabRapor searchParams={sp} />}
    </>
  );
}
