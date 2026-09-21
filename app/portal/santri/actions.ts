'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth';

/** Santri hanya boleh mengajukan izin untuk dirinya sendiri, diambil dari sesi — bukan dari form. */
export async function ajukanIzin(formData: FormData) {
  const session = await readSession();
  if (!session) throw new Error('Sesi tidak valid.');
  const user = await prisma.user.findUnique({ where: { id: BigInt(session.userId) }, include: { person: { include: { santri: true } } } });
  const santri = user?.person.santri;
  if (!santri) throw new Error('Akun ini tidak tertaut ke data santri.');

  const jenis = String(formData.get('jenis') ?? '').trim();
  const mulai = String(formData.get('mulai') ?? '');
  const selesai = String(formData.get('selesai') ?? '');
  const alasan = String(formData.get('alasan') ?? '').trim();
  const penjemput = String(formData.get('penjemput') ?? '').trim();
  if (!jenis || !mulai || !alasan || !penjemput) return;

  const kode = `IZN-${Date.now().toString(36).toUpperCase()}`;
  await prisma.leavePermit.create({
    data: {
      code: kode,
      studentId: santri.id,
      type: jenis,
      reason: alasan,
      pickupBy: penjemput,
      departedAt: new Date(mulai),
      returnedAt: selesai ? new Date(selesai) : null,
      status: 'Pending',
    },
  });

  revalidatePath('/portal/santri');
}
