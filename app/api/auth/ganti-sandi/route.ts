import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { readSession, createSession } from '@/lib/auth';
import { recordAudit, requestIp } from '@/lib/audit';

// 01-fondasi-auth-rbac-crud.md §2.2: minimal 8 karakter, bukan sandi bawaan
// seed, dan bukan sama dengan username — supaya "ganti sandi" tidak dipakai
// asal klik simpan dengan sandi yang sama persis.
const SANDI_BAWAAN = 'Nuha2026!';
const schema = z.object({
  sandiSaatIni: z.string().min(1, 'Kata sandi saat ini wajib diisi.'),
  sandiBaru: z
    .string()
    .min(8, 'Kata sandi baru minimal 8 karakter.')
    .refine((v) => v !== SANDI_BAWAAN, 'Kata sandi baru tidak boleh sama dengan sandi bawaan.'),
});

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) {
    return Response.json({ success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Sesi tidak ditemukan.' } }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: BigInt(session.userId) },
    include: { person: true, roles: { include: { role: true } }, units: true },
  });
  if (!user) {
    return Response.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Akun tidak ditemukan.' } }, { status: 404 });
  }

  const cocok = await bcrypt.compare(parsed.data.sandiSaatIni, user.passwordHash);
  if (!cocok) {
    return Response.json({ success: false, data: null, error: { code: 'INVALID_CREDENTIALS', message: 'Kata sandi saat ini salah.' } }, { status: 401 });
  }
  if (parsed.data.sandiBaru === user.username) {
    return Response.json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Kata sandi baru tidak boleh sama dengan nama pengguna.' } }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.sandiBaru, 12);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      sessionVersion: { increment: 1 },
    },
  });

  const unitIds = user.units.length > 0 ? user.units.map((u) => u.unitId) : null;
  await createSession({
    userId: String(user.id),
    nama: user.person.fullName,
    email: user.email,
    peran: user.roles.map((row) => row.role.key),
    unitIds,
    sessionVersion: updated.sessionVersion,
    mustChangePassword: false,
  });

  await recordAudit({
    aksi: 'GANTI_SANDI',
    entitas: 'user',
    entitasId: String(user.id),
    ringkasan: `${user.person.fullName} mengganti kata sandi sendiri`,
    aktor: { id: String(user.id), nama: user.person.fullName },
    ip: requestIp(request),
  });

  return Response.json({ success: true, data: { ok: true }, error: null });
}
