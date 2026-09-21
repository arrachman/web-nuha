import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth';
import { recordAudit, requestIp } from '@/lib/audit';
import { castId, coerce, countRows, delegateFor, listRows, serialize } from '@/lib/crud/engine';
import { getEntity } from '@/lib/crud/registry';
import { validateActiveVillage, validateDomesticAddressExclusivity } from '@/lib/wilayah';

const idSchema = z.string().regex(/^\d+$/);

async function authorize(entityKey: string) {
  const session = await readSession();
  const entity = getEntity(entityKey);
  if (!session || !entity) return { session: null, entity: null, denied: true };
  const granted = entity.menu === 'dashboard' || await prisma.menuRole.count({ where: { menu: { key: entity.menu }, role: { key: { in: session.peran } } } });
  return { session, entity, denied: granted === 0 };
}

function responseError(message: string, status: number) {
  return Response.json({ success: false, data: null, error: { code: status === 403 ? 'FORBIDDEN' : 'VALIDATION_ERROR', message } }, { status });
}

function regionValue(entity: NonNullable<ReturnType<typeof getEntity>>, data: Record<string, unknown>) {
  const regionField = entity.fields.find((field) => field.type === 'wilayah');
  return regionField ? data[regionField.name] : undefined;
}

export async function GET(request: Request, context: { params: Promise<{ entity: string }> }) {
  const { entity: key } = await context.params;
  const auth = await authorize(key);
  if (auth.denied || !auth.entity) return responseError('Tidak berwenang.', auth.entity ? 403 : 404);

  const url = new URL(request.url);
  if (!url.searchParams.has('halaman') && !url.searchParams.has('limit')) {
    return Response.json({ success: true, data: await listRows(auth.entity), error: null });
  }

  const halaman = Math.max(1, z.coerce.number().int().catch(1).parse(url.searchParams.get('halaman')));
  const requestedLimit = z.coerce.number().int().catch(10).parse(url.searchParams.get('limit'));
  const limit = [10, 25, 50, 100].includes(requestedLimit) ? requestedLimit : 10;
  const filters: Record<string, string> = {};
  const q = url.searchParams.get('q');
  if (q) filters.q = q;
  for (const field of auth.entity.fields) {
    const value = url.searchParams.get(field.name) ?? field.filterDefault;
    if (value) filters[field.name] = value;
  }

  const [rows, total] = await Promise.all([
    listRows(auth.entity, halaman, limit, filters),
    countRows(auth.entity, filters),
  ]);
  return Response.json({ success: true, data: { rows, total }, error: null });
}

export async function POST(request: Request, context: { params: Promise<{ entity: string }> }) {
  const { entity: key } = await context.params;
  const auth = await authorize(key);
  if (auth.denied || !auth.entity || !auth.session) return responseError('Tidak berwenang.', auth.entity ? 403 : 404);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return responseError('Data tidak valid.', 400);
  const parsed = coerce(auth.entity, body as Record<string, unknown>);
  if (parsed.errors.length) return responseError(parsed.errors[0], 400);
  const wilayahError = await validateActiveVillage(regionValue(auth.entity, parsed.data));
  if (wilayahError) return responseError(wilayahError, 400);
  try {
    const row = await delegateFor(auth.entity).create({ data: parsed.data });
    // Field virtual (mis. pilihan peran orang) ditindaklanjuti setelah barisnya ada.
    if (auth.entity.sesudahBuat) {
      await auth.entity.sesudahBuat(String(row.id), body as Record<string, unknown>, { id: auth.session.userId, nama: auth.session.nama });
    }
    await recordAudit({ aksi: 'CRUD_CREATE', entitas: auth.entity.model, entitasId: String(row.id), ringkasan: `Membuat ${auth.entity.label}`, perubahan: parsed.data, aktor: { id: auth.session.userId, nama: auth.session.nama }, ip: requestIp(request) });
    return Response.json({ success: true, data: serialize(row), error: null }, { status: 201 });
  } catch (error) {
    return responseError(error instanceof Error ? error.message : 'Gagal menyimpan data.', 400);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ entity: string }> }) {
  return updateOrDelete(request, context, 'update');
}

export async function DELETE(request: Request, context: { params: Promise<{ entity: string }> }) {
  return updateOrDelete(request, context, 'delete');
}

async function updateOrDelete(request: Request, context: { params: Promise<{ entity: string }> }, action: 'update' | 'delete') {
  const { entity: key } = await context.params;
  const auth = await authorize(key);
  if (auth.denied || !auth.entity || !auth.session) return responseError('Tidak berwenang.', auth.entity ? 403 : 404);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const idResult = idSchema.safeParse(body?.id);
  if (!idResult.success) return responseError('ID tidak valid.', 400);
  const delegate = delegateFor(auth.entity);
  try {
    const data = action === 'delete' ? await delegate.delete({ where: { id: castId(auth.entity, idResult.data) } }) : await (async () => {
      const parsed = coerce(auth.entity, body ?? {}, true);
      if (parsed.errors.length) throw new Error(parsed.errors[0]);
      const wilayahError = await validateActiveVillage(regionValue(auth.entity, parsed.data));
      if (wilayahError) throw new Error(wilayahError);
      if (auth.entity.model === 'person') {
        const exclusivityError = await validateDomesticAddressExclusivity(castId(auth.entity, idResult.data) as bigint, parsed.data);
        if (exclusivityError) throw new Error(exclusivityError);
      }
      return delegate.update({ where: { id: castId(auth.entity, idResult.data) }, data: parsed.data });
    })();
    const row = await data;
    // Field virtual (peran orang) diselaraskan setelah kolomnya tersimpan.
    if (action === 'update' && auth.entity.sesudahUbah) {
      await auth.entity.sesudahUbah(idResult.data, body ?? {}, { id: auth.session.userId, nama: auth.session.nama });
    }
    await recordAudit({ aksi: action === 'delete' ? 'CRUD_DELETE' : 'CRUD_UPDATE', entitas: auth.entity.model, entitasId: idResult.data, ringkasan: `${action === 'delete' ? 'Menghapus' : 'Mengubah'} ${auth.entity.label}`, aktor: { id: auth.session.userId, nama: auth.session.nama }, ip: requestIp(request) });
    return Response.json({ success: true, data: serialize(row), error: null });
  } catch (error) {
    return responseError(pesanGagal(error, auth.entity.label, action), 400);
  }
}

/**
 * Prisma melempar P2003 saat baris masih dirujuk tabel lain (mis. mata pelajaran
 * yang dipakai capaian pembelajaran). Tampilkan alasannya, bukan pesan internal.
 */
function pesanGagal(error: unknown, label: string, action: 'update' | 'delete'): string {
  const teks = error instanceof Error ? error.message : '';
  if (teks.includes('Foreign key constraint')) {
    return `${label} ini masih dipakai data lain, jadi tidak bisa dihapus. Hapus atau alihkan data yang merujuknya lebih dulu.`;
  }
  if (teks.includes('Record to') && teks.includes('not found')) return `${label} tidak ditemukan.`;
  return teks || (action === 'delete' ? 'Gagal menghapus data.' : 'Gagal mengubah data.');
}
