import Link from 'next/link';
import Image from 'next/image';
import type { SessionPayload } from '@/lib/auth';
import { LogoutButton } from '@/components/LogoutButton';
import { PemilihPeran } from '@/components/PemilihPeran';
import { inisial } from '@/components/utils/format';
import { StaffNavigation, StaffTitle } from '@/components/templates/StaffNavigation';

type Menu = { key: string; label: string; icon: string | null };
type MasterGroup = { menuKey: string; label: string; icon: string | null; items: { key: string; label: string }[] };

export function StaffShell({ session, menus, masterGroups, ticker, showRolePicker, children }: { session: SessionPayload; menus: Menu[]; masterGroups: MasterGroup[]; ticker: string[]; showRolePicker: boolean; children: React.ReactNode }) {
  const peranUtama = session.peran[0] ?? 'pengguna';
  const menyamar = Boolean(session.peranAsli);

  return <div className="shell">
    <aside className="sidebar">
      <div className="sidehead"><span className="tile"><Image src="/assets/logo-nuha.webp" alt="" width={34} height={34} /></span><span style={{ minWidth: 0 }}><span className="nama" style={{ display: 'block' }}>SIMTERPADU</span><span className="sub" style={{ display: 'block' }}>NURUL HUDA MERGOSONO</span></span></div>
      <StaffNavigation menus={menus} masterGroups={masterGroups} />
      <div className="sidefoot"><div className="userchip"><span className="ava">{inisial(session.nama)}</span><span style={{ minWidth: 0 }}><span className="nm" style={{ display: 'block' }}>{session.nama}</span><span className="rl" style={{ display: 'block' }}>{peranUtama}</span></span></div><Link href="/docs" className="btn-ghost-terang" style={{ display: 'block', textAlign: 'center', color: '#f3f1e9' }}>Panduan</Link><LogoutButton /></div>
    </aside>
    <main className="main"><header className="topbar"><div style={{ flex: 1, minWidth: 180 }}><StaffTitle />{ticker.length > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}><span className="pill-agenda">Agenda</span><div className="mq"><div className="mqtrack">{[...ticker, ...ticker].map((teks, i) => <span key={i} style={{ fontSize: 12, color: 'var(--teks-lembut)' }}>{teks}</span>)}</div></div></div>}</div>{showRolePicker && <PemilihPeran session={session} />}<p className="muted" style={{ margin: 0 }}>Tahun Ajaran 2026/2027 · Semester Gasal</p></header><div className="pad">{menyamar && <div className="alert alert-peringatan" style={{ marginBottom: 14 }}>Mode debug: Anda melihat aplikasi sebagai <b>{peranUtama}</b>. Data dan menu mengikuti peran itu — pilih &ldquo;Super admin&rdquo; di kanan atas untuk kembali.</div>}{children}</div></main>
  </div>;
}
