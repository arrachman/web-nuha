'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth';
import { kirimWa, renderTemplate, normalizeTarget } from '@/lib/wa';
import { tambahPerangkat, hapusPerangkat, putuskanPerangkat } from '@/lib/wa-gateway';
import { recordAudit } from '@/lib/audit';
import { requirePage } from '@/lib/access';

/**
 * Perangkat WhatsApp menentukan dari nomor mana seluruh pesan pondok terkirim,
 * jadi setiap aksinya digerbangi menu `wa` di server — bukan sekadar karena
 * tabnya tersembunyi — dan dicatat ke audit log.
 */
async function penjagaPerangkat(aksi: string, ringkasan: string) {
  const session = await requirePage('wa');
  await recordAudit({
    aksi,
    entitas: 'perangkat_wa',
    ringkasan,
    aktor: { id: session.userId, nama: session.nama },
  });
}

export async function tambahPerangkatWa(formData: FormData) {
  const nama = String(formData.get('nama') ?? '').trim();
  const nomor = normalizeTarget(String(formData.get('nomor') ?? ''));
  if (!nama) throw new Error('Nama perangkat wajib diisi.');
  await penjagaPerangkat('TAMBAH_PERANGKAT_WA', `Mendaftarkan perangkat WhatsApp ${nama} (${nomor})`);
  await tambahPerangkat(nama, nomor);
  revalidatePath('/notifikasi');
}

export async function hapusPerangkatWa(formData: FormData) {
  const nomor = String(formData.get('nomor') ?? '');
  await penjagaPerangkat('HAPUS_PERANGKAT_WA', `Menghapus perangkat WhatsApp ${nomor}`);
  await hapusPerangkat(nomor);
  revalidatePath('/notifikasi');
}

export async function putuskanPerangkatWa(formData: FormData) {
  const token = String(formData.get('token') ?? '');
  await penjagaPerangkat('PUTUS_PERANGKAT_WA', 'Memutus sesi perangkat WhatsApp');
  await putuskanPerangkat(token);
  revalidatePath('/notifikasi');
}

/** Aktif/nonaktifkan template — menghentikan/melanjutkan pengiriman otomatisnya. */
export async function toggleTemplateWa(formData: FormData) {
  const id = Number(formData.get('id'));
  const template = await prisma.waTemplate.findUnique({ where: { id } });
  if (!template) return;
  await prisma.waTemplate.update({ where: { id }, data: { isActive: !template.isActive } });
  revalidatePath('/notifikasi');
}

/** Kirim satu pemicu ke nomor tujuan, memakai jalur kirimWa yang sama dengan form uji (dry-run tetap berlaku). */
export async function kirimPemicu(formData: FormData) {
  const session = await readSession();
  if (!session) return;

  const templateKode = String(formData.get('templateKode') ?? '');
  const nomor = String(formData.get('nomor') ?? '');
  const tujuan = String(formData.get('tujuan') ?? '');
  if (!nomor || !tujuan) return;

  const template = templateKode ? await prisma.waTemplate.findUnique({ where: { code: templateKode } }) : null;
  const isiMentah = template?.content ?? String(formData.get('isi') ?? '');
  if (!isiMentah) return;

  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('v.')) values[key.slice(2)] = String(value);
  }

  await kirimWa({
    nomor,
    tujuan,
    isi: renderTemplate(isiMentah, values),
    templateId: template?.id,
    actor: { id: session.userId, nama: session.nama },
    ip: null,
  });
  revalidatePath('/notifikasi');
}
