import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const LIMIT = 10;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = params.get('q')?.trim() ?? '';
  const ids = (params.get('ids') ?? '').split(',').map((item) => item.trim()).filter((item) => /^\d+$/.test(item));
  const rows = await prisma.region.findMany({
    where: ids.length ? { id: { in: ids.map((item) => BigInt(item)) } } : {
      isActive: true,
      level: 'Village',
      ...(q ? {
        OR: [
          { name: { contains: q } },
          { fullName: { contains: q } },
          { aliases: { some: { alias: { contains: q } } } },
        ],
      } : {}),
    },
    select: { id: true, name: true, typeLabel: true, fullName: true, postalCode: true, isActive: true, level: true },
    orderBy: { name: 'asc' },
    take: ids.length ? ids.length : LIMIT,
  });

  return NextResponse.json({
    success: true,
    data: rows
      .filter((row) => ids.length || (row.isActive && row.level === 'Village'))
      .map((row) => ({
        id: String(row.id),
        nama: `${row.typeLabel ?? ''} ${row.name}`.trim(),
        keterangan: [row.fullName, row.postalCode ? `Kode pos ${row.postalCode}` : null].filter(Boolean).join(' · '),
      })),
  });
}
