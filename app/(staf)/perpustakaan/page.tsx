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
  const unitAktif = await getUnitAktif(session);
  const unitId = Number(satu(sp.unit)) || (unitAktif && units.some((u) => u.id === unitAktif) ? unitAktif : undefined) || units[0]?.id;
  const unit = units.find((u) => u.id === unitId) ?? units[0];
  const tab = tabAktif(TABS, sp.tab);

  return (
    <>
      <JudulHalaman judul="Perpustakaan" sub="Katalog buku, peminjaman, dan pengembalian per unit: SMP, MA, dan Pondok Pesantren." />
      <PesanAksi pesan={satu(sp.pesan) || undefined} galat={satu(sp.galat) || undefined} />

      {units.length > 1 && (
        <div className="card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Unit:</span>
          {units.map((u) => (
            <a
              key={u.id}
              href={`/perpustakaan?unit=${u.id}${tab === 'dashboard' ? '' : `&tab=${tab}`}`}
              className={u.id === unit?.id ? 'btn' : 'btn-sekunder'}
              style={{ fontSize: 13 }}
            >
              {u.nama}
            </a>
          ))}
        </div>
      )}

      {!unit ? (
        <div className="card"><p className="muted">Belum ada unit perpustakaan (SMP / MA / Pondok) yang aktif.</p></div>
      ) : (
        <>
          <Tabs
            tabs={TABS}
            aktif={tab}
            basePath="/perpustakaan"
            hrefTab={(k) => `/perpustakaan?unit=${unit.id}${k === 'dashboard' ? '' : `&tab=${k}`}`}
          />
          {tab === 'dashboard' && <TabDashboard unit={unit} />}
          {tab === 'katalog' && <TabKatalog unit={unit} sp={sp} />}
          {tab === 'peminjaman' && <TabPeminjaman unit={unit} sp={sp} />}
          {tab === 'laporan' && <TabLaporan unit={unit} />}
        </>
      )}
    </>
  );
}
