import { destroySession, readSession } from '@/lib/auth';
import { recordAudit, requestIp } from '@/lib/audit';

export async function POST(request: Request) {
  const session = await readSession();
  await destroySession();

  if (session) {
    await recordAudit({
      aksi: 'LOGOUT',
      entitas: 'user',
      entitasId: session.userId,
      ringkasan: `${session.nama} keluar`,
      aktor: { id: session.userId, nama: session.nama },
      ip: requestIp(request),
    });
  }

  return Response.json({ success: true, data: { keluar: true }, error: null });
}
