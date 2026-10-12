import { redirect } from 'next/navigation';
import { satu, type SearchParams } from '@/components';
import { BingkaiPerpus } from './Bingkai';
import { TabDashboard } from './TabDashboard';

/** Tujuan rute baru untuk tautan lama berbentuk ?tab=… (penanda lama &
 * kiriman form sebelum sub-menu jadi halaman sendiri). */
const TUJUAN_TAB: Record<string, string> = {
  peminjaman: '/perpustakaan/peminjaman',
  pengembalian: '/perpustakaan/pengembalian',
  perpanjangan: '/perpustakaan/perpanjangan',
  katalog: '/perpustakaan/katalog',
  label: '/perpustakaan/label',
  opname: '/perpustakaan/opname',
  anggota: '/perpustakaan/anggota',
  laporan: '/perpustakaan/laporan',
  pengaturan: '/perpustakaan/pengaturan',
};

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const tab = satu(sp.tab) ?? 'dashboard';
  if (tab !== 'dashboard' && TUJUAN_TAB[tab]) {
    const sisa = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (k === 'tab' || k === 'ok' || k === 'galat') continue;
      const nilai = Array.isArray(v) ? v[0] : v;
      if (nilai) sisa.set(k, nilai);
    }
    const qs = sisa.toString();
    redirect(qs ? `${TUJUAN_TAB[tab]}?${qs}` : TUJUAN_TAB[tab]);
  }
  return (
    <BingkaiPerpus sp={sp} sub="Ringkasan koleksi, sirkulasi, dan denda" anak={(unit) => <TabDashboard unit={unit} />} />
  );
}
