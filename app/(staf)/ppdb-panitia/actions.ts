'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';

/** Tetapkan keputusan seleksi (lulus/tidak lulus) untuk satu pendaftar. */
export async function ubahStatusSeleksi(formData: FormData) {
  const session = await readSession();
  const id = BigInt(String(formData.get('id')));
  const aksi = String(formData.get('aksi'));
  const status = aksi === 'lulus' ? 'Passed' : aksi === 'tolak' ? 'Failed' : null;
  if (!status) return;

  const pendaftar = await prisma.applicant.update({ where: { id }, data: { status } });
  await recordAudit({
    aksi: aksi === 'lulus' ? 'PPDB_LULUSKAN' : 'PPDB_TOLAK',
    entitas: 'pendaftar',
    entitasId: String(id),
    ringkasan: `${pendaftar.fullName} (${pendaftar.registrationNumber}) ditetapkan ${status}`,
    aktor: session ? { id: session.userId, nama: session.nama } : null,
  });

  revalidatePath('/ppdb-panitia');
}
