'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { IkonMenu } from '@/components/atoms/IkonMenu';
import { Button } from '@/components/atoms/Button';
import { susunGrupMenu } from '@/lib/menu-grup';

type Menu = { key: string; label: string; icon: string | null };
type MasterGroup = { menuKey: string; label: string; icon: string | null; items: { key: string; label: string }[] };

const HREF_BY_KEY: Record<string, string> = {
  dashboard: '/', induk: '/induk', poskestren: '/poskestren', keuangan: '/keuangan', kurikulum: '/kurikulum', ujian: '/ujian', lms: '/lms', gaji: '/penggajian', wa: '/notifikasi', kunjungan: '/kunjungan-wali', ppdb: '/ppdb-panitia', laporan: '/laporan', pengaturan: '/pengaturan', kepegawaian: '/kepegawaian', data: '/data',
  rekrutmen: '/rekrutmen', sarpras: '/sarpras', perpustakaan: '/perpustakaan', siswa: '/siswa', santri: '/santri',
};

const TITLE_BY_PATH: Record<string, string> = {
  '/': 'Dashboard Yayasan', '/induk': 'Data Induk Santri', '/siswa': 'Daftar Siswa SMP & MA', '/santri': 'Daftar Santri Pondok Pesantren', '/poskestren': 'Poskestren', '/keuangan': 'Keuangan', '/kurikulum': 'Kurikulum', '/ujian': 'Ujian', '/lms': 'LMS & Kompetensi', '/penggajian': 'Penggajian', '/notifikasi': 'Notifikasi WhatsApp', '/kunjungan-wali': 'Kunjungan Wali', '/ppdb-panitia': 'PPDB 2026/2027 — Sisi Panitia', '/laporan': 'Laporan Rekap Bulanan', '/pengaturan': 'Pengaturan', '/kepegawaian': 'Kepegawaian', '/data': 'Master Data',
  '/rekrutmen': 'Rekrutmen', '/sarpras': 'Sarana & Prasarana', '/perpustakaan': 'Perpustakaan',
  '/perpustakaan/peminjaman': 'Peminjaman Buku', '/perpustakaan/pengembalian': 'Pengembalian Buku', '/perpustakaan/perpanjangan': 'Perpanjangan Pinjaman', '/perpustakaan/katalog': 'Katalog Buku', '/perpustakaan/label': 'Cetak Label Buku', '/perpustakaan/opname': 'Stock Opname', '/perpustakaan/anggota': 'Anggota Perpustakaan', '/perpustakaan/laporan': 'Laporan Perpustakaan', '/perpustakaan/pengaturan': 'Pengaturan Perpustakaan',
};

/**
 * Tautan ringkas di bawah menu modul baru — supaya fitur yang bukan tab
 * (halaman lapor kerusakan dari HP, halaman karir publik) terlihat di sidebar.
 * Hanya dirender saat menu induknya aktif, supaya sidebar tetap ringkas.
 */
