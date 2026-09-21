import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth';
import { parseRegionId, validateActiveVillage } from '@/lib/wilayah';

const schema = z.object({
  nama: z.string().trim().min(3, 'Nama minimal 3 karakter.').max(160),
  jk: z.enum(['L', 'P']),
  pilihan: z.string().trim().min(1, 'Pilihan unit wajib diisi.').max(64),
  asalSekolah: z.string().trim().max(160).optional(),
  hpWali: z.string().trim().regex(/^[0-9+\-\s]{8,20}$/, 'Nomor HP wali tidak valid.'),
  regionId: z.string().trim().optional(),
});

export async function GET() {
  const session = await readSession();
  if (!session) {
    return Response.json({ success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Perlu masuk.' } }, { status: 401 });
  }
  const rows = await prisma.applicant.findMany({ orderBy: { registeredAt: 'desc' } });
  // MySQL IDs are Prisma BigInt values, which JSON.stringify cannot serialize.
  const data = rows.map((row) => ({ ...row, id: String(row.id) }));
  return Response.json({
    success: true,
    data: rows.map((row) => ({
      ...row,
      id: String(row.id),
      regionId: row.regionId === null ? null : String(row.regionId),
      noReg: row.registrationNumber,
      nama: row.fullName,
      jk: row.gender,
      pilihan: row.choice,
      asalSekolah: row.previousSchool,
      hpWali: row.guardianPhone,
      tglDaftar: row.registeredAt,
      nilai: row.score,
      status: row.status,
    })),
    error: null,
  });
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } }, { status: 400 });
  }

  const regionError = await validateActiveVillage(parsed.data.regionId);
  if (regionError) {
    return Response.json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: regionError } }, { status: 400 });
  }
  const regionId = parseRegionId(parsed.data.regionId);

  const year = new Date().getFullYear();
  const total = await prisma.applicant.count();
  const registrationNumber = `PPDB-${year}-${String(total + 1).padStart(5, '0')}`;

  const pendaftar = await prisma.applicant.create({
    data: {
      registrationNumber,
      fullName: parsed.data.nama,
      gender: parsed.data.jk,
      choice: parsed.data.pilihan,
      previousSchool: parsed.data.asalSekolah,
      guardianPhone: parsed.data.hpWali,
      regionId,
      registeredAt: new Date(),
      status: 'New',
    },
  });

  return Response.json({ success: true, data: { noReg: pendaftar.registrationNumber }, error: null }, { status: 201 });
}
