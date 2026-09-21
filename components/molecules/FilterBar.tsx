'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import type { ClientEntity } from '@/lib/crud/types';
import { SEMUA } from '@/lib/crud/filter-nilai';

/** Jeda sebelum ketikan pada kotak cari ikut memicu filter. */
const JEDA_CARI_MS = 400;

type Props = {
  entity: ClientEntity;
  hrefBase?: string;
  filters: Record<string, string>;
  limit: number;
  /** Bila diisi, filter dikirim lewat callback (tanpa reload halaman) alih-alih submit GET biasa. */
  onFilterChange?: (filters: Record<string, string>) => void;
};

/** Bilah filter: cari teks bebas + dropdown per kolom select/vlookup. Submit GET biasa
 * kecuali `onFilterChange` diberikan, lalu filter dikirim lewat fetch tanpa reload. */
export function FilterBar({ entity, hrefBase, filters, limit, onFilterChange }: Props) {
  const filterableFields = entity.fields.filter((field) => (
    // Filter turunan relasi tidak punya kolom di tabel, tapi tetap boleh difilter.
    field.filterWhere
      ? Boolean(field.options?.length)
      : entity.columns.some((column) => column.name === field.name) && (field.refOptions || field.type === 'select')
  ));
  // Filter berbawaan (mis. Status = Aktif) tetap terhitung "aktif" hanya bila
  // operator memilih sesuatu selain bawaannya — reset mengembalikannya ke sana.
  const adaFilterAktif = Boolean(filters.q) || filterableFields.some((field) => filters[field.name] && filters[field.name] !== field.filterDefault);

  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nilai, setNilai] = useState<Record<string, string>>(filters);

  useEffect(() => setNilai(filters), [filters]);

  // Bersihkan timer debounce saat komponen dilepas agar tidak submit form yatim.
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const kirim = (nextNilai: Record<string, string>) => {
    if (onFilterChange) {
      onFilterChange(nextNilai);
      return;
    }
    formRef.current?.requestSubmit();
  };

  const ubahTeks = (nama: string, nilaiBaru: string) => {
    const nextNilai = { ...nilai, [nama]: nilaiBaru };
    setNilai(nextNilai);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => kirim(nextNilai), JEDA_CARI_MS);
  };

  const ubahPilihan = (nama: string, nilaiBaru: string) => {
    const nextNilai = { ...nilai, [nama]: nilaiBaru };
    setNilai(nextNilai);
    kirim(nextNilai);
  };

  const hapusNilai = (nama: string, nilaiKosong: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const nextNilai = { ...nilai, [nama]: nilaiKosong };
    setNilai(nextNilai);
    kirim(nextNilai);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    if (!onFilterChange) return;
    event.preventDefault();
  };

  return (
    <form ref={formRef} method="get" action={hrefBase} onSubmit={submit} className="card bilah-filter">
      <input type="hidden" name="limit" value={limit} />
      <div className="bilah-filter-kolom" style={{ flex: '1 1 260px', maxWidth: 420, position: 'relative' }}>
        <label htmlFor="filter-q">Cari</label>
        <input id="filter-q" type="text" name="q" value={nilai.q ?? ''} placeholder="Cari nama, kode, atau kata kunci…" onChange={(event) => ubahTeks('q', event.target.value)} />
        {Boolean(nilai.q) && (
          <button type="button" className="bilah-filter-hapus" title="Hapus pencarian" aria-label="Hapus pencarian" onClick={() => hapusNilai('q', '')}>×</button>
        )}
      </div>
      {filterableFields.map((field) => {
        const options = field.refOptions ?? (field.options ?? []).map((option) => ({ id: option, label: field.optionLabels?.[option] ?? option }));
        const nilaiKosong = field.filterDefault ? SEMUA : '';
        const nilaiSaatIni = nilai[field.name] ?? field.filterDefault ?? '';
        const adaNilai = nilaiSaatIni !== nilaiKosong;
        return <div className="bilah-filter-kolom" key={field.name} style={{ flex: '0 1 190px', position: 'relative' }}>
          <label htmlFor={`filter-${field.name}`}>{field.label}</label>
          <select id={`filter-${field.name}`} name={field.name} value={nilaiSaatIni} onChange={(event) => ubahPilihan(field.name, event.target.value)}>
            <option value={nilaiKosong}>Semua</option>
            {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
          {adaNilai && (
            <button type="button" className="bilah-filter-hapus" title={`Hapus filter ${field.label}`} aria-label={`Hapus filter ${field.label}`} onClick={() => hapusNilai(field.name, nilaiKosong)}>×</button>
          )}
        </div>;
      })}
      {adaFilterAktif && (
        <div className="bilah-filter-aksi">
          <a className="btn btn-sekunder" href={`${hrefBase}?limit=${limit}`} onClick={(event) => { event.preventDefault(); setNilai({}); kirim({}); }}>Reset</a>
        </div>
      )}
    </form>
  );
}
