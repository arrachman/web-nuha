'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { IkonMenu } from '@/components/atoms/IkonMenu';
import { susunGrupMenu } from '@/lib/menu-grup';

type Menu = { key: string; label: string; icon: string | null };
type MasterGroup = { menuKey: string; label: string; icon: string | null; items: { key: string; label: string }[] };

const HREF_BY_KEY: Record<string, string> = {
  dashboard: '/', induk: '/induk', pesantren: '/kepesantrenan', poskestren: '/poskestren', keuangan: '/keuangan', akademik: '/akademik', kurikulum: '/kurikulum', ujian: '/ujian', lms: '/lms', gaji: '/penggajian', wa: '/notifikasi', kunjungan: '/kunjungan-wali', ppdb: '/ppdb-panitia', laporan: '/laporan', pengaturan: '/pengaturan', kepegawaian: '/kepegawaian', data: '/data',
  rekrutmen: '/rekrutmen', sarpras: '/sarpras', presensi: '/presensi', perpustakaan: '/perpustakaan',
};

const TITLE_BY_PATH: Record<string, string> = {
  '/': 'Dashboard Yayasan', '/induk': 'Data Induk Santri', '/kepesantrenan': 'Kepesantrenan', '/poskestren': 'Poskestren', '/keuangan': 'Keuangan', '/akademik': 'Akademik', '/kurikulum': 'Kurikulum', '/ujian': 'Ujian', '/lms': 'LMS & Kompetensi', '/penggajian': 'Penggajian', '/notifikasi': 'Notifikasi WhatsApp', '/kunjungan-wali': 'Kunjungan Wali', '/ppdb-panitia': 'PPDB 2026/2027 — Sisi Panitia', '/laporan': 'Laporan Rekap Bulanan', '/pengaturan': 'Pengaturan', '/kepegawaian': 'Kepegawaian', '/data': 'Master Data',
  '/rekrutmen': 'Rekrutmen', '/sarpras': 'Sarana & Prasarana', '/presensi': 'Presensi', '/perpustakaan': 'Perpustakaan',
};

/**
 * Tautan ringkas di bawah menu modul baru — supaya fitur yang bukan tab
 * (halaman lapor kerusakan dari HP, halaman karir publik) terlihat di sidebar.
 * Hanya dirender saat menu induknya aktif, supaya sidebar tetap ringkas.
 */
const SUB_TAUTAN: Record<string, Array<{ href: string; label: string }>> = {
  sarpras: [{ href: '/lapor-kerusakan', label: 'Lapor Kerusakan' }, { href: '/sarpras?tab=peminjaman', label: 'Pinjam Aset / Ruang' }],
  presensi: [{ href: '/presensi?tab=saya', label: 'Presensi Saya' }],
  rekrutmen: [{ href: '/karir', label: 'Halaman Karir Publik' }],
};

/** Halaman di luar prefiks menu yang tetap menyorot menu induknya. */
const ALIAS_AKTIF: Record<string, string[]> = { sarpras: ['/lapor-kerusakan'], rekrutmen: ['/karir'] };

function menuAktif(key: string, href: string, pathname: string): boolean {
  if (href === pathname) return true;
  if (href !== '/' && pathname.startsWith(`${href}/`)) return true;
  return (ALIAS_AKTIF[key] ?? []).some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function judulHalaman(pathname: string): string {
  if (pathname.startsWith('/data/')) return 'Master Data';
  if (TITLE_BY_PATH[pathname]) return TITLE_BY_PATH[pathname];
  if (pathname.startsWith('/lapor-kerusakan')) return 'Lapor Kerusakan';
  const induk = Object.keys(TITLE_BY_PATH).find((p) => p !== '/' && pathname.startsWith(`${p}/`));
  return induk ? TITLE_BY_PATH[induk] : 'SIMTERPADU';
}

/** Pemintal kecil di item yang diklik selagi halamannya dimuat (useLinkStatus
 * hanya hidup di dalam Link). Muncul seketika, hilang saat navigasi commit. */
function PenandaMenu() {
  const { pending } = useLinkStatus();
  return pending ? <span className="navpending" aria-hidden /> : null;
}

export function StaffNavigation({ menus, masterGroups }: { menus: Menu[]; masterGroups: MasterGroup[] }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleGroup = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  return <nav className="menu">{susunGrupMenu(menus).map((grup) => <div key={grup.label ?? 'utama'} className="menugrup">
    {grup.label && <div className="menugrup-label">{grup.label}</div>}
    {grup.items.map((menu) => {
    const href = HREF_BY_KEY[menu.key];
    const isMaster = menu.key === 'data';
    const isActive = menuAktif(menu.key, href, pathname) || (isMaster && pathname.startsWith('/data/'));
    const sub = SUB_TAUTAN[menu.key];
    return <div key={menu.key} className="menuwrap">
      <Link href={href} className={`menuitem ${isActive ? 'active' : ''}`}><IkonMenu menuKey={menu.key} path={menu.icon} /><span className="menulabel">{isMaster ? 'Master Data' : menu.label}</span><PenandaMenu /></Link>
      {sub && isActive && <div className="submenu" data-testid={`submenu-${menu.key}`}>
        {sub.map((t) => <Link key={t.href} href={t.href} className={`submenuitem ${pathname === t.href.split('?')[0] && !t.href.includes('?') ? 'active' : ''}`}>{t.label}<PenandaMenu /></Link>)}
      </div>}
      {isMaster && isActive && <div className="submenu">
        {masterGroups.map((group) => {
          const isGroupOpen = !collapsed[group.menuKey];
          return <div className="submenu-group" key={group.menuKey}>
            <button type="button" className="submenu-heading" aria-expanded={isGroupOpen} onClick={() => toggleGroup(group.menuKey)}>
              <IkonMenu menuKey={group.menuKey} path={group.icon} size={13} />
              <span className="submenu-heading-label">{group.label}</span>
              <svg className={`submenu-chevron ${isGroupOpen ? 'open' : ''}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            <div className={`submenu-items ${isGroupOpen ? 'open' : ''}`}>
              <div className="submenu-items-inner">
                {group.items.map((item) => <Link key={item.key} href={`/data/${item.key}`} className={`submenuitem ${pathname === `/data/${item.key}` ? 'active' : ''}`}>{item.label}<PenandaMenu /></Link>)}
              </div>
            </div>
          </div>;
        })}
      </div>}
    </div>;
    })}
  </div>)}</nav>;
}

export function StaffTitle() {
  const pathname = usePathname();
  const title = judulHalaman(pathname);
  return <h2 className="judul">{title}</h2>;
}
