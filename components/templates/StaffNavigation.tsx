'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { IkonMenu } from '@/components/atoms/IkonMenu';

type Menu = { key: string; label: string; icon: string | null };
type MasterGroup = { menuKey: string; label: string; icon: string | null; items: { key: string; label: string }[] };

const HREF_BY_KEY: Record<string, string> = {
  dashboard: '/', induk: '/induk', pesantren: '/kepesantrenan', poskestren: '/poskestren', keuangan: '/keuangan', akademik: '/akademik', kurikulum: '/kurikulum', ujian: '/ujian', lms: '/lms', gaji: '/penggajian', wa: '/notifikasi', kunjungan: '/kunjungan-wali', ppdb: '/ppdb-panitia', laporan: '/laporan', pengaturan: '/pengaturan', kepegawaian: '/kepegawaian', data: '/data',
};

const TITLE_BY_PATH: Record<string, string> = {
  '/': 'Dashboard Yayasan', '/induk': 'Data Induk Santri', '/kepesantrenan': 'Kepesantrenan', '/poskestren': 'Poskestren', '/keuangan': 'Keuangan', '/akademik': 'Akademik', '/kurikulum': 'Kurikulum', '/ujian': 'Ujian', '/lms': 'LMS & Kompetensi', '/penggajian': 'Penggajian', '/notifikasi': 'Notifikasi WhatsApp', '/kunjungan-wali': 'Kunjungan Wali', '/ppdb-panitia': 'PPDB 2026/2027 — Sisi Panitia', '/laporan': 'Laporan Rekap Bulanan', '/pengaturan': 'Pengaturan', '/kepegawaian': 'Kepegawaian', '/data': 'Master Data',
};

export function StaffNavigation({ menus, masterGroups }: { menus: Menu[]; masterGroups: MasterGroup[] }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleGroup = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  return <nav className="menu">{menus.map((menu) => {
    const href = HREF_BY_KEY[menu.key];
    const isMaster = menu.key === 'data';
    const isActive = href === pathname || (isMaster && pathname.startsWith('/data/'));
    return <div key={menu.key} className="menuwrap">
      <Link href={href} className={`menuitem ${isActive ? 'active' : ''}`}><IkonMenu menuKey={menu.key} path={menu.icon} /><span className="menulabel">{isMaster ? 'Master Data' : menu.label}</span></Link>
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
                {group.items.map((item) => <Link key={item.key} href={`/data/${item.key}`} className={`submenuitem ${pathname === `/data/${item.key}` ? 'active' : ''}`}>{item.label}</Link>)}
              </div>
            </div>
          </div>;
        })}
      </div>}
    </div>;
  })}</nav>;
}

export function StaffTitle() {
  const pathname = usePathname();
  const title = pathname.startsWith('/data/') ? 'Master Data' : (TITLE_BY_PATH[pathname] ?? 'SIMTERPADU');
  return <h2 className="judul">{title}</h2>;
}
