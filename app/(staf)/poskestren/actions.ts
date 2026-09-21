'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requirePage } from '@/lib/access';
import { prisma } from '@/lib/prisma';

/** Simpan hasil pemeriksaan pasien — menulis baris baru ke MedicalRecord. */
export async function simpanPeriksa(formData: FormData): Promise<void> {
  const session = await requirePage('poskestren');

  const santriId = BigInt(String(formData.get('santriId') ?? '0'));
  const keluhan = String(formData.get('keluhan') ?? '').trim();
  const diagnosis = String(formData.get('diagnosis') ?? '').trim();
  const terapi = String(formData.get('terapi') ?? '').trim();
  const tindakLanjut = String(formData.get('tindakLanjut') ?? '').trim();

  if (!santriId || !keluhan) redirect('/poskestren?tab=periksa');

  const sekarang = new Date();
  const jam = sekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  await prisma.medicalRecord.create({
    data: {
      studentId: santriId,
      date: sekarang,
      time: jam,
      complaint: keluhan,
      diagnosis: diagnosis || null,
      treatment: terapi || null,
      followUp: tindakLanjut || null,
      officer: session.nama,
    },
  });

  revalidatePath('/poskestren');
  redirect('/poskestren?tab=rekam');
}
