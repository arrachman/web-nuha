'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createSession, isSuperAdmin, readSession, PERAN_SUPERADMIN } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';

/**
 * Super admin boleh melihat aplikasi persis seperti peran lain untuk keperluan
 * debugging. Peran aslinya disimpan terpisah di sesi sehingga penyamaran selalu
 * bisa dibatalkan, dan setiap pergantian tercatat di audit log.
 */
export async function gantiPeran(formData: FormData): Promise<void> {
  const session = await readSession();
  if (!session || !isSuperAdmin(session)) {
    // Bukan sekadar UI tersembunyi: server menolak permintaan dari siapa pun
    // yang peran aslinya bukan super admin.
    throw new Error('Hanya super admin yang boleh mengganti peran.');
  }

  const asli = session.peranAsli ?? session.peran;
  const target = String(formData.get('peran') ?? '').trim();

  if (!target || target === PERAN_SUPERADMIN) {
    await createSession({ userId: session.userId, nama: session.nama, email: session.email, peran: asli });
  } else {
    const peran = await prisma.role.findUnique({ where: { key: target } });
    if (!peran) throw new Error('Peran tidak dikenal.');
    await createSession({
      userId: session.userId,
      nama: session.nama,
      email: session.email,
      peran: [peran.key],
      peranAsli: asli,
    });
  }

  await recordAudit({
    aksi: 'GANTI_PERAN',
    entitas: 'user',
    entitasId: session.userId,
    ringkasan: `${session.nama} beralih ke peran ${target || PERAN_SUPERADMIN}`,
    perubahan: { dari: session.peran, ke: target || asli },
    aktor: { id: session.userId, nama: session.nama },
  });

  revalidatePath('/', 'layout');
  // Sidebar dan menu ikut berubah, sedangkan halaman saat ini bisa saja tidak
  // boleh diakses peran baru. Kembalikan ke beranda agar gate berjalan normal
  // dan cache router tidak menyajikan layout peran lama.
  redirect('/');
}
