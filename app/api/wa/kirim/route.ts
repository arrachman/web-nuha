import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth';
import { kirimWa, renderTemplate } from '@/lib/wa';
import { requestIp } from '@/lib/audit';

const schema = z.object({
  templateKode: z.string().min(1).optional(),
  isi: z.string().min(1).optional(),
  nomor: z.string().min(1),
  tujuan: z.string().min(1),
  values: z.record(z.union([z.string(), z.number()])).optional(),
}).refine((data) => data.templateKode || data.isi, { message: 'Template atau isi pesan wajib diisi.' });

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) return Response.json({ success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Sesi wajib diisi.' } }, { status: 401 });
  const granted = await prisma.menuRole.count({ where: { menu: { key: 'wa' }, role: { key: { in: session.peran } } } });
  if (!granted) return Response.json({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'Tidak berwenang.' } }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } }, { status: 400 });

  const template = parsed.data.templateKode ? await prisma.waTemplate.findUnique({ where: { code: parsed.data.templateKode } }) : null;
  if (parsed.data.templateKode && !template) return Response.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Template tidak ditemukan.' } }, { status: 404 });
  const isi = renderTemplate(template?.content ?? parsed.data.isi!, parsed.data.values ?? {});
  const result = await kirimWa({ nomor: parsed.data.nomor, tujuan: parsed.data.tujuan, isi, templateId: template?.id, actor: { id: session.userId, nama: session.nama }, ip: requestIp(request) });
  return Response.json({ success: result.ok, data: { id: String(result.entry.id), status: result.entry.status, messageId: result.entry.messageId }, error: result.error ? { code: 'WA_SEND_FAILED', message: result.error } : null }, { status: result.ok ? 200 : 502 });
}
