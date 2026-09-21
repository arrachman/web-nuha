'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

const predikatDari = (akhir: number, kkm: number) => {
  if (akhir >= kkm + 15) return 'A';
  if (akhir >= kkm) return 'B';
  if (akhir >= kkm - 10) return 'C';
  return 'D';
};

/** Simpan nilai satu kelas · satu mapel · satu periode sekaligus (satu form, banyak baris). */
export async function simpanNilaiKelas(formData: FormData) {
  const mapelId = Number(formData.get('mapelId'));
  const periode = String(formData.get('periode') ?? '');
  const kelasId = String(formData.get('kelasId') ?? '');
  const santriIds = formData.getAll('santriId').map((v) => String(v));
  if (!mapelId || !periode || santriIds.length === 0) return;

  const mapel = await prisma.mataPelajaran.findUnique({ where: { id: mapelId } });
  if (!mapel) return;

  for (const santriId of santriIds) {
    const tugas = Number(formData.get(`tugas-${santriId}`) ?? 0);
    const uts = Number(formData.get(`uts-${santriId}`) ?? 0);
    const uas = Number(formData.get(`uas-${santriId}`) ?? 0);
    const akhir = Math.round(((tugas + uts + uas) / 3) * 100) / 100;
    const predikat = predikatDari(akhir, mapel.kkm);
    await prisma.nilai.upsert({
      where: { santriId_mapelId_periode: { santriId: BigInt(santriId), mapelId, periode } },
      create: { santriId: BigInt(santriId), mapelId, periode, tugas, uts, uas, akhir, predikat },
      update: { tugas, uts, uas, akhir, predikat },
    });
  }

  revalidatePath('/akademik');
  const qs = new URLSearchParams({ tab: 'nilai', kelas: kelasId, mapel: String(mapelId), periode });
  redirect(`/akademik?${qs.toString()}`);
}
