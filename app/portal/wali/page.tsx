import Link from 'next/link';
import { requirePage } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { LogoutButton } from '@/components/LogoutButton';
import { avaBg, inisial } from '@/components';
import { TabRingkasan } from './tabs/TabRingkasan';
import { TabHafalan } from './tabs/TabHafalan';
import { TabKesehatan } from './tabs/TabKesehatan';
import { TabInvoice } from './tabs/TabTagihan';
import { TabBayar } from './tabs/TabBayar';
import { TabRiwayat } from './tabs/TabRiwayat';
import { TabKunjungan } from './tabs/TabKunjungan';
import { TabIzin } from './tabs/TabIzin';

const TABS = [
  { key: 'ringkasan', label: 'Ringkasan' },
  { key: 'hafalan', label: 'Hafalan' },
  { key: 'kesehatan', label: 'Kesehatan' },
  { key: 'tagihan', label: 'Tagihan' },
  { key: 'bayar', label: 'Bayar' },
  { key: 'riwayat', label: 'Riwayat SPP' },
  { key: 'kunjungan', label: 'Kunjungan' },
  { key: 'izin', label: 'Izin' },
];

/**
 * Portal Wali — beda dari prototype: prototype cuma render santri[0], di sini
 * wali dengan >1 anak WAJIB memilih lewat ?anak=<santriId>. Param itu divalidasi
 * di server terhadap GuardianRelation milik sesi — tidak pernah dipercaya mentah.
 */
export default async function PortalWaliPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requirePage('portal-wali');
  const sp = await searchParams;
  const tabRaw = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tabAktif = TABS.some((t) => t.key === tabRaw) ? (tabRaw as string) : TABS[0].key;

  const user = await prisma.user.findUnique({
    where: { id: BigInt(session.userId) },
    include: { person: { include: { waliDari: { include: { anak: { include: { santri: { include: { unit: true, kelas: true, room: { include: { dormitory: true } } } } } } } } } } },
  });
  const relasi = user?.person.waliDari.filter((row) => row.anak.santri) ?? [];

  if (relasi.length === 0) {
    return (
      <PortalFrame nama={user?.person.fullName ?? session.nama}>
        <div className="card">Akun wali ini belum tertaut ke data santri manapun. Hubungi kantor pondok.</div>
      </PortalFrame>
    );
  }

  const anakParam = Array.isArray(sp.anak) ? sp.anak[0] : sp.anak;
  const relasiDipilih = relasi.find((row) => String(row.anak.santri!.id) === anakParam) ?? relasi[0];
  const santri = relasiDipilih.anak.santri!;
  const anak = relasiDipilih.anak;

  return (
    <PortalFrame nama={anak.fullName}>
      <div style={{ display: 'flex', gap: 13, alignItems: 'center', marginTop: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: avaBg(anak.fullName), color: '#FFF', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-lora), serif', border: '2px solid rgba(232,151,58,.6)', flex: '0 0 auto' }}>{inisial(anak.fullName)}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 19, fontWeight: 600, color: '#0A4A2B' }}>{anak.fullName}</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{santri.unit?.nama ?? '-'} {santri.kelas?.nama ?? ''} · Asrama {santri.room?.dormitory.name ?? '-'} {santri.room?.code ?? ''}</div>
        </div>
      </div>

      {relasi.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {relasi.map((row) => (
            <Link
              key={String(row.anak.santri!.id)}
              href={`/portal/wali?anak=${row.anak.santri!.id}`}
              className={`tab ${String(row.anak.santri!.id) === String(santri.id) ? 'active' : ''}`}
              style={{ fontSize: 12 }}
            >
              {row.anak.fullName}
            </Link>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 14, paddingBottom: 4 }}>
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/portal/wali?anak=${santri.id}${t.key === TABS[0].key ? '' : `&tab=${t.key}`}`}
            className={`tab ${t.key === tabAktif ? 'active' : ''}`}
            style={{ whiteSpace: 'nowrap' }}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {tabAktif === 'ringkasan' && <TabRingkasan santriId={santri.id} program={santri.program} />}
        {tabAktif === 'hafalan' && <TabHafalan santriId={santri.id} program={santri.program} />}
        {tabAktif === 'kesehatan' && <TabKesehatan santriId={santri.id} />}
        {tabAktif === 'tagihan' && <TabInvoice santriId={santri.id} />}
        {tabAktif === 'bayar' && <TabBayar santriId={santri.id} />}
        {tabAktif === 'riwayat' && <TabRiwayat santriId={santri.id} />}
        {tabAktif === 'kunjungan' && <TabKunjungan santriId={santri.id} namaWaliDefault={session.nama} hubungan={relasiDipilih.hubungan} />}
        {tabAktif === 'izin' && <TabIzin santriId={santri.id} />}
      </div>
    </PortalFrame>
  );
}

function PortalFrame({ nama, children }: { nama: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#EDF3EF', display: 'flex', justifyContent: 'center', padding: 0 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#FAF8F3', minHeight: '100vh', boxShadow: '0 0 40px rgba(10,74,43,.09)', display: 'flex', flexDirection: 'column' }}>
        <header style={{ background: 'linear-gradient(180deg, #4E8F72 0%, #5C9C7D 52%, #74B092 100%)', color: '#F3F1E9', padding: '18px 18px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: 'rgba(243,241,233,.7)' }}>Portal Wali Santri · {nama}</div>
            <LogoutButton />
          </div>
        </header>
        <div style={{ padding: '16px 14px 30px', flex: 1 }}>{children}</div>
        <div style={{ margin: '6px 0 20px', textAlign: 'center', fontSize: 11, color: '#9CA3AF' }}>SIMTERPADU · Portal Wali</div>
      </div>
    </div>
  );
}
