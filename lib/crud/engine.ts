import { prisma } from '@/lib/prisma';
import type { ClientEntity, Entity, Field, Row } from './types';
import { lampirkanKeterkaitan } from './keterkaitan';
import { SEMUA } from './filter-nilai';

export type Filters = Record<string, string>;

/** `person.fullName` → `{ person: { fullName: { contains: q } } }`. */
const wherePath = (path: string, q: string): Record<string, unknown> =>
  path.split('.').reverse().reduce<Record<string, unknown>>((acc, key, i) => ({ [key]: i === 0 ? { contains: q } : acc }), {});

/** OR-contains across text fields for `q`, exact match for select/ref fields. */
function buildWhere(entity: Entity, filters: Filters): Record<string, unknown> | undefined {
  const and: Record<string, unknown>[] = [];
  if (entity.whereDasar) and.push(entity.whereDasar);
  const q = filters.q?.trim();
  if (q) {
    const stringFields = entity.fields.filter((field) => !field.ref && !field.virtual && (field.type === 'text' || field.type === 'textarea')).map((field) => field.name);
    const cocok = [...stringFields.map((name) => ({ [name]: { contains: q } })), ...(entity.cariPath ?? []).map((path) => wherePath(path, q))];
    if (cocok.length) and.push({ OR: cocok });
  }
  for (const field of entity.fields) {
    const value = filters[field.name];
    if (!value || value === SEMUA) continue;
    // Filter turunan relasi (mis. kategori orang) membawa klausa `where`-nya
    // sendiri karena tidak punya kolom di tabel.
    if (field.filterWhere) {
      const klausa = field.filterWhere[value];
      if (klausa) and.push(klausa);
      continue;
    }
    if (field.virtual) continue;
    if (field.ref) and.push({ [field.name]: field.ref.idType === 'bigint' ? BigInt(value) : Number(value) });
    else if (field.type === 'select') and.push({ [field.name]: value });
  }
  return and.length ? { AND: and } : undefined;
}

type Delegate = {
  findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
  count: (args?: unknown) => Promise<number>;
  create: (args: unknown) => Promise<Record<string, unknown>>;
  update: (args: unknown) => Promise<Record<string, unknown>>;
  delete: (args: unknown) => Promise<Record<string, unknown>>;
};

export function delegateFor(entity: Entity): Delegate {
  const client = prisma as unknown as Record<string, Delegate>;
  const delegate = client[entity.model];
  if (!delegate) throw new Error(`Model "${entity.model}" tidak dikenal.`);
  return delegate;
}

export const castId = (entity: Entity, id: string) => (entity.idType === 'bigint' ? BigInt(id) : Number(id));

/** BigInt, Decimal, and Date have no JSON form, so flatten them for the client. */
export function serialize(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') {
    const source = value as { toFixed?: unknown };
    if (typeof source.toFixed === 'function') return Number(value);
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, serialize(item)]));
  }
  return value;
}

/** Reject unknown keys outright: only registry fields ever reach Prisma. */
export function coerce(entity: Entity, input: Record<string, unknown>, partial = false) {
  const data: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const field of entity.fields) {
    // Field virtual (mis. pilihan peran) ditangani hook `sesudahBuat`, bukan Prisma.
    if (field.virtual) continue;
    if (!(field.name in input)) {
      if (!partial && field.required) errors.push(`${field.label} wajib diisi.`);
      continue;
    }
    const raw = input[field.name];
    const blank = raw === '' || raw === null || raw === undefined;
    if (blank) {
      if (field.required) errors.push(`${field.label} wajib diisi.`);
      else data[field.name] = null;
      continue;
    }
    data[field.name] = convert(field, raw, errors);
  }

  return { data, errors };
}

