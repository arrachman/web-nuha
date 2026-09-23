'use server';

import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/auth';
import { requireAction } from '@/lib/access';
import { recordAudit } from '@/lib/audit';
import { jalankanAksi, teks, wajib } from '@/lib/aksi-form';

const OPSI = { bawaan: '/pengaturan', prefiks: ['/pengaturan'], revalidate: ['/pengaturan'] };
const HURUF = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

/**
 * Reset sandi oleh admin (01 §2.2): sandi sementara acak, wajib diganti di
 * login berikutnya, dan seluruh sesi lama dicabut (sessionVersion naik).
 * Mengembalikan sandi sementara SEKALI ke layar admin — tidak lewat URL/log.
 */
export async function resetSandiPengguna(fd: FormData): Promise<{ ok: boolean; pesan: string; sandi?: string }> {
  let session;
  try { session = await requireAction('pengaturan.update'); } catch (e) { return { ok: false, pesan: e instanceof Error ? e.message : 'Tidak berwenang.' }; }
  const id = BigInt(String(fd.get('id') ?? '0'));
  const user = await prisma.user.findUnique({ where: { id }, include: { person: true, roles: { include: { role: true } } } });
  if (!user) return { ok: false, pesan: 'Pengguna tidak ditemukan.' };
  if (user.roles.some((r) => r.role.key === 'superadmin') && !isSuperAdmin(session)) return { ok: false, pesan: 'Sandi super admin hanya bisa direset oleh super admin.' };
  const sandi = Array.from({ length: 10 }, () => HURUF[randomInt(HURUF.length)]).join('') + randomInt(10, 99);
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(sandi, 12), mustChangePassword: true, passwordChangedAt: new Date(), sessionVersion: { increment: 1 } },
  });
  await recordAudit({ aksi: 'RESET_SANDI', entitas: 'user', entitasId: String(id), ringkasan: `Sandi ${user.person.fullName} direset admin; sesi lama dicabut, wajib ganti sandi.`, aktor: { id: session.userId, nama: session.nama } });
  revalidatePath('/pengaturan');
  return { ok: true, pesan: `Sandi ${user.person.fullName} direset. Sampaikan sandi sementara ini secara langsung — hanya ditampilkan sekali.`, sandi };
}

/** Aktif/nonaktifkan akun — menonaktifkan juga mencabut sesi yang sedang berjalan. */
export async function aturAktifPengguna(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('pengaturan.update');
    const id = BigInt(wajib(fd, 'id', 'ID'));
    if (String(id) === session.userId) throw new Error('Tidak bisa menonaktifkan akun sendiri.');
    const user = await prisma.user.findUniqueOrThrow({ where: { id }, include: { person: true } });
    const aktif = teks(fd, 'aktif') === '1';
    await prisma.user.update({ where: { id }, data: { aktif, sessionVersion: { increment: 1 } } });
    await recordAudit({ aksi: aktif ? 'AKUN_AKTIFKAN' : 'AKUN_NONAKTIFKAN', entitas: 'user', entitasId: String(id), ringkasan: `Akun ${user.person.fullName} ${aktif ? 'diaktifkan' : 'dinonaktifkan (sesi dicabut)'}.`, aktor: { id: session.userId, nama: session.nama } });
    return `Akun ${user.person.fullName} ${aktif ? 'diaktifkan' : 'dinonaktifkan'}.`;
  }, OPSI);
}

/**
 * Matriks peran × izin untuk satu modul (01 §3, 05): kotak yang dicentang
 * menjadi RolePermission, sisanya dicabut. Peran superadmin tidak diubah
 * (selalu lolos lewat isSuperAdmin). Perubahan dicatat diff-nya di audit.
 */
export async function simpanMatriksIzin(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('pengaturan.update');
    const menuKey = wajib(fd, 'menuKey', 'Modul');
    const izin = await prisma.permission.findMany({ where: { menuKey } });
    if (!izin.length) throw new Error('Modul tidak dikenal.');
    const roles = await prisma.role.findMany({ where: { key: { notIn: ['superadmin'] } } });
    const roleIds = new Set(roles.map((r) => r.id));
    const izinIds = new Set(izin.map((p) => p.id));
    const dicentang = new Set(fd.getAll('rp').map(String).filter((v) => {
      const [p, r] = v.split(':').map(Number);
      return izinIds.has(p) && roleIds.has(r);
    }));
    const lama = await prisma.rolePermission.findMany({ where: { permissionId: { in: [...izinIds] }, roleId: { in: [...roleIds] } } });
    const lamaSet = new Set(lama.map((x) => `${x.permissionId}:${x.roleId}`));
    const tambah = [...dicentang].filter((k) => !lamaSet.has(k));
    const cabut = [...lamaSet].filter((k) => !dicentang.has(k));
    await prisma.$transaction([
      ...cabut.map((k) => { const [p, r] = k.split(':').map(Number); return prisma.rolePermission.delete({ where: { roleId_permissionId: { roleId: r, permissionId: p } } }); }),
      ...tambah.map((k) => { const [p, r] = k.split(':').map(Number); return prisma.rolePermission.create({ data: { roleId: r, permissionId: p } }); }),
    ]);
    const nama = (k: string) => { const [p, r] = k.split(':').map(Number); return `${roles.find((x) => x.id === r)?.key}→${izin.find((x) => x.id === p)?.key}`; };
    await recordAudit({
      aksi: 'IZIN_MATRIKS_UBAH', entitas: 'role_permissions', entitasId: menuKey,
      ringkasan: `Matriks izin ${menuKey}: +${tambah.length} / -${cabut.length}.`,
      perubahan: { ditambah: tambah.map(nama), dicabut: cabut.map(nama) },
      aktor: { id: session.userId, nama: session.nama },
    });
    return `Matriks izin ${menuKey} tersimpan (+${tambah.length}, -${cabut.length}). Berlaku pada request berikutnya pengguna terkait.`;
  }, OPSI);
}
