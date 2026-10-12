import { redirect } from 'next/navigation';
import { readSession, isSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { daftarMaster } from '@/lib/crud/daftar';
import { getUnitAktifKey } from '@/lib/unit-scope';
import { StaffShell } from '@/components/templates/StaffShell';

export default async function StafLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect('/login');

  const [menus, agenda, { persona, kelompok }] = await Promise.all([
    prisma.menuItem.findMany({
      where: { roles: { some: { role: { key: { in: session.peran } } } } },
      orderBy: { order: 'asc' },
    }),
    prisma.agenda.findMany({ orderBy: { date: 'asc' }, take: 6 }),
    daftarMaster(session.peran),
  ]);
  const masterGroups = [persona, ...kelompok].filter((group) => group.items.length > 0);

  const MENU_DISEMBUNYIKAN = new Set([
    'kurikulum', 'poskestren', 'lms', 'gaji', 'ujian',
    'kunjungan', 'ppdb', 'laporan',
    // Modul baru (rekrutmen, sarpras) sudah dilepas — semuanya tampil
    // di sidebar sesuai menu_roles (patch 07-persiapan-development §9).
  ]);
  const HREF_KNOWN = new Set([
    'dashboard', 'induk', 'poskestren', 'keuangan', 'kurikulum', 'ujian',
    'lms', 'gaji', 'wa', 'kunjungan', 'ppdb', 'laporan', 'pengaturan', 'kepegawaian', 'data',
    'rekrutmen', 'sarpras', 'perpustakaan', 'siswa', 'santri',
  ]);
  // Menu Siswa & Santri bersifat kontekstual (permintaan user): hanya tampil
  // bila PemilihUnit global sedang mengunci unit yang sesuai — Siswa untuk
  // SMP/MA, Santri untuk Pondok. Di luar itu (Semua Unit atau unit lain)
  // keduanya disembunyikan walau peran memilikinya.
  const unitKey = await getUnitAktifKey(session);
  const menuSesuaiUnit = (key: string): boolean =>
    key === 'siswa' ? unitKey === 'SMP' || unitKey === 'MA'
    : key === 'santri' ? unitKey === 'Pondok'
    : true;
  const visible = menus
    .filter((menu) => HREF_KNOWN.has(menu.key) && !MENU_DISEMBUNYIKAN.has(menu.key) && menuSesuaiUnit(menu.key))
    .map((menu) => ({ key: menu.key, label: menu.label, icon: menu.icon }));

  const ticker = agenda.map((a) => {
    const date = a.date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    return `${date} · ${a.title}${a.unit ? ` — ${a.unit}` : ''}`;
  });

  return (
    <StaffShell
      session={session}
      menus={visible}
      masterGroups={masterGroups}
      ticker={ticker}
      showRolePicker={isSuperAdmin(session)}
    >
      {children}
    </StaffShell>
  );
}
