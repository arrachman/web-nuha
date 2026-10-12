import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePage } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { type TabDef } from '@/components';
import { bacaFilter, hrefInduk, queryFilter } from '../filter';
import { HeaderSantri } from '../HeaderSantri';
import { TabBiodata } from '../TabBiodata';
import { TabAkademik } from '../TabAkademik';
import { TabKepesantrenan } from '../TabKepesantrenan';
import { TabKesehatan } from '../TabKesehatan';
import { TabKeuangan } from '../TabKeuangan';
import { TabWali } from '../TabWali';

const TABS: TabDef[] = [
  { key: 'biodata', label: 'Biodata' },
  { key: 'akademik', label: 'Akademik' },
  { key: 'pesantren', label: 'Kepesantrenan' },
  { key: 'kesehatan', label: 'Kesehatan' },
  { key: 'keuangan', label: 'Keuangan' },
  { key: 'wali', label: 'Wali & Keluarga' },
];

/** Profil satu santri — halaman tersendiri (dulu panel master-detail yang
 * menempel di /induk). Konteks daftar asal (filter + halaman) diterima lewat
 * query yang sama seperti /induk dan diteruskan ke tautan tab, supaya
 * "Kembali ke daftar" mendarat persis di daftar yang tadi dibuka. */
export default async function DetailSantriPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePage('induk');
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const sp = await searchParams;
  const ambil = (k: string) => { const v = sp[k]; return Array.isArray(v) ? v[0] : v; };
  const tabRaw = ambil('tab');
  const tabAktif = TABS.some((t) => t.key === tabRaw) ? (tabRaw as string) : TABS[0].key;
  const f = bacaFilter(sp);
  const halaman = Math.max(1, Number(ambil('halaman')) || 1);

  const santri = await prisma.santri.findUnique({
    where: { id: BigInt(id) },
    include: { person: true, unit: true },
  });
  if (!santri) notFound();

  const hrefTab = (key: string) => {
    const p = new URLSearchParams(queryFilter(f));
    p.set('tab', key);
    if (halaman > 1) p.set('halaman', String(halaman));
    return `/induk/${id}?${p.toString()}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Link
        href={hrefInduk(f, {}, { halaman })}
        className="induk-kembali muted"
        style={{ alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600 }}
      >
        ‹ Kembali ke daftar
      </Link>
      <HeaderSantri sel={santri} />
      <nav className="tabbar">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={hrefTab(t.key)}
            scroll={false}
            className={`tab ${t.key === tabAktif ? 'active' : ''}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="card">
        {tabAktif === 'biodata' && <TabBiodata santriId={santri.id} />}
        {tabAktif === 'akademik' && <TabAkademik santriId={santri.id} />}
        {tabAktif === 'pesantren' && <TabKepesantrenan santriId={santri.id} />}
        {tabAktif === 'kesehatan' && <TabKesehatan santriId={santri.id} />}
        {tabAktif === 'keuangan' && <TabKeuangan santriId={santri.id} />}
        {tabAktif === 'wali' && <TabWali santriId={santri.id} />}
      </div>
    </div>
  );
}
