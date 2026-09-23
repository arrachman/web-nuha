import type { Prisma } from '@prisma/client';
import { isSuperAdmin, type SessionPayload } from '@/lib/auth';

/**
 * Cakupan unit (01-fondasi-auth-rbac-crud.md §4). `User.unitScope` lama tidak
 * pernah ditegakkan di query mana pun — helper ini yang menegakkannya.
 *
 * - superadmin atau `unitIds` null → tidak difilter (`{}`), perilaku lama.
 * - `unitIds` array → filter `{ [field]: { in: unitIds } }`; array kosong berarti
 *   user tidak ditempatkan di unit mana pun, jadi filter sengaja tidak pernah cocok.
 *
 * Dipakai di query presensi, aset, rekrutmen, induk, akademik, kepegawaian.
 * `field` menyesuaikan nama kolom unit di model masing-masing (default `unitId`).
 */
export function whereUnit(
  session: SessionPayload,
  field = 'unitId',
): Record<string, unknown> {
  if (isSuperAdmin(session)) return {};
  if (session.unitIds == null) return {};
  if (session.unitIds.length === 0) return { [field]: { in: [-1] } };
  return { [field]: { in: session.unitIds } };
}

/**
 * Wajib dipanggil di Server Action mutasi yang menerima `unitId` dari client
 * (FormData/body), BUKAN hanya saat menampilkan — supaya kepala SMP tidak bisa
 * mengubah data unit MA lewat form yang dimanipulasi (nilai `unitId` disisipkan
 * manual). Melempar Error bila unit target di luar cakupan.
 */
export function assertUnit(session: SessionPayload, unitId: number | null | undefined): void {
  if (isSuperAdmin(session)) return;
  if (session.unitIds == null) return; // null = seluruh unit
  if (unitId == null) return; // data tanpa unit (mis. YAYASAN via field lain) diatur pemanggil
  if (!session.unitIds.includes(unitId)) {
    throw new Error('Unit di luar cakupan akses Anda.');
  }
}

/** Ambil nilai unitId tunggal dari FormData dengan validasi cakupan sekaligus. */
export function readAndAssertUnitId(
  session: SessionPayload,
  formData: FormData,
  fieldName = 'unitId',
): number | null {
  const raw = formData.get(fieldName);
  if (raw == null || raw === '') return null;
  const unitId = Number(raw);
  if (!Number.isFinite(unitId)) throw new Error(`Nilai ${fieldName} tidak valid.`);
  assertUnit(session, unitId);
  return unitId;
}

export type UnitWhereInput = Prisma.UnitWhereInput;
