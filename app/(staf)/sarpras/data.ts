import { prisma } from '@/lib/prisma';
import { whereUnit } from '@/lib/unit-scope';
import type { SessionPayload } from '@/lib/auth';

/** Pengumpul data bersama tab-tab Sarpras (konvensi: data panjang dipisah dari file tab). */
export function unitDalamCakupan(session: SessionPayload) {
  return prisma.unit.findMany({ where: whereUnit(session, 'id'), orderBy: { id: 'asc' } });
}

export function semuaUnit() {
  return prisma.unit.findMany({ orderBy: { id: 'asc' } });
}

/** Ruang/area yang bisa dipilih (lokasi bersama unitId null ikut tampil). */
export function lokasiPilihan(session: SessionPayload, hanyaRuang = false) {
  const scope = whereUnit(session);
  return prisma.assetLocation.findMany({
    where: {
      isActive: true,
      ...(hanyaRuang ? { type: { in: ['Ruang', 'Area'] } } : {}),
      ...(Object.keys(scope).length ? { OR: [scope, { unitId: null }] } : {}),
    },
    orderBy: { code: 'asc' },
  });
}

export function stafPilihan() {
  return prisma.staff.findMany({ where: { status: 'Aktif' }, include: { person: { select: { fullName: true } } }, orderBy: { person: { fullName: 'asc' } }, take: 400 });
}

/** Pengguna berperan sarpras/teknisi — calon penerima tugas tiket & pemeliharaan. */
export function petugasTeknis() {
  return prisma.user.findMany({
    where: { aktif: true, roles: { some: { role: { key: { in: ['sarpras', 'teknisi'] } } } } },
    include: { person: { select: { fullName: true } } },
  });
}
