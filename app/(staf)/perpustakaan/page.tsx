import { requirePage } from '@/lib/access';
import { getUnitAktif } from '@/lib/unit-scope';
import { JudulHalaman, PesanAksi, Tabs, tabAktif, satu, type SearchParams } from '@/components';
import { unitPerpustakaan } from './data';
import { TabDashboard } from './TabDashboard';
import { TabKatalog } from './TabKatalog';
import { TabPeminjaman } from './TabPeminjaman';
import { TabLaporan } from './TabLaporan';

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'katalog', label: 'Katalog Buku' },
  { key: 'peminjaman', label: 'Peminjaman' },
  { key: 'laporan', label: 'Laporan' },
];

export default async function PerpustakaanPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requirePage('perpustakaan');
  const sp = await searchParams;
  const units = await unitPerpustakaan();
  // Unit selalu mengikuti pemilih unit global (topbar) — tidak ada lagi
  // pemilih unit lokal di halaman ini dan parameter ?unit= diabaikan.
  // Bila unit global "Semua Unit", tampilkan unit perpustakaan pertama.
  const unitAktif = await getUnitAktif(session);
  const unit = units.find((u) => u.id === unitAktif) ?? units[0];
  const tab = tabAktif(TABS, sp.tab);

  return (
    <>
      <JudulHalaman judul="Perpustakaan" sub={unit ? `Katalog buku, peminjaman, dan pengembalian — unit aktif: ${unit.nama} (mengikuti pemilih unit global).` : 'Katalog buku, peminjaman, dan pengembalian.'} />
      <PesanAksi pesan={satu(sp.pesan) || undefined} galat={satu(sp.galat) || undefined} />

      {!unit ? (
        <div className="card"><p className="muted">Belum ada unit perpustakaan (SMP / MA / Pondok) yang aktif.</p></div>
      ) : (
        <>
          <Tabs tabs={TABS} aktif={tab} basePath="/perpustakaan" />
          {tab === 'dashboard' && <TabDashboard unit={unit} />}
          {tab === 'katalog' && <TabKatalog unit={unit} sp={sp} />}
          {tab === 'peminjaman' && <TabPeminjaman unit={unit} sp={sp} />}
          {tab === 'laporan' && <TabLaporan unit={unit} />}
        </>
      )}
    </>
  );
}
