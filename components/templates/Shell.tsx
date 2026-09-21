import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin, type SessionPayload } from '@/lib/auth';
import { LogoutButton } from '@/components/LogoutButton';
import { PemilihPeran } from '@/components/PemilihPeran';
import { inisial } from '@/components/utils/format';
import { IkonMenu } from '@/components/atoms/IkonMenu';

const HREF_BY_KEY: Record<string, string> = {
  dashboard: '/',
  induk: '/induk',
  pesantren: '/kepesantrenan',
  poskestren: '/poskestren',
  keuangan: '/keuangan',
  akademik: '/akademik',
  kurikulum: '/kurikulum',
  ujian: '/ujian',
  lms: '/lms',
  gaji: '/penggajian',
  wa: '/notifikasi',
  kunjungan: '/kunjungan-wali',
  ppdb: '/ppdb-panitia',
  laporan: '/laporan',
  pengaturan: '/pengaturan',
  kepegawaian: '/kepegawaian',
  'portal-santri': '/portal/santri',
  'portal-wali': '/portal/wali',
  data: '/data',
};

/**
 * Menu yang untuk sementara disembunyikan dari sidebar atas permintaan client
 * (modulnya belum siap dipakai operator). Halaman & `requirePage` sengaja tidak
 * disentuh — ini semata penyembunyian navigasi, bukan pencabutan hak akses.
 * Hapus kuncinya dari sini untuk memunculkan kembali.
 */
const MENU_DISEMBUNYIKAN = new Set([
  'kurikulum', 'poskestren', 'keuangan', 'lms', 'gaji', 'ujian',
  'kunjungan', 'ppdb', 'laporan',
]);

export { IkonMenu };

export async function Shell({ session, active, title, children }: { session: SessionPayload; active: string; title: string; children: React.ReactNode }) {
  const [menus, agenda] = await Promise.all([
    prisma.menuItem.findMany({
      where: { roles: { some: { role: { key: { in: session.peran } } } } },
      orderBy: { order: 'asc' },
    }),
    prisma.agenda.findMany({ orderBy: { date: 'asc' }, take: 6 }),
  ]);
  const visible = menus.filter((menu) => HREF_BY_KEY[menu.key] && !MENU_DISEMBUNYIKAN.has(menu.key));
  const peranUtama = session.peran[0] ?? 'pengguna';
  const menyamar = Boolean(session.peranAsli);

  const ticker = agenda.map((a) => {
    const date = a.date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    return `${date} · ${a.title}${a.unit ? ` — ${a.unit}` : ''}`;
  });

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidehead">
          <span className="tile">
            <Image src="/assets/logo-nuha.webp" alt="" width={34} height={34} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span className="nama" style={{ display: 'block' }}>SIMTERPADU</span>
            <span className="sub" style={{ display: 'block' }}>NURUL HUDA MERGOSONO</span>
          </span>
        </div>

        <nav className="menu">
          {visible.map((menu) => (
            <Link key={menu.key} href={HREF_BY_KEY[menu.key]} className={`menuitem ${menu.key === active ? 'active' : ''}`}>
              <IkonMenu menuKey={menu.key} path={menu.icon} />
              <span className="menulabel">{menu.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidefoot">
          <div className="userchip">
            <span className="ava">{inisial(session.nama)}</span>
            <span style={{ minWidth: 0 }}>
              <span className="nm" style={{ display: 'block' }}>{session.nama}</span>
              <span className="rl" style={{ display: 'block' }}>{peranUtama}</span>
            </span>
          </div>
          <Link href="/docs" className="btn-ghost-terang" style={{ display: 'block', textAlign: 'center', color: '#f3f1e9' }}>
            Panduan
          </Link>
          <LogoutButton />
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div style={{ flex: 1, minWidth: 180 }}>
            <h2 className="judul">{title}</h2>
            {ticker.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span className="pill-agenda">Agenda</span>
                <div className="mq">
                  <div className="mqtrack">
                    {[...ticker, ...ticker].map((teks, i) => (
                      <span key={i} style={{ fontSize: 12, color: 'var(--teks-lembut)' }}>{teks}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          {isSuperAdmin(session) && <PemilihPeran session={session} />}
          <p className="muted" style={{ margin: 0 }}>Tahun Ajaran 2026/2027 · Semester Gasal</p>
        </header>
        <div className="pad">
          {menyamar && (
            <div className="alert alert-peringatan" style={{ marginBottom: 14 }}>
              Mode debug: Anda melihat aplikasi sebagai <b>{peranUtama}</b>. Data dan menu mengikuti peran itu — pilih
              &ldquo;Super admin&rdquo; di kanan atas untuk kembali.
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
