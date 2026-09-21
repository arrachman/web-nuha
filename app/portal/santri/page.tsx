import Link from 'next/link';
import { requirePage } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { LogoutButton } from '@/components/LogoutButton';
import { avaBg, inisial } from '@/components';
import { TabBeranda } from './tabs/TabBeranda';
import { TabPengumuman } from './tabs/TabPengumuman';
import { TabJadwal } from './tabs/TabJadwal';
import { TabDiniyah } from './tabs/TabDiniyah';
import { TabLms } from './tabs/TabLms';
import { TabTugas } from './tabs/TabTugas';
import { TabHafalan } from './tabs/TabHafalan';
import { TabIzin } from './tabs/TabIzin';
import { TabBayar } from './tabs/TabBayar';
import { TabKartu } from './tabs/TabKartu';
import { TabUjian } from './tabs/TabUjian';

const TABS = [
  { key: 'beranda', label: 'Beranda' },
  { key: 'pengumuman', label: 'Pengumuman' },
  { key: 'jadwal', label: 'Jadwal' },
  { key: 'diniyah', label: 'Diniyah & Harian' },
  { key: 'lms', label: 'LMS' },
  { key: 'tugas', label: 'Tugas' },
  { key: 'ujian', label: 'Ujian CBT' },
  { key: 'hafalan', label: 'Hafalan' },
  { key: 'izin', label: 'Izin' },
  { key: 'bayar', label: 'Bayar' },
  { key: 'kartu', label: 'Kartu Santri' },
];

/**
 * Portal Santri — semua data diambil dari sesi login santri sendiri, tidak
 * pernah dari parameter query. Read-only kecuali pengajuan izin.
 */
export default async function PortalSantriPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requirePage('portal-santri');
  const sp = await searchParams;
  const tabRaw = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tabAktif = TABS.some((t) => t.key === tabRaw) ? (tabRaw as string) : TABS[0].key;
  const hariRaw = Array.isArray(sp.hari) ? sp.hari[0] : sp.hari;

  const user = await prisma.user.findUnique({
    where: { id: BigInt(session.userId) },
    include: { person: { include: { santri: { include: { unit: true, kelas: true, room: { include: { dormitory: true } } } } } } },
  });
  const santri = user?.person.santri;

  if (!santri) {
    return (
      <PortalFrame nama={session.nama} info="-">
        <div className="card">Akun ini belum tertaut ke data santri. Hubungi kantor pondok.</div>
      </PortalFrame>
    );
  }

  const akuInfo = `${santri.unit?.nama ?? '-'} · Kelas ${santri.kelas?.nama ?? '-'}`;

  return (
    <PortalFrame nama={user!.person.fullName} info={`${akuInfo} · NIS ${santri.nis}`}>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', padding: '16px 0 18px' }}>
        {TABS.map((t) => (
          <Link key={t.key} href={`/portal/santri${t.key === TABS[0].key ? '' : `?tab=${t.key}`}`} className={`tab ${t.key === tabAktif ? 'active' : ''}`} style={{ whiteSpace: 'nowrap' }}>
            {t.label}
          </Link>
        ))}
      </div>

      {tabAktif === 'beranda' && <TabBeranda santri={santri} />}
      {tabAktif === 'pengumuman' && <TabPengumuman />}
      {tabAktif === 'jadwal' && <TabJadwal kelas={santri.kelas?.nama ?? ''} hariAktif={hariRaw} />}
      {tabAktif === 'diniyah' && <TabDiniyah kelas={santri.kelas?.nama ?? ''} />}
      {tabAktif === 'lms' && <TabLms />}
      {tabAktif === 'tugas' && <TabTugas />}
      {tabAktif === 'ujian' && <TabUjian santriId={santri.id} />}
      {tabAktif === 'hafalan' && <TabHafalan santri={santri} />}
      {tabAktif === 'izin' && <TabIzin santriId={santri.id} />}
      {tabAktif === 'bayar' && <TabBayar santriId={santri.id} />}
      {tabAktif === 'kartu' && <TabKartu santri={santri} nama={user!.person.fullName} />}

      <div style={{ marginTop: 22, textAlign: 'center', fontSize: 11.5, color: '#9CA3AF' }}>SIMTERPADU · Portal Santri diakses dari anjungan komputer pondok</div>
      <div style={{ height: 70 }} />

      <div style={{ position: 'fixed', bottom: 18, left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', gap: 6, padding: '9px 10px', borderRadius: 20, background: 'rgba(250,248,243,.9)', backdropFilter: 'blur(10px)', border: '1px solid #E8E3D9', boxShadow: '0 12px 32px rgba(10,74,43,.18)', maxWidth: '94vw', overflowX: 'auto' }}>
        {TABS.map((t) => (
          <Link key={t.key} href={`/portal/santri${t.key === TABS[0].key ? '' : `?tab=${t.key}`}`} title={t.label} style={{ padding: '7px 10px', borderRadius: 12, border: 'none', background: t.key === tabAktif ? '#0F6B3D' : 'transparent', color: t.key === tabAktif ? '#FAF8F3' : '#0A4A2B', fontSize: 9.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
            {t.label}
          </Link>
        ))}
      </div>
    </PortalFrame>
  );
}

function PortalFrame({ nama, info, children }: { nama: string; info: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#EDF3EF', padding: '0 0 40px' }}>
      <header style={{ background: 'linear-gradient(180deg, #4E8F72 0%, #5C9C7D 52%, #74B092 100%)', color: '#F3F1E9', padding: '20px 26px 26px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase', color: 'rgba(243,241,233,.7)' }}>Portal Santri · Anjungan Mandiri Pondok</div>
            <LogoutButton />
          </div>
          <div style={{ display: 'flex', gap: 15, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: 58, height: 58, borderRadius: 17, background: avaBg(nama), color: '#FFF', display: 'grid', placeItems: 'center', fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-lora), serif', border: '2px solid rgba(232,151,58,.6)' }}>{inisial(nama)}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 22, fontWeight: 600 }}>{nama}</div>
              <div style={{ fontSize: 12.5, color: 'rgba(243,241,233,.78)', marginTop: 3 }}>{info}</div>
            </div>
          </div>
        </div>
      </header>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 26px' }}>{children}</div>
    </div>
  );
}
