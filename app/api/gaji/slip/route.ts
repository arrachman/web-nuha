import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth';
import { hitungGaji } from '@/lib/gaji';
import { recordAudit, requestIp } from '@/lib/audit';

const schema = z.object({
  pegawaiId: z.string().min(1),
  periode: z.string().regex(/^\d{4}-\d{2}$/, 'Periode memakai format YYYY-MM.'),
  aksi: z.enum(['terbitkan', 'bayar', 'revisi']),
  catatan: z.string().max(255).optional(),
});

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) return Response.json({ success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Sesi wajib diisi.' } }, { status: 401 });

  const granted = await prisma.menuRole.count({ where: { menu: { key: 'gaji' }, role: { key: { in: session.peran } } } });
  if (!granted) return Response.json({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'Tidak berwenang mengatur slip gaji.' } }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } }, { status: 400 });

  const staffId = BigInt(parsed.data.pegawaiId);
  const period = parsed.data.periode;
  const { aksi } = parsed.data;
  const actor = { id: session.userId, nama: session.nama };
  const ip = requestIp(request);

  const staff = await prisma.staff.findUnique({ where: { id: staffId }, include: { person: true, salaryComponent: true } });
  if (!staff) return Response.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Pegawai tidak ditemukan.' } }, { status: 404 });

  const existing = await prisma.paySlip.findUnique({ where: { staffId_period: { staffId, period } } });

  if (aksi === 'bayar') {
    if (!existing) return Response.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Slip belum diterbitkan.' } }, { status: 404 });
    const slip = await prisma.paySlip.update({ where: { id: existing.id }, data: { status: 'Dibayar', paidAt: new Date() } });
    await recordAudit({ aksi: 'SLIP_DIBAYAR', entitas: 'slip_gaji', entitasId: String(slip.id), ringkasan: `Slip ${period} ${staff.person.fullName} dibayar`, aktor: actor, ip });
    return Response.json({ success: true, data: serialize(slip), error: null });
  }

  const { bruto, potongan, netto } = hitungGaji(staff.salaryComponent);
  const grossAmount = bruto;
  const deduction = potongan;
  const netAmount = netto;

  if (aksi === 'terbitkan') {
    if (existing) return Response.json({ success: false, data: null, error: { code: 'CONFLICT', message: 'Slip periode ini sudah ada — gunakan revisi.' } }, { status: 409 });
    const slip = await prisma.paySlip.create({
      data: { staffId, period, grossAmount, deduction, netAmount, status: 'Terbit', issuedBy: BigInt(session.userId) },
    });
    await recordAudit({ aksi: 'SLIP_TERBIT', entitas: 'slip_gaji', entitasId: String(slip.id), ringkasan: `Slip ${period} ${staff.person.fullName} diterbitkan`, perubahan: { grossAmount, deduction, netAmount }, aktor: actor, ip });
    return Response.json({ success: true, data: serialize(slip), error: null }, { status: 201 });
  }

  if (!existing) return Response.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Slip belum diterbitkan.' } }, { status: 404 });
  const slip = await prisma.paySlip.update({
    where: { id: existing.id },
    data: { grossAmount, deduction, netAmount, revisionCount: existing.revisionCount + 1, status: 'Revisi', revisionNote: parsed.data.catatan, issuedBy: BigInt(session.userId) },
  });
  await recordAudit({
    aksi: 'SLIP_REVISI',
    entitas: 'slip_gaji',
    entitasId: String(slip.id),
    ringkasan: `Slip ${period} ${staff.person.fullName} direvisi ke-${slip.revisionCount}${existing.paidAt ? ' setelah dibayar' : ''}`,
    perubahan: {
      grossAmount: { from: Number(existing.grossAmount), to: grossAmount },
      deduction: { from: Number(existing.deduction), to: deduction },
      netAmount: { from: Number(existing.netAmount), to: netAmount },
      sudahDibayar: Boolean(existing.paidAt),
      catatan: parsed.data.catatan ?? null,
    },
    aktor: actor,
    ip,
  });
  return Response.json({ success: true, data: serialize(slip), error: null });
}

function serialize(slip: { id: bigint; staffId: bigint; period: string; grossAmount: unknown; deduction: unknown; netAmount: unknown; status: string; revisionCount: number; paidAt: Date | null }) {
  return {
    id: String(slip.id),
    pegawaiId: String(slip.staffId),
    period: slip.period,
    grossAmount: Number(slip.grossAmount),
    deduction: Number(slip.deduction),
    netAmount: Number(slip.netAmount),
    status: slip.status,
    revisionCount: slip.revisionCount,
    paidAt: slip.paidAt,
  };
}
