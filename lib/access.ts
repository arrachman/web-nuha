import { cache } from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { readSession, isSuperAdmin, type SessionPayload } from '@/lib/auth';

/**
 * Gate a page on the same menu/role grant that decides sidebar visibility, so a
 * hidden menu is genuinely unreachable rather than merely unlinked.
 */
export async function requirePage(menuKey: string): Promise<SessionPayload> {
  const session = await readSession();
  if (!session) redirect('/login');

  if (menuKey !== 'dashboard') {
    const granted = await prisma.menuRole.count({
      where: { menu: { key: menuKey }, role: { key: { in: session.peran } } },
    });
    if (granted === 0) redirect('/');
  }

  return session;
}

/**
 * Izin tingkat aksi (01-fondasi-auth-rbac-crud.md §3): beda lihat/ubah/hapus/
 * setujui DI DALAM satu menu, di atas requirePage() yang cuma sampai level menu.
 * Dimuat sekali per request request (React.cache) supaya menampilkan/menyembunyikan
 * banyak tombol tidak memicu satu query per tombol.
 */
const loadPermissionKeysForRoles = cache(async (peranKeys: string[]): Promise<Set<string>> => {
  if (peranKeys.length === 0) return new Set();
  const rows = await prisma.rolePermission.findMany({
    where: { role: { key: { in: peranKeys } } },
    select: { permission: { select: { key: true } } },
  });
  return new Set(rows.map((r) => r.permission.key));
});

/** true bila `session` (lewat salah satu perannya) memegang izin `permKey`. superadmin selalu lolos. */
export async function can(session: SessionPayload, permKey: string): Promise<boolean> {
  if (isSuperAdmin(session)) return true;
  const keys = await loadPermissionKeysForRoles(session.peran);
  return keys.has(permKey);
}

/**
 * Wajib dipanggil di setiap Server Action / route mutasi (bukan cukup
 * requirePage()): requirePage menjaga sidebar & halaman, requireAction menjaga
 * aksinya. Melempar Error, bukan redirect, karena biasa dipanggil dari
 * Server Action yang tidak selalu dalam konteks navigasi halaman.
 */
export async function requireAction(permKey: string): Promise<SessionPayload> {
  const session = await readSession();
  if (!session) throw new Error('Sesi tidak ditemukan, silakan masuk kembali.');
  if (!(await can(session, permKey))) {
    throw new Error(`Tidak punya izin "${permKey}" untuk melakukan aksi ini.`);
  }
  return session;
}
