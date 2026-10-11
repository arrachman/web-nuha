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

/** Cookie berisi unit yang sedang difokuskan lewat PemilihUnit di topbar. */
export const UNIT_AKTIF_COOKIE = 'nuha-unit-aktif';

/**
 * Unit fokus dari PemilihUnit (cookie), divalidasi terhadap cakupan sesi:
 * nilai di luar `unitIds` sesi dianggap tidak ada. null = "Semua Unit".
 * Ini filter tampilan di atas `whereUnit` — bukan pengganti batas akses.
 */
export async function getUnitAktif(session: SessionPayload): Promise<number | null> {
  const { cookies } = await import('next/headers');
  const raw = (await cookies()).get(UNIT_AKTIF_COOKIE)?.value;
  if (!raw) return null;
  const id = Number(raw);
  if (!Number.isFinite(id)) return null;
  if (isSuperAdmin(session) || session.unitIds == null) return id;
  return session.unitIds.includes(id) ? id : null;
}

/** Seperti `whereUnit`, tetapi dihormati lebih dulu unit fokus bila ada. */
export function whereUnitAktif(
  session: SessionPayload,
  unitAktif: number | null,
  field = 'unitId',
): Record<string, unknown> {
  if (unitAktif != null) {
    if (!isSuperAdmin(session) && session.unitIds != null && !session.unitIds.includes(unitAktif)) {
      return { [field]: { in: [-1] } };
    }
    return { [field]: unitAktif };
  }
  return whereUnit(session, field);
}

/** Filter relasi santri untuk model turunan (Invoice, Payment, dsb). */
export function filterSantriAktif(unitAktif: number | null): Record<string, unknown> {
  return unitAktif != null ? { santri: { unitId: unitAktif } } : {};
}

/**
 * Filter pegawai untuk unit fokus: unit utama ATAU penugasan tambahan
 * (`otherUnits`) — pola yang sama dengan `whereUnit` di kepegawaian.
 * Dibungkus AND supaya tidak bertabrakan dengan OR milik pemanggil.
 */
export function filterStaffAktif(unitAktif: number | null): Record<string, unknown> {
  return unitAktif != null
    ? { AND: [{ OR: [{ unitId: unitAktif }, { otherUnits: { some: { unitId: unitAktif } } }] }] }
    : {};
}

/** Key unit fokus (mis. "SMP") untuk model yang menyimpan key, bukan id (Applicant.choice). */
export async function getUnitAktifKey(session: SessionPayload): Promise<string | null> {
  const id = await getUnitAktif(session);
  if (id == null) return null;
  const { prisma } = await import('@/lib/prisma');
  const u = await prisma.unit.findUnique({ where: { id }, select: { key: true } });
  return u?.key ?? null;
}
