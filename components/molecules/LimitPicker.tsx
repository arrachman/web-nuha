'use client';

import { OPSI_LIMIT } from '@/components/utils/pagination';

/** Dropdown "baris per halaman" — kembali ke halaman 1 saat limit berubah. */
type Props = { limit: number; hrefBase?: string; query?: string; param?: string; hash?: string; onLimitChange?: (limit: number) => void };

export function LimitPicker({ limit, hrefBase, query = '', param = 'limit', hash = '', onLimitChange }: Props) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }} className="muted">
      Baris per halaman
      <select
        value={limit}
        onChange={(event) => (onLimitChange ? onLimitChange(Number(event.target.value)) : window.location.assign(`${hrefBase}?${param}=${event.target.value}${query}${hash}`))}
        style={{ padding: '5px 8px', border: '1px solid var(--garis-input)', borderRadius: 8, fontSize: 12.5 }}
      >
        {OPSI_LIMIT.map((opsi) => <option key={opsi} value={opsi}>{opsi}</option>)}
      </select>
    </label>
  );
}
