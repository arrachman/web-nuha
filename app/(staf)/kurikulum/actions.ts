'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

/** Guru mengajukan perangkat ajar (Draf → Menunggu review). */
export async function ajukanPerangkat(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!id) return;
  await prisma.perangkatAjar.update({ where: { id }, data: { status: 'Menunggu review' } });
  revalidatePath('/kurikulum');
}

/** Kepala unit menyetujui perangkat ajar (Menunggu review → Disetujui). */
export async function setujuiPerangkat(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!id) return;
  await prisma.perangkatAjar.update({ where: { id }, data: { status: 'Disetujui' } });
  revalidatePath('/kurikulum');
}
