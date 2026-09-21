'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

const jamSekarang = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

/** Setujui kunjungan yang menunggu verifikasi → berstatus sedang berkunjung, jam masuk tercatat. */
export async function setujuiKunjungan(formData: FormData) {
  const id = BigInt(String(formData.get('id')));
  await prisma.kunjungan.update({ where: { id }, data: { status: 'Sedang berkunjung', jamMasuk: jamSekarang() } });
  revalidatePath('/kunjungan-wali');
}

/** Tolak pengajuan kunjungan. */
export async function tolakKunjungan(formData: FormData) {
  const id = BigInt(String(formData.get('id')));
  await prisma.kunjungan.update({ where: { id }, data: { status: 'Ditolak' } });
  revalidatePath('/kunjungan-wali');
}

/** Check-out: tandai selesai dan catat jam keluar. */
export async function checkoutKunjungan(formData: FormData) {
  const id = BigInt(String(formData.get('id')));
  await prisma.kunjungan.update({ where: { id }, data: { status: 'Selesai', jamKeluar: jamSekarang() } });
  revalidatePath('/kunjungan-wali');
}

/** Pendaftaran kunjungan baru — menulis baris Kunjungan berstatus menunggu verifikasi. */
export async function daftarkanKunjungan(formData: FormData) {
  const santriId = BigInt(String(formData.get('santriId') ?? ''));
  const namaWali = String(formData.get('wali') ?? '').trim();
  const hubungan = String(formData.get('hubungan') ?? '').trim() || null;
  const tglRaw = String(formData.get('tgl') ?? '');
  const jam = String(formData.get('jam') ?? '').trim() || null;
  const keperluan = String(formData.get('keperluan') ?? '').trim() || null;
  if (!namaWali || !santriId || !tglRaw) return;

  await prisma.kunjungan.create({
    data: {
      santriId,
      namaWali,
      hubungan,
      tgl: new Date(tglRaw),
      jamMasuk: jam,
      keperluan,
      status: 'Menunggu verifikasi',
    },
  });
  revalidatePath('/kunjungan-wali');
}
