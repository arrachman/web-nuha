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
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { username: identifier }] },
    include: { person: true, roles: { include: { role: true } } },
  });

  const invalid = Response.json(
    { success: false, data: null, error: { code: 'INVALID_CREDENTIALS', message: 'Akun atau kata sandi salah.' } },
    { status: 401 },
  );

  // Always run a hash comparison so response timing does not reveal account existence.
  const hash = user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvaliduu';
  const ok = await bcrypt.compare(parsed.data.password, hash);
  if (!user || !ok || !user.aktif) {
    await recordAudit({
      aksi: 'LOGIN_GAGAL',
      entitas: 'user',
      ringkasan: `Login gagal untuk "${identifier}"`,
      aktor: { nama: identifier },
      ip,
    });
    return invalid;
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession({
    userId: String(user.id),
    nama: user.person.fullName,
    email: user.email,
    peran: user.roles.map((row) => row.role.key),
  });
  await recordAudit({
    aksi: 'LOGIN',
    entitas: 'user',
    entitasId: String(user.id),
    ringkasan: `${user.person.fullName} masuk`,
    aktor: { id: String(user.id), nama: user.person.fullName },
    ip,
  });

  return Response.json({ success: true, data: { nama: user.person.fullName }, error: null });
}
