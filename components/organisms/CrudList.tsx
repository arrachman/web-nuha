'use client';

import { useState } from 'react';
import { CrudPanel } from '@/components/CrudPanel';
import { FilterBar, LimitPicker, Pagination } from '@/components';
import type { ClientEntity, Row } from '@/lib/crud/types';

type Props = {
  entity: ClientEntity;
  initialRows: Row[];
  initialHalaman: number;
  initialLimit: number;
  initialTotal: number;
  initialFilters: Record<string, string>;
  hrefBase: string;
};

type ListResponse = { success: boolean; data?: { rows: Row[]; total: number }; error?: { message?: string } };

const queryFor = (halaman: number, limit: number, filters: Record<string, string>) => {
  const query = new URLSearchParams({ halaman: String(halaman), limit: String(limit), ...filters });
  return query.toString();
};

/** Filter, tabel, dan pagination sebuah entitas: klik pager, ganti limit, atau
 * ubah filter hanya mem-fetch ulang daftarnya lewat `/api/crud/[entity]`
 * (bukan navigasi App Router), jadi filter dan pager sendiri tidak ikut reload. */
export function CrudList({ entity, initialRows, initialHalaman, initialLimit, initialTotal, initialFilters, hrefBase }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [halaman, setHalaman] = useState(initialHalaman);
  const [limit, setLimit] = useState(initialLimit);
  const [total, setTotal] = useState(initialTotal);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const muat = async (nextHalaman: number, nextLimit: number, nextFilters: Record<string, string>) => {
    if (loading) return;
    setLoading(true);
    setMessage('');
    const query = queryFor(nextHalaman, nextLimit, nextFilters);
    try {
      const response = await fetch(`/api/crud/${entity.key}?${query}`);
      const result = await response.json() as ListResponse;
      if (!result.success || !result.data) throw new Error(result.error?.message ?? 'Gagal memuat daftar.');
      setRows(result.data.rows);
      setTotal(result.data.total);
      setHalaman(nextHalaman);
      setLimit(nextLimit);
      setFilters(nextFilters);
      window.history.pushState(null, '', `${hrefBase}?${query}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal memuat daftar.');
    } finally {
      setLoading(false);
    }
  };

  const totalHalaman = Math.max(1, Math.ceil(total / limit));
  return <>
    <FilterBar entity={entity} hrefBase={hrefBase} filters={filters} limit={limit} onFilterChange={(nextFilters) => void muat(1, limit, nextFilters)} />
    <div aria-busy={loading}>
      {message && <p className="muted" role="status" style={{ marginBottom: 8 }}>{message}</p>}
      <CrudPanel entity={entity} rows={rows} />
      <Pagination
        halaman={halaman}
        totalHalaman={totalHalaman}
        total={total}
        jumlahBaris={rows.length}
        ukuranHalaman={limit}
        onPageChange={(nextHalaman) => void muat(nextHalaman, limit, filters)}
        ekstra={<LimitPicker limit={limit} onLimitChange={(nextLimit) => void muat(1, nextLimit, filters)} />}
      />
    </div>
  </>;
}
