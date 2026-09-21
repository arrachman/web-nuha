'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

const SESI_VALID = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];
const STATUS_VALID = ['Present', 'Sick', 'Excused', 'Absent'] as const;

/** Simpan absensi jamaah satu sesi untuk seluruh santri aktif sekaligus. */
export async function simpanAbsenJamaah(formData: FormData) {
  const sesi = String(formData.get('sesi') ?? '');
  if (!SESI_VALID.includes(sesi)) return;

  const hariIni = new Date();
  hariIni.setHours(0, 0, 0, 0);

  const entri: Array<{ studentId: bigint; status: (typeof STATUS_VALID)[number] }> = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith('status-')) continue;
    const status = String(value);
    if (!STATUS_VALID.includes(status as (typeof STATUS_VALID)[number])) continue;
    entri.push({ studentId: BigInt(key.slice('status-'.length)), status: status as (typeof STATUS_VALID)[number] });
  }

  await Promise.all(
    entri.map((e) =>
      prisma.attendance.upsert({
        where: { studentId_date_session: { studentId: e.studentId, date: hariIni, session: sesi } },
        create: { studentId: e.studentId, date: hariIni, session: sesi, status: e.status },
        update: { status: e.status },
      }),
    ),
  );

  revalidatePath('/kepesantrenan');
}

/** Ubah status pengajuan izin (Disetujui/Ditolak) atau tandai santri sudah kembali. */
export async function ubahStatusIzin(formData: FormData) {
  const id = BigInt(String(formData.get('id')));
  const aksi = String(formData.get('aksi'));

  if (aksi === 'setuju') {
    await prisma.leavePermit.update({ where: { id }, data: { status: 'Approved' } });
  } else if (aksi === 'tolak') {
    await prisma.leavePermit.update({ where: { id }, data: { status: 'Rejected' } });
  } else if (aksi === 'kembali') {
    await prisma.leavePermit.update({ where: { id }, data: { status: 'Completed', returnedAt: new Date() } });
  }

  revalidatePath('/kepesantrenan');
}
