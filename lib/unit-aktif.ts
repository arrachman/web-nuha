'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { isSuperAdmin, readSession } from '@/lib/auth';
import { UNIT_AKTIF_COOKIE } from '@/lib/unit-scope';

/**
 * Server Action PemilihUnit: simpan unit fokus di cookie. Pilihan divalidasi
 * terhadap cakupan sesi agar manipulasi form tidak bisa membuka unit lain.
 * Nilai kosong = "Semua Unit" (cookie dihapus).
 */
export async function gantiUnit(formData: FormData): Promise<void> {
  const session = await readSession();
  if (!session) throw new Error('Sesi tidak ditemukan.');

  const raw = String(formData.get('unit') ?? '').trim();
  const store = await cookies();

  if (!raw) {
    store.delete(UNIT_AKTIF_COOKIE);
  } else {
    const id = Number(raw);
    if (!Number.isFinite(id)) throw new Error('Unit tidak valid.');
    if (!isSuperAdmin(session) && session.unitIds != null && !session.unitIds.includes(id)) {
      throw new Error('Unit di luar cakupan akses Anda.');
    }
    store.set(UNIT_AKTIF_COOKIE, String(id), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  revalidatePath('/', 'layout');
}
