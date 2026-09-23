import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';
import { recordAudit, requestIp } from '@/lib/audit';

// Staff sign in with email; santri and wali portal accounts use a username, so the
// same field accepts either and the lookup decides which one it matched.
const schema = z.object({
  identifier: z.string().min(1, 'Email atau nama pengguna wajib diisi.'),
  password: z.string().min(1, 'Kata sandi wajib diisi.'),
});

const TOO_MANY = Response.json(
  { success: false, data: null, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Terlalu banyak percobaan, coba lagi 15 menit lagi.' } },
  { status: 429 },
);

// 01-fondasi §2.1: tolak sebelum menyentuh bcrypt sama sekali begitu ambang
// terlampaui, supaya percobaan yang ditolak tidak ikut membebani hashing.
async function melebihiBatasPercobaan(identifier: string, ip: string | null): Promise<boolean> {
  const sejak = new Date(Date.now() - 15 * 60 * 1000);
  const [gagalIdentifier, gagalIp] = await Promise.all([
    prisma.loginAttempt.count({ where: { identifier, success: false, createdAt: { gte: sejak } } }),
    ip
      ? prisma.loginAttempt.count({ where: { ip, success: false, createdAt: { gte: sejak } } })
      : Promise.resolve(0),
  ]);
  return gagalIdentifier >= 5 || gagalIp >= 20;
}

export async function POST(request: Request) {
  const ip = requestIp(request);
  const body = await request.json().catch(() => null);
  // Accept the older `email` field so existing clients keep working.
  const payload = body && typeof body === 'object' && !('identifier' in body) && 'email' in body
    ? { ...body, identifier: (body as { email?: unknown }).email }
    : body;

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } }, { status: 400 });
  }

  const identifier = parsed.data.identifier.trim();

  if (await melebihiBatasPercobaan(identifier, ip)) {
    return TOO_MANY;
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { username: identifier }] },
    include: { person: true, roles: { include: { role: true } }, units: true },
  });

  const invalid = Response.json(
    { success: false, data: null, error: { code: 'INVALID_CREDENTIALS', message: 'Akun atau kata sandi salah.' } },
    { status: 401 },
  );

  // Always run a hash comparison so response timing does not reveal account existence.
  const hash = user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvaliduu';
  const ok = await bcrypt.compare(parsed.data.password, hash);
  if (!user || !ok || !user.aktif) {
    await Promise.all([
      prisma.loginAttempt.create({ data: { identifier, ip, success: false } }),
      recordAudit({
        aksi: 'LOGIN_GAGAL',
        entitas: 'user',
        ringkasan: `Login gagal untuk "${identifier}"`,
        aktor: { nama: identifier },
        ip,
      }),
    ]);
    return invalid;
  }

  await Promise.all([
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    prisma.loginAttempt.create({ data: { identifier, ip, success: true } }),
  ]);
  // unitIds null = tidak ditempatkan di user_units sama sekali → perilaku lama
  // (seluruh unit), konsisten dengan whereUnit()/assertUnit() di lib/unit-scope.ts.
  const unitIds = user.units.length > 0 ? user.units.map((u) => u.unitId) : null;
  await createSession({
    userId: String(user.id),
    nama: user.person.fullName,
    email: user.email,
    peran: user.roles.map((row) => row.role.key),
    unitIds,
    sessionVersion: user.sessionVersion,
    mustChangePassword: user.mustChangePassword,
  });
  await recordAudit({
    aksi: 'LOGIN',
    entitas: 'user',
    entitasId: String(user.id),
    ringkasan: `${user.person.fullName} masuk`,
    aktor: { id: String(user.id), nama: user.person.fullName },
    ip,
  });

  return Response.json({
    success: true,
    data: { nama: user.person.fullName, mustChangePassword: user.mustChangePassword },
    error: null,
  });
}
