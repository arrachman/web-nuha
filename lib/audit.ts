import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';

export type AuditActor = {
  id?: string;
  nama?: string;
};

type AuditParams = {
  aksi: string;
  entitas: string;
  entitasId?: string;
  ringkasan: string;
  perubahan?: Record<string, unknown>;
  aktor?: AuditActor | null;
  ip?: string | null;
};

/**
 * Append an audit event without allowing observability failure to break the
 * business operation. Callers may await it when tests need deterministic rows.
 */
export async function recordAudit(params: AuditParams): Promise<void> {
  const context = {
    aksi: params.aksi,
    entitas: params.entitas,
    entitasId: params.entitasId,
    aktorId: params.aktor?.id,
    aktorNama: params.aktor?.nama ?? 'anonim',
  };

  try {
    await prisma.auditLog.create({
      data: {
        aksi: params.aksi,
        entitas: params.entitas,
        entitasId: params.entitasId,
        ringkasan: params.ringkasan,
        perubahan: params.perubahan as Prisma.InputJsonValue | undefined,
        aktorId: params.aktor?.id ? BigInt(params.aktor.id) : null,
        aktorNama: params.aktor?.nama ?? 'anonim',
        ip: params.ip ?? null,
      },
    });
    log('info', params.ringkasan, context);
  } catch (error) {
    log('error', 'Gagal menyimpan audit log', {
      ...context,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function requestIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip');
}
