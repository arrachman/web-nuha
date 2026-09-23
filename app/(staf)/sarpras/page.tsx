import { requirePage } from '@/lib/access';
import { JudulHalaman, PesanAksi, Tabs, tabAktif, satu, type SearchParams } from '@/components';
import { izinSarpras, type IzinSarpras } from '@/lib/aset/akses';
import { TabDashboard } from './TabDashboard';
import { TabAset } from './TabAset';
import { TabLokasi } from './TabLokasi';
import { TabPengadaan } from './TabPengadaan';
import { TabPeminjaman } from './TabPeminjaman';
import { TabKerusakan } from './TabKerusakan';
import { TabPemeliharaan } from './TabPemeliharaan';
import { TabOpname } from './TabOpname';
import { TabPenghapusan } from './TabPenghapusan';
import { TabLaporan } from './TabLaporan';
import { TabMaster } from './TabMaster';

/**
 * Tab mengikuti izin (05 §3): pegawai/guru di /sarpras hanya melihat
 * "Kerusakan" (laporan saya) dan "Peminjaman", plus "Aset" untuk ruang yang
 * ia PIC-i / aset yang ia pegang (tanpa kolom harga).
 */
const SEMUA_TAB: Array<{ key: string; label: string; boleh: (i: IzinSarpras) => boolean }> = [
  { key: 'dashboard', label: 'Dashboard', boleh: (i) => i.pengelola },
  { key: 'aset', label: 'Aset', boleh: (i) => i.view },
  { key: 'lokasi', label: 'Lokasi', boleh: (i) => i.location_manage || i.pengelola },
  { key: 'pengadaan', label: 'Pengadaan', boleh: (i) => i.procure_request || i.procure_approve },
  { key: 'peminjaman', label: 'Peminjaman', boleh: (i) => i.loan_request || i.loan_approve },
  { key: 'kerusakan', label: 'Kerusakan', boleh: (i) => i.damage_report || i.damage_handle },
  { key: 'pemeliharaan', label: 'Pemeliharaan', boleh: (i) => i.maintenance_manage },
  { key: 'opname', label: 'Stock Opname', boleh: (i) => i.opname_run || i.opname_close },
  { key: 'penghapusan', label: 'Penghapusan', boleh: (i) => i.dispose_request || i.dispose_approve },
  { key: 'laporan', label: 'Laporan', boleh: (i) => i.export },
  { key: 'master', label: 'Master', boleh: (i) => i.master_manage || i.asset_manage },
];

export default async function SarprasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requirePage('sarpras');
  const sp = await searchParams;
  const izin = await izinSarpras(session);
  const tabs = SEMUA_TAB.filter((t) => t.boleh(izin)).map(({ key, label }) => ({ key, label }));
  if (tabs.length === 0) tabs.push({ key: 'kerusakan', label: 'Kerusakan' });
  const aktif = tabAktif(tabs, sp.tab);

  return (
    <>
      <JudulHalaman judul="Sarana & Prasarana" sub="Aset tetap, ruang, peminjaman, kerusakan, pemeliharaan, dan penghapusan." />
      <PesanAksi pesan={satu(sp.pesan) || undefined} galat={satu(sp.galat) || undefined} />
      <Tabs tabs={tabs} aktif={aktif} basePath="/sarpras" />
      {aktif === 'dashboard' && <TabDashboard session={session} izin={izin} />}
      {aktif === 'aset' && <TabAset session={session} izin={izin} sp={sp} />}
      {aktif === 'lokasi' && <TabLokasi session={session} izin={izin} />}
      {aktif === 'pengadaan' && <TabPengadaan session={session} izin={izin} />}
      {aktif === 'peminjaman' && <TabPeminjaman session={session} izin={izin} />}
      {aktif === 'kerusakan' && <TabKerusakan session={session} izin={izin} sp={sp} />}
      {aktif === 'pemeliharaan' && <TabPemeliharaan session={session} izin={izin} />}
      {aktif === 'opname' && <TabOpname session={session} izin={izin} />}
      {aktif === 'penghapusan' && <TabPenghapusan session={session} izin={izin} />}
      {aktif === 'laporan' && <TabLaporan />}
      {aktif === 'master' && <TabMaster session={session} izin={izin} />}
    </>
  );
}
