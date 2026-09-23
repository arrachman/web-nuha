import { cache } from 'react';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const SESSION_COOKIE = 'nuha_session';
const MAX_AGE_SECONDS = 60 * 60 * 8;

export type SessionPayload = {
  userId: string;
  nama: string;
  email: string;
  /** Peran efektif — yang dipakai semua pengecekan akses. */
  peran: string[];
  /**
   * Peran asli dari basis data. Hanya terisi saat super admin sedang menyamar
   * sebagai peran lain; dipakai untuk mengembalikan dirinya dan untuk memutuskan
   * siapa yang boleh mengganti peran. Tanpa ini, super admin yang menyamar jadi
   * santri akan kehilangan tombol kembalinya.
   */
  peranAsli?: string[];
  /**
   * Cakupan unit (01-fondasi §4). `null` = seluruh unit (perilaku lama/superadmin);
   * array (termasuk kosong) = dibatasi ke unit-unit itu. Dibaca lib/unit-scope.ts.
   */
  unitIds?: number[] | null;
  /** Naik saat akun dinonaktifkan/sandi diganti/peran diubah — bandingkan ke User.sessionVersion untuk mencabut sesi lama sebelum kedaluwarsa. */
  sessionVersion?: number;
  /** true selama login pertama / setelah admin mereset sandi — middleware.ts mengarahkan ke /akun/sandi (01 §2.2). */
  mustChangePassword?: boolean;
};

export const PERAN_SUPERADMIN = 'superadmin';

/** Super admin dinilai dari peran asli, bukan peran yang sedang dipakai. */
export function isSuperAdmin(session: SessionPayload): boolean {
  return (session.peranAsli ?? session.peran).includes(PERAN_SUPERADMIN);
}

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET must be set and at least 32 characters long');
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    // The app is also deployed behind plain HTTP on the LAN/public IP. A Secure
    // cookie is silently rejected there; enable it explicitly when HTTPS is used.
    secure: process.env.AUTH_COOKIE_SECURE === 'true',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

/**
 * Bandingkan sessionVersion di token dengan yang tersimpan di DB, supaya akun
 * yang dinonaktifkan / ganti sandi / ganti peran tidak bisa dipakai lagi
 * sampai kedaluwarsa 8 jam (01-fondasi §2.3). Satu query ringan, di-cache per
 * request karena readSession() dipanggil berkali-kali dalam satu request.
 */
const userStillValid = cache(async (userId: string, sessionVersion: number): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: BigInt(userId) },
    select: { aktif: true, sessionVersion: true },
  });
  if (!user || !user.aktif) return false;
  return user.sessionVersion === sessionVersion;
});

export async function readSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const session = payload as unknown as SessionPayload;
    // Token lama (sebelum kolom ini ada) tidak punya sessionVersion — anggap
    // valid supaya sesi yang sedang berjalan tidak mendadak logout massal.
    if (typeof session.sessionVersion === 'number') {
      const valid = await userStillValid(session.userId, session.sessionVersion);
      if (!valid) return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
