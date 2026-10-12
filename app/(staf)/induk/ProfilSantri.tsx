import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { type TabDef } from '@/components';
import { bacaFilter, queryFilter } from './filter';
import { HeaderSantri } from './HeaderSantri';
import { TabBiodata } from './TabBiodata';
import { TabAkademik } from './TabAkademik';
import { TabKepesantrenan } from './TabKepesantrenan';
import { TabKesehatan } from './TabKesehatan';
import { TabKeuangan } from './TabKeuangan';
import { TabWali } from './TabWali';

const TABS: TabDef[] = [
  { key: 'biodata', label: 'Biodata' },
  { key: 'akademik', label: 'Akademik' },
  { key: 'pesantren', label: 'Kepesantrenan' },
  { key: 'kesehatan', label: 'Kesehatan' },
  { key: 'keuangan', label: 'Keuangan' },
  { key: 'wali', label: 'Wali & Keluarga' },
];

/**
 * Profil satu santri — dipakai bersama oleh /induk/[id], /siswa/[id], dan
 * /santri/[id]. `basis` adalah modul pemiliknya: tautan tab dan tombol
 * "Kembali ke daftar" selalu pulang ke daftar modul itu sendiri, tidak
 * pernah memantul ke Data Induk (permintaan user: urusan siswa/santri
 * selesai di modulnya masing-masing). Konteks daftar asal (filter +
 * halaman) diterima lewat query yang sama seperti daftar dan diteruskan
 * ke tautan tab, supaya tombol kembali mendarat di daftar yang sama persis.
 */
export async function ProfilSantri({
  idParam,
  sp,
  basis,
}: {
  idParam: string;
  sp: Record<string, string | string[] | undefined>;
  basis: string;
}) {
  if (!/^\d+$/.test(idParam)) notFound();

  const ambil = (k: string) => { const v = sp[k]; return Array.isArray(v) ? v[0] : v; };
  const tabRaw = ambil('tab');
  const tabAktif = TABS.some((t) => t.key === tabRaw) ? (tabRaw as string) : TABS[0].key;
  const f = bacaFilter(sp);
  const halaman = Math.max(1, Number(ambil('halaman')) || 1);

  const santri = await prisma.santri.findUnique({
    where: { id: BigInt(idParam) },
    include: { person: true, unit: true },
  });
  if (!santri) notFound();

  const hrefTab = (key: string) => {
    const p = new URLSearchParams(queryFilter(f));
    p.set('tab', key);
    if (halaman > 1) p.set('halaman', String(halaman));
    return `${basis}/${idParam}?${p.toString()}`;
  };
  const pKembali = new URLSearchParams(queryFilter(f));
  if (halaman > 1) pKembali.set('halaman', String(halaman));
  const qsKembali = pKembali.toString();
  const hrefKembali = qsKembali ? `${basis}?${qsKembali}` : basis;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Link
        href={hrefKembali}
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
