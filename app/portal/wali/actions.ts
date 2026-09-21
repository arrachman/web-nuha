'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth';

/**
 * Pastikan santriId yang dikirim form benar-benar anak dari wali yang sedang
 * login — form field bisa dipalsukan klien, jadi validasi ulang di server
 * terhadap GuardianRelation, jangan percaya nilai yang dikirim begitu saja.
 */
async function santriMilikWaliSesi(santriId: bigint) {
  const session = await readSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: BigInt(session.userId) } });
  if (!user) return null;
  const relasi = await prisma.guardianRelation.findFirst({
    where: { waliId: user.personId, anak: { santri: { id: santriId } } },
    include: { anak: { include: { santri: true } } },
  });
  return relasi?.anak.santri ?? null;
}

/** Wali mengajukan kunjungan untuk anaknya. */
export async function ajukanKunjunganWali(formData: FormData) {
  const santriId = BigInt(String(formData.get('santriId')));
  const santri = await santriMilikWaliSesi(santriId);
  if (!santri) throw new Error('Santri bukan anak dari akun wali ini.');

  const namaWali = String(formData.get('namaWali') ?? '').trim();
  const tgl = String(formData.get('tgl') ?? '');
  const jam = String(formData.get('jam') ?? '');
  const keperluan = String(formData.get('keperluan') ?? '').trim();
  if (!namaWali || !tgl || !keperluan) return;

  await prisma.kunjungan.create({
    data: {
      santriId: santri.id,
      namaWali,
      hubungan: String(formData.get('hubungan') ?? ''),
      tgl: new Date(tgl),
      jamMasuk: jam,
      keperluan,
      status: 'Terjadwal',
    },
  });

  revalidatePath('/portal/wali');
}

/** Wali mengonfirmasi payments atas satu invoices anaknya. Nominal ditambahkan ke Invoice.paidAmount. */
export async function konfirmasiPembayaranWali(formData: FormData) {
  const santriId = BigInt(String(formData.get('santriId')));
  const santri = await santriMilikWaliSesi(santriId);
  if (!santri) throw new Error('Santri bukan anak dari akun wali ini.');

  const invoiceId = BigInt(String(formData.get('invoiceId')));
  const amount = Number(formData.get('amount') ?? 0);
  const method = String(formData.get('method') ?? 'Transfer bank');
  const bukti = String(formData.get('bukti') ?? '').trim();
  if (!(amount > 0)) return;

  // Invoice yang paidAmount wajib milik santri yang sama — cegah wali membayar invoices santri lain.
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, santriId: santri.id } });
  if (!invoice) throw new Error('Tagihan tidak ditemukan untuk santri ini.');

  await prisma.$transaction([
    prisma.payment.create({ data: { invoiceId: invoice.id, date: new Date(), amount, method, reference: bukti || null } }),
    prisma.invoice.update({ where: { id: invoice.id }, data: { paidAmount: { increment: amount } } }),
  ]);

  revalidatePath('/portal/wali');
}
