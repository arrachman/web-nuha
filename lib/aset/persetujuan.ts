import { prisma } from '@/lib/prisma';
import { isSuperAdmin, type SessionPayload } from '@/lib/auth';
import { AMBANG_PENGADAAN_BAWAAN, PERAN_KEPALA_UNIT, SETTING_AMBANG_PENGADAAN } from './konstanta';

export type Entitas = 'procurement' | 'loan' | 'disposal';

export async function bacaAngkaSetting(key: string, bawaan: number): Promise<number> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  const n = row ? Number(row.value) : NaN;
  return Number.isFinite(n) ? n : bawaan;
}

/**
 * Jenjang persetujuan pengadaan (04 §5):
 * - dana BOS/BOSP: kepala unit → bendahara (tidak lewat yayasan);
 * - ≤ ambang: kepala unit → bendahara;
 * - > ambang: kepala unit → bendahara → ketua yayasan.
 */
export async function jenjangPengadaan(unitKey: string, kodeDana: string, total: number): Promise<string[]> {
  const kepala = PERAN_KEPALA_UNIT[unitKey] ?? 'ketua';
  const jenjang = [kepala, 'bendahara'];
  const danaBos = kodeDana === 'BOS' || kodeDana === 'BOSP_MADRASAH';
  const ambang = await bacaAngkaSetting(SETTING_AMBANG_PENGADAAN, AMBANG_PENGADAAN_BAWAAN);
  if (!danaBos && total > ambang && kepala !== 'ketua') jenjang.push('ketua');
  return jenjang;
}

/** Penghapusan: sarpras → kepala unit → ketua yayasan. */
export function jenjangPenghapusan(unitKey: string): string[] {
  const kepala = PERAN_KEPALA_UNIT[unitKey] ?? 'ketua';
  return kepala === 'ketua' ? ['sarpras', 'ketua'] : ['sarpras', kepala, 'ketua'];
}

export async function buatJenjang(entity: Entitas, entityId: bigint, roles: string[], unitId: number | null) {
  await prisma.approvalStep.createMany({
    data: roles.map((roleKey, i) => ({ entity, entityId, order: i + 1, roleKey, unitId })),
  });
}

/** Tahap berikutnya yang belum diputus (null = semua sudah diputus). */
export async function tahapBerikutnya(entity: Entitas, entityId: bigint) {
  return prisma.approvalStep.findFirst({ where: { entity, entityId, decision: null }, orderBy: { order: 'asc' } });
}

/**
 * Putuskan tahap aktif. Hanya pemegang peran tahap itu (atau superadmin) yang
 * boleh — izin aksi (`*_approve`) dicek pemanggil lewat requireAction.
 * Mengembalikan 'Ditolak' | 'Lanjut' | 'Selesai'.
 */
export async function putuskanTahap(session: SessionPayload, entity: Entitas, entityId: bigint, setuju: boolean, note: string | null) {
  const tahap = await tahapBerikutnya(entity, entityId);
  if (!tahap) throw new Error('Tidak ada tahap persetujuan yang menunggu.');
  if (!isSuperAdmin(session) && !session.peran.includes(tahap.roleKey)) {
    throw new Error(`Tahap ini menunggu keputusan peran "${tahap.roleKey}".`);
  }
  await prisma.approvalStep.update({
    where: { id: tahap.id },
    data: { decidedBy: BigInt(session.userId), decision: setuju ? 'Setuju' : 'Tolak', note, decidedAt: new Date() },
  });
  if (!setuju) return 'Ditolak' as const;
  const sisa = await tahapBerikutnya(entity, entityId);
  return sisa ? ('Lanjut' as const) : ('Selesai' as const);
}

export async function jejakPersetujuan(entity: Entitas, ids: bigint[]) {
  if (ids.length === 0) return new Map<string, Awaited<ReturnType<typeof prisma.approvalStep.findMany>>>();
  const rows = await prisma.approvalStep.findMany({ where: { entity, entityId: { in: ids } }, orderBy: { order: 'asc' } });
  const map = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = String(r.entityId);
    map.set(k, [...(map.get(k) ?? []), r]);
  }
  return map;
}
