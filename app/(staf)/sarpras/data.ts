import { prisma } from '@/lib/prisma';
import { getUnitAktif, whereUnitAktif } from '@/lib/unit-scope';
import type { SessionPayload } from '@/lib/auth';

/** Pengumpul data bersama tab-tab Sarpras (konvensi: data panjang dipisah dari file tab). */
export async function unitDalamCakupan(session: SessionPayload) {
  const unitAktif = await getUnitAktif(session);
  return prisma.unit.findMany({ where: whereUnitAktif(session, unitAktif, 'id'), orderBy: { id: 'asc' } });
}

export function semuaUnit() {
  return prisma.unit.findMany({ orderBy: { id: 'asc' } });
}

/** Ruang/area yang bisa dipilih (lokasi bersama unitId null ikut tampil). */
export async function lokasiPilihan(session: SessionPayload, hanyaRuang = false) {
  const unitAktif = await getUnitAktif(session);
  const scope = whereUnitAktif(session, unitAktif);
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