function convert(field: Field, raw: unknown, errors: string[]): unknown {
  switch (field.type) {
    case 'number': {
      const parsed = Number(raw);
      if (Number.isNaN(parsed)) errors.push(`${field.label} harus berupa angka.`);
      return parsed;
    }
    case 'boolean':
      return raw === true || raw === 'true' || raw === 'on' || raw === 1 || raw === '1';
    case 'date':
    case 'datetime': {
      const parsed = new Date(field.type === 'date' ? `${String(raw).slice(0, 10)}T00:00:00Z` : String(raw));
      if (Number.isNaN(parsed.getTime())) errors.push(`${field.label} bukan tanggal yang sah.`);
      return parsed;
    }
    case 'select': {
      const value = String(raw);
      if (field.options && !field.options.includes(value)) errors.push(`${field.label} tidak valid.`);
      return value;
    }
    case 'pilihan-banyak': {
      // Daftar dipisah koma; tiap bagian harus salah satu opsi yang sah.
      const bagian = String(raw).split(',').map((item) => item.trim()).filter(Boolean);
      if (field.options && bagian.some((item) => !field.options!.includes(item))) errors.push(`${field.label} tidak valid.`);
      return bagian.join(',');
    }
    case 'wilayah': {
      const value = String(raw).trim();
      if (!/^\d+$/.test(value)) {
        errors.push(`${field.label} harus dipilih dari daftar desa yang tersedia.`);
        return null;
      }
      return BigInt(value);
    }
    default:
      return String(raw);
  }
}

export async function countRows(entity: Entity, filters: Filters = {}): Promise<number> {
  return delegateFor(entity).count({ where: buildWhere(entity, filters) });
}

export async function listRows(entity: Entity, halaman = 1, ukuranHalaman = 10, filters: Filters = {}): Promise<Row[]> {
  const rows = await delegateFor(entity).findMany({
    where: buildWhere(entity, filters),
    include: entity.include,
    orderBy: entity.orderBy,
    skip: (Math.max(1, halaman) - 1) * ukuranHalaman,
    take: ukuranHalaman,
  });
  const dasar = rows.map((row) => {
    const datar: Row = { ...(serialize(row) as Record<string, unknown>), id: String(row.id) };
    // Kolom bertitik (mis. `person.fullName`) diratakan di server supaya tabel klien
    // tetap membaca `row[column.name]` tanpa tahu bentuk relasinya.
    for (const path of kolomBertitik(entity)) datar[path] = serialize(readPath(datar, path));
    return datar;
  });
  return lampirkanKeterkaitan(entity, dasar);
}

const kolomBertitik = (entity: Entity) => {
  const dari = (name?: string) => (name && name.includes('.') ? [name] : []);
  return entity.columns.flatMap((column) => [...dari(column.name), ...dari(column.subName)]);
};

const readPath = (row: Record<string, unknown>, path: string): unknown =>
  path.split('.').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), row);

/** Loads `id -> label` options for a "vlookup" field, e.g. santri.unitId pointing at Unit.nama. */
async function loadRefOptions(ref: NonNullable<Field['ref']>): Promise<{ id: string; label: string }[]> {
  const client = prisma as unknown as Record<string, Delegate>;
  const delegate = client[ref.model];
  if (!delegate) throw new Error(`Model referensi "${ref.model}" tidak dikenal.`);
  const rows = await delegate.findMany({ include: ref.include, orderBy: ref.orderBy });
  return rows.map((row) => {
    const utama = String(readPath(row, ref.label) ?? row.id);
    const tambahan = ref.labelTambahan ? readPath(row, ref.labelTambahan) : undefined;
    return { id: String(row.id), label: tambahan ? `${utama} ${String(tambahan)}` : utama };
  });
}

export const toClientEntity = async (entity: Entity): Promise<ClientEntity> => ({
  key: entity.key,
  label: entity.label,
  deskripsi: entity.deskripsi,
  formLebar: entity.formLebar,
  fields: await Promise.all(entity.fields.map(async ({ ref, ...field }) => (
    ref ? { ...field, refOptions: await loadRefOptions(ref) } : field
  ))),
  columns: entity.columns,
});
