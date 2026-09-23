import { cache } from 'react';
import { can } from '@/lib/access';
import { isSuperAdmin, type SessionPayload } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/** Semua izin sarpras yang dipegang sesi ini, dimuat sekali per request. */
export const izinSarpras = cache(async (session: SessionPayload) => {
  const kunci = [
    'view', 'view_value', 'asset_manage', 'location_manage', 'master_manage', 'procure_request', 'procure_approve',
    'loan_request', 'loan_approve', 'damage_report', 'damage_handle', 'maintenance_manage', 'opname_run',
    'opname_close', 'dispose_request', 'dispose_approve', 'export',
  ] as const;
  const hasil = await Promise.all(kunci.map((k) => can(session, `sarpras.${k}`)));
  const izin = Object.fromEntries(kunci.map((k, i) => [k, hasil[i]])) as Record<(typeof kunci)[number], boolean>;
  return {
    ...izin,
    /** Pengelola = boleh melihat seluruh aset dalam cakupan unit, bukan cuma ruang PIC / aset pegangan. */
    pengelola: izin.view_value || izin.asset_manage || izin.damage_handle,
  };
});

export type IzinSarpras = Awaited<ReturnType<typeof izinSarpras>>;

/**
 * Filter aset yang boleh dilihat (05 §6 baris sarpras.view):
 * - pengelola (sarpras/kepala unit/bendahara/ketua/teknisi): aset milik unit dalam cakupan;
 * - guru/musyrif/pegawai: aset di ruang yang ia PIC-i + aset yang ia pegang.
 */
export async function whereAsetTerlihat(session: SessionPayload, izin: IzinSarpras): Promise<Record<string, unknown>> {
  if (isSuperAdmin(session)) return {};
  if (izin.pengelola) {
    if (session.unitIds == null) return {};
    return { ownerUnitId: { in: session.unitIds.length ? session.unitIds : [-1] } };
  }
  const staff = await prisma.staff.findFirst({ where: { person: { user: { id: BigInt(session.userId) } } }, select: { id: true } });
  if (!staff) return { id: -1n };
  return { OR: [{ holderStaffId: staff.id }, { location: { picStaffId: staff.id } }] };
}

/** Tegakkan cakupan unit pemilik aset untuk mutasi (sarpras SMP tidak boleh mengubah aset MA). */
export function assertUnitAset(session: SessionPayload, ownerUnitId: number): void {
  if (isSuperAdmin(session) || session.unitIds == null) return;
  if (!session.unitIds.includes(ownerUnitId)) throw new Error('Aset milik unit di luar cakupan akses Anda.');
}