const SUB_TAUTAN: Record<string, Array<{ href: string; label: string; grup?: string }>> = {
  sarpras: [{ href: '/lapor-kerusakan', label: 'Lapor Kerusakan' }, { href: '/sarpras?tab=peminjaman', label: 'Pinjam Aset / Ruang' }],
  rekrutmen: [{ href: '/karir', label: 'Halaman Karir Publik' }],
  keuangan: [
    { href: '/keuangan?tab=syariah', label: 'Syariah Bulanan', grup: 'Tagihan & Pembayaran' },
    { href: '/keuangan?tab=invoices', label: 'Invoice', grup: 'Tagihan & Pembayaran' },
    { href: '/keuangan?tab=spp', label: 'Riwayat SPP per Anak', grup: 'Tagihan & Pembayaran' },
    { href: '/keuangan?tab=kas', label: 'Kas & Pengeluaran', grup: 'Kas & Bank' },
    { href: '/keuangan?tab=transaksi', label: 'Riwayat Transaksi', grup: 'Kas & Bank' },
    { href: '/keuangan?tab=piutang', label: 'Piutang', grup: 'Piutang & Utang' },
    { href: '/keuangan?tab=tunggakan', label: 'Tunggakan', grup: 'Piutang & Utang' },
    { href: '/keuangan?tab=utang', label: 'Utang Pondok', grup: 'Piutang & Utang' },
    { href: '/keuangan?tab=utilitas', label: 'Utilitas', grup: 'Laporan & Rekap' },
    { href: '/keuangan?tab=rekap', label: 'Rekap Nama Santri', grup: 'Laporan & Rekap' },
    { href: '/keuangan?tab=triwulan', label: 'Laporan Triwulan', grup: 'Laporan & Rekap' },
  ],
  perpustakaan: [
    { href: '/perpustakaan', label: 'Beranda' },
    { href: '/perpustakaan/peminjaman', label: 'Peminjaman', grup: 'Sirkulasi' },
    { href: '/perpustakaan/pengembalian', label: 'Pengembalian', grup: 'Sirkulasi' },
    { href: '/perpustakaan/perpanjangan', label: 'Perpanjangan', grup: 'Sirkulasi' },
    { href: '/perpustakaan/katalog', label: 'Katalog Buku', grup: 'Koleksi' },
    { href: '/perpustakaan/label', label: 'Cetak Label', grup: 'Koleksi' },
    { href: '/perpustakaan/opname', label: 'Stock Opname', grup: 'Koleksi' },
    { href: '/perpustakaan/anggota', label: 'Anggota', grup: 'Administrasi' },
    { href: '/perpustakaan/laporan', label: 'Laporan', grup: 'Administrasi' },
    { href: '/perpustakaan/pengaturan', label: 'Pengaturan', grup: 'Administrasi' },
  ],
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

function Chevron({ open }: { open: boolean }) {
  return <svg className={`submenu-chevron ${open ? 'open' : ''}`} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="6 9 12 15 18 9" /></svg>;
}

/** Tab bawaan halaman bertab bila URL tanpa ?tab= (samakan dengan tabAktif di halamannya). */
const TAB_BAWAAN: Record<string, string> = { '/keuangan': 'syariah' };

/** Item submenu aktif? Tautan ?tab= dicocokkan dengan query tab saat ini —
 * sebelumnya tautan bertab tidak pernah tersorot sama sekali. */
function subAktif(href: string, pathname: string, tabParam: string | null, hrefInduk: string): boolean {
  const [path, query] = href.split('?');
  const tabHref = query ? new URLSearchParams(query).get('tab') : null;
  if (tabHref) return pathname === path && (tabParam === tabHref || (tabParam === null && TAB_BAWAAN[path] === tabHref));
  if (path === hrefInduk) return pathname === path;
  return pathname === path || pathname.startsWith(`${path}/`);
}

type SubItem = { href: string; label: string; grup?: string };
type SubGrup = { grup: string | null; items: SubItem[] };

/** Kelompokkan item submenu berurutan menurut field grup-nya. */
function grupkanSub(sub: SubItem[]): SubGrup[] {
  const hasil: SubGrup[] = [];
  for (const t of sub) {
    const g = t.grup ?? null;
    const terakhir = hasil[hasil.length - 1];
    if (terakhir && terakhir.grup === g) terakhir.items.push(t);
    else hasil.push({ grup: g, items: [t] });
  }
  return hasil;
}

/** Pemintal kecil di item yang diklik selagi halamannya dimuat (useLinkStatus
 * hanya hidup di dalam Link). Muncul seketika, hilang saat navigasi commit. */
function PenandaMenu() {
  const { pending } = useLinkStatus();
  return pending ? <span className="navpending" aria-hidden /> : null;
}

export function StaffNavigation({ menus, masterGroups }: { menus: Menu[]; masterGroups: MasterGroup[] }) {
  const pathname = usePathname();
  const tabParam = useSearchParams().get('tab');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleGroup = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  const [subTutup, setSubTutup] = useState<Record<string, boolean>>({});
  const [grupTutup, setGrupTutup] = useState<Record<string, boolean>>({});
  return <nav className="menu">{susunGrupMenu(menus).map((grup) => <div key={grup.label ?? 'utama'} className="menugrup">
    {grup.label && <div className="menugrup-label">{grup.label}</div>}
    {grup.items.map((menu) => {
    const href = HREF_BY_KEY[menu.key];
    const isMaster = menu.key === 'data';
    const isActive = menuAktif(menu.key, href, pathname) || (isMaster && pathname.startsWith('/data/'));
    const sub = SUB_TAUTAN[menu.key];
    const punyaSub = Boolean(sub) || isMaster;
    const subOpen = isActive && !subTutup[menu.key];
    return <div key={menu.key} className="menuwrap">
      <Link href={href} className={`menuitem ${isActive ? 'active' : ''} ${subOpen ? 'terbuka' : ''} ${punyaSub && isActive ? 'punya-sub' : ''}`}><IkonMenu menuKey={menu.key} path={menu.icon} /><span className="menulabel">{isMaster ? 'Master Data' : menu.label}</span><PenandaMenu /></Link>
      {punyaSub && isActive && <button type="button" className="menutoggle" aria-expanded={subOpen} aria-label={`${subOpen ? 'Lipat' : 'Buka'} submenu ${isMaster ? 'Master Data' : menu.label}`} onClick={() => setSubTutup((prev) => ({ ...prev, [menu.key]: subOpen }))}><Chevron open={subOpen} /></button>}
      {sub && subOpen && <div className="submenu" data-testid={`submenu-${menu.key}`}>
        {grupkanSub(sub).map((g) => {
          const gKey = `${menu.key}:${g.grup ?? '-'}`;
          const gOpen = !grupTutup[gKey];
          return <div key={gKey} className="submenu-grup">
            {g.grup && <button type="button" className="submenu-grup-head" aria-expanded={gOpen} onClick={() => setGrupTutup((prev) => ({ ...prev, [gKey]: gOpen }))}><span className="submenu-heading-label">{g.grup}</span><Chevron open={gOpen} /></button>}
            <div className={`submenu-items ${gOpen ? 'open' : ''}`}>
              <div className="submenu-items-inner">
                {g.items.map((t) => <Link key={t.href} href={t.href} className={`submenuitem ${subAktif(t.href, pathname, tabParam, href) ? 'active' : ''}`}>{t.label}<PenandaMenu /></Link>)}
              </div>
            </div>
          </div>;
        })}
      </div>}
      {isMaster && subOpen && <div className="submenu">
        {masterGroups.map((group) => {
          const isGroupOpen = !collapsed[group.menuKey];
          return <div className="submenu-group" key={group.menuKey}>
            <Button varian="polos" type="button" className="submenu-heading" aria-expanded={isGroupOpen} onClick={() => toggleGroup(group.menuKey)}>
              <IkonMenu menuKey={group.menuKey} path={group.icon} size={13} />
              <span className="submenu-heading-label">{group.label}</span>
              <svg className={`submenu-chevron ${isGroupOpen ? 'open' : ''}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </Button>
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
