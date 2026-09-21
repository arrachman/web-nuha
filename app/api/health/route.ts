import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ success: true, data: { status: 'ok', database: 'connected' }, error: null });
  } catch {
    return Response.json({ success: false, data: null, error: { code: 'DATABASE_UNAVAILABLE', message: 'Database belum siap.' } }, { status: 503 });
  }
}
