import { requirePage } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { JudulHalaman, Tabs, tabAktif } from '@/components';
import { TabHari } from './TabHari';
import { TabRiwayat } from './TabRiwayat';
import { TabDaftar } from './TabDaftar';
import { TabAturan } from './TabAturan';

const TABS = [
  { key: 'hari', label: 'Hari Ini' },
  { key: 'riwayat', label: 'Riwayat' },
  { key: 'daftar', label: 'Pendaftaran' },
  { key: 'aturan', label: 'Aturan' },
];

export default async function KunjunganWaliPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePage('kunjungan');
  const sp = await searchParams;
  const aktif = tabAktif(TABS, sp.tab);

  const awalHari = new Date();
  awalHari.setHours(0, 0, 0, 0);
  const akhirHari = new Date(awalHari);
  akhirHari.setDate(akhirHari.getDate() + 1);

  const hariIni = await prisma.kunjungan.findMany({ where: { tgl: { gte: awalHari, lt: akhirHari } } });
  const kjHariN = hariIni.length;
  const kjAreaN = hariIni.filter((k) => k.status === 'Sedang berkunjung').length;
  const kjTungguN = hariIni.filter((k) => k.status === 'Menunggu verifikasi').length;

  return (
    <>
      <JudulHalaman
        judul="Kunjungan Wali Santri"
        sub="Buku tamu digital: verifikasi, check-in, check-out, dan pencatatan kunjungan."
      />
      <section className="grid g3">
        <div className="card"><p className="label">Kunjungan hari ini</p><p className="angka" style={{ color: '#0F6B3D' }}>{kjHariN}</p></div>
        <div className="card"><p className="label">Sedang berkunjung</p><p className="angka" style={{ color: '#1D4ED8' }}>{kjAreaN}</p></div>
        <div className="card"><p className="label">Menunggu verifikasi</p><p className="angka" style={{ color: '#E8973A' }}>{kjTungguN}</p></div>
      </section>
      <Tabs tabs={TABS} aktif={aktif} basePath="/kunjungan-wali" />
      {aktif === 'hari' && <TabHari />}
      {aktif === 'riwayat' && <TabRiwayat searchParams={sp} />}
      {aktif === 'daftar' && <TabDaftar />}
      {aktif === 'aturan' && <TabAturan />}
    </>
  );
}
