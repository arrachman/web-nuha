'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requirePage } from '@/lib/access';
import { recordAudit } from '@/lib/audit';

const STATUS_SAH = ['Draf', 'Berjalan', 'Selesai'] as const;

/**
 * Setiap aksi ujian digerbangi menu `ujian` di server — tab yang tersembunyi
 * bukan pengaman — lalu dicatat ke audit karena nilai ujian menentukan rapor.
 */
async function penjaga(aksi: string, ringkasan: string, entitasId?: string) {
  const session = await requirePage('ujian');
  await recordAudit({
    aksi,
    entitas: 'ujian',
    entitasId,
    ringkasan,
    aktor: { id: session.userId, nama: session.nama },
  });
  return session;
}

/** Kepala unit memindahkan gelombang ujian antar status. */
export async function ubahStatusUjian(formData: FormData) {
  const id = Number(formData.get('id'));
  const status = String(formData.get('status') ?? '');
  if (!id || !STATUS_SAH.includes(status as (typeof STATUS_SAH)[number])) return;

  const ujian = await prisma.ujian.findUnique({ where: { id }, select: { nama: true } });
  if (!ujian) return;

  await penjaga('UBAH_STATUS_UJIAN', `${ujian.nama} → ${status}`, String(id));
  await prisma.ujian.update({ where: { id }, data: { status } });
  revalidatePath('/ujian');
}

/**
 * Guru menyimpan nilai satu sesi ujian sekaligus. Santri yang ditandai tidak
 * hadir tetap disimpan barisnya dengan nilai 0 — ketidakhadiran adalah fakta
 * yang perlu tercatat, bukan sekadar baris yang hilang.
 */
export async function simpanNilaiUjian(formData: FormData) {
  const jadwalId = Number(formData.get('jadwalId'));
  if (!jadwalId) return;

  const jadwal = await prisma.jadwalUjian.findUnique({
    where: { id: jadwalId },
    include: { mapel: true, kelas: { include: { santri: { select: { id: true } } } } },
  });
  if (!jadwal) return;

  await penjaga(
    'SIMPAN_NILAI_UJIAN',
    `${jadwal.mapel.nama} · kelas ${jadwal.kelas.nama} (${jadwal.kelas.santri.length} santri)`,
    String(jadwalId),
  );

  for (const santri of jadwal.kelas.santri) {
    const mentah = formData.get(`nilai-${santri.id}`);
    if (mentah === null || String(mentah).trim() === '') continue;
    const hadir = formData.get(`hadir-${santri.id}`) !== null;
    // Nilai di luar 0–100 ditolak diam-diam agar salah ketik tidak mengotori rapor.
    const angka = Number(mentah);
    if (!Number.isFinite(angka) || angka < 0 || angka > 100) continue;

    await prisma.nilaiUjian.upsert({
      where: { jadwalId_santriId: { jadwalId, santriId: santri.id } },
      create: { jadwalId, santriId: santri.id, nilai: hadir ? angka : 0, hadir },
      update: { nilai: hadir ? angka : 0, hadir },
    });
  }

  revalidatePath('/ujian');
}
