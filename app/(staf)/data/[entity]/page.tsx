import { notFound } from 'next/navigation';
import { requirePage } from '@/lib/access';
import { CrudList, bacaHalaman, bacaLimit, satu } from '@/components';
import { getEntity } from '@/lib/crud/registry';
import { listRows, countRows, toClientEntity } from '@/lib/crud/engine';
import { RingkasanSantri } from '../ringkasan-santri';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function EntityPage({ params, searchParams }: { params: Promise<{ entity: string }>; searchParams: SearchParams }) {
  const { entity: key } = await params;
  const entity = getEntity(key);
  if (!entity) notFound();
  // The registry names the menu, so the existing grant check gates CRUD too.
  await requirePage(entity.menu);
  const sp = await searchParams;
  const halaman = bacaHalaman(sp);
  const limit = bacaLimit(sp);
  const filters: Record<string, string> = {};
  const q = satu(sp.q);
  if (q) filters.q = q;
  for (const field of entity.fields) {
    // Tanpa parameter di URL, filter berbawaan (mis. Status = Aktif) yang
    // berlaku; "Semua" mengirim nilai eksplisit untuk membatalkannya.
    const value = satu(sp[field.name]) || field.filterDefault;
    if (value) filters[field.name] = value;
  }
  const [rows, total, clientEntity] = await Promise.all([
    listRows(entity, halaman, limit, filters),
    countRows(entity, filters),
    toClientEntity(entity),
  ]);
  return <>
    {key === 'santri' && <RingkasanSantri filters={filters} />}
    <CrudList
      entity={clientEntity}
      initialRows={rows}
      initialHalaman={halaman}
      initialLimit={limit}
      initialTotal={total}
      initialFilters={filters}
      hrefBase={`/data/${key}`}
    />
  </>;
}
