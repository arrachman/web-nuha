'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { ClientEntity, ClientField, Column, Keterkaitan, Row } from '@/lib/crud/types';
import { InputField } from '@/components/molecules/InputField';

const IkonTambah = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>;
const IkonUbah = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 20h4L19.5 8.5a2.12 2.12 0 0 0-3-3L5 17v3Z" /><path d="M14.5 6.5l3 3" /></svg>;
const IkonHapus = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 7h16" /><path d="M10 4h4" /><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" /><path d="M10 11v6M14 11v6" /></svg>;
const IkonTutup = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>;

/** Grup yang dilipat secara bawaan: isian pelengkap, bukan data utama. */
const GRUP_CIUT = new Set(['Data pribadi']);

const IkonLipat = ({ terbuka }: { terbuka: boolean }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ transform: terbuka ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s' }}><path d="M9 6l6 6-6 6" /></svg>;

const display = (value: unknown, refOptions?: ClientField['refOptions']) => {
  if (value === null || value === undefined || value === '') return '—';
  if (refOptions) {
    const match = refOptions.find((option) => option.id === String(value));
    if (match) return match.label;
  }
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
  const text = String(value);
  return /^\d{4}-\d{2}-\d{2}T/.test(text) ? new Date(text).toLocaleDateString('id-ID') : text;
};

/** Sel tabel: badge bila kolomnya bernada, plus baris kedua opsional. */
function Sel({ row, column, refOptions }: { row: Row; column: Column; refOptions?: ClientField['refOptions'] }) {
  const utama = display(row[column.name], refOptions);
  const sub = column.subName ? display(row[column.subName]) : null;
  const nada = column.badge?.[String(row[column.name])];
  return <>
    {nada ? <span className={`badge badge-${nada}`}>{utama}</span> : utama}
    {column.subName && <span className="sel-sub">{sub}</span>}
  </>;
}

/** Kelompokkan field sesuai `group`; yang tanpa grup jatuh ke "Data utama". */
function kelompokkan(fields: ClientField[]): { judul: string; fields: ClientField[] }[] {
  const urutan: string[] = [];
  const peta = new Map<string, ClientField[]>();
  for (const field of fields) {
    const judul = field.group ?? 'Data utama';
    if (!peta.has(judul)) { peta.set(judul, []); urutan.push(judul); }
    peta.get(judul)!.push(field);
  }
  return urutan.map((judul) => ({ judul, fields: peta.get(judul)! }));
}

/** Peran lintas modul milik satu baris: badge + tautan ke modul asalnya. */
function PanelKeterkaitan({ kait }: { kait: Keterkaitan[] }) {
  return <div className="kait-panel">
    <p className="kait-judul">Terhubung ke modul lain</p>
    {kait.length === 0
      ? <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Belum dipakai modul mana pun — identitas ini berdiri sendiri. Daftarkan lewat modul Santri atau Kepegawaian bila perlu.</p>
      : <ul className="kait-daftar">
          {kait.map((item, i) => <li key={`${item.label}-${i}`}>
            <span className={`badge badge-${item.nada ?? 'netral'}`}>{item.label}</span>
            <span className="kait-detail">{item.detail}</span>
            {item.href && <a className="kait-tautan" href={item.href}>Buka modul →</a>}
          </li>)}
        </ul>}
  </div>;
}

/** Nilai field yang men-drive `tampilBila` milik field lain. */
function nilaiPemicu(fields: ClientField[], dipilih: Record<string, string>, row?: Row | null): Record<string, string> {
  const hasil: Record<string, string> = {};
  for (const field of fields) {
    if (!field.tampilBila) continue;
    const pemicu = fields.find((item) => item.name === field.tampilBila!.field);
    if (!pemicu) continue;
    // Saat mengubah baris, nilai tersimpan jadi titik awal — tanpa itu field
    // lanjutan (NIS, NIP, daftar wali) tersembunyi walau perannya sudah ada.
    hasil[pemicu.name] = dipilih[pemicu.name] ?? String(row?.[pemicu.name] ?? '');
  }
  return hasil;
}

export function CrudPanel({ entity, rows: initialRows }: { entity: ClientEntity; rows: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  useEffect(() => setRows(initialRows), [initialRows]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [pilihan, setPilihan] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [dibuka, setDibuka] = useState<Set<string>>(new Set());
  const refByField = new Map(entity.fields.filter((field) => field.refOptions).map((field) => [field.name, field.refOptions]));
  const adaKait = rows.some((row) => row._kait);
  const pemicu = nilaiPemicu(entity.fields, pilihan, editing);

  async function send(method: 'POST' | 'PATCH' | 'DELETE', payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const response = await fetch(`/api/crud/${entity.key}`, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!result.success) return setMessage(result.error?.message ?? 'Operasi gagal.');

      const daftar = await fetch(`/api/crud/${entity.key}`);
      const hasilDaftar = await daftar.json();
      if (!hasilDaftar.success) return setMessage(hasilDaftar.error?.message ?? 'Gagal memuat daftar terbaru.');

      setRows(hasilDaftar.data);
      setMessage(method === 'DELETE' ? 'Data dihapus.' : 'Data tersimpan.');
      setOpen(false);
      setEditing(null);
    } catch {
      setMessage('Koneksi bermasalah. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  /**
   * Field peran hanya relevan saat membuat baris baru, dan turunannya hanya
   * saat perannya cocok — sisanya bikin form panjang tanpa guna.
   */
  const terlihat = (field: ClientField) => {
    if (field.tersembunyi || field.hanyaFilter) return false;
    if (field.hanyaBaru && editing) return false;
    if (!field.tampilBila) return true;
    // Pemicu bisa berisi beberapa nilai (peran ganda) — dipisah koma.
    const nilai = (pemicu[field.tampilBila.field] ?? '').split(',').filter(Boolean);
    return nilai.some((item) => field.tampilBila!.sama.includes(item));
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {};
    for (const field of entity.fields) {
      // `tersembunyi` tetap dikirim: inputnya dirender ikut field pasangannya.
      if (!field.tersembunyi && !terlihat(field)) continue;
      if (field.type === 'boolean') payload[field.name] = form.get(field.name) === 'on';
      // Kotak centang mengirim satu entri per pilihan; gabungkan jadi daftar koma.
      else if (field.type === 'pilihan-banyak') payload[field.name] = form.getAll(field.name).join(',');
      else payload[field.name] = form.get(field.name);
      // Field virtual dilewati validasi server (`coerce`), jadi yang wajib
      // dijaga di sini — mis. wali yang harus punya minimal satu santri.
      if (field.virtual && field.required && field.type === 'orang-banyak') {
        const isi = String(payload[field.name] ?? '');
        if (!isi || isi === '[]') return setMessage(`${field.label} wajib diisi minimal satu.`);
      }
    }
    if (editing) payload.id = editing.id;
    await send(editing ? 'PATCH' : 'POST', payload);
  }

  return <div className="card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <h3 className="card-judul" style={{ margin: 0 }}>{entity.label}</h3>
      <button className="btn" type="button" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, padding: 0 }} onClick={() => { setEditing(null); setPilihan({}); setDibuka(new Set()); setOpen(!open); setMessage(''); }} data-testid={`tambah-${entity.key}`} aria-label={open && !editing ? 'Tutup form' : `Tambah ${entity.label.toLowerCase()}`} title={open && !editing ? 'Tutup form' : `Tambah ${entity.label.toLowerCase()}`}><IkonTambah /></button>
    </div>
    {message && <p className="muted" role="status" style={{ marginTop: 8 }}>{message}</p>}

    {(open || editing) && <div className="modal-overlay" onClick={() => { setEditing(null); setOpen(false); }}>
      <div className={entity.formLebar ? 'modal modal-lebar' : 'modal'} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3 style={{ margin: 0 }}>{editing ? `Ubah ${entity.label.toLowerCase()}` : `Tambah ${entity.label.toLowerCase()}`}</h3>
            {editing && <p className="muted" style={{ fontSize: 12.5, margin: '4px 0 0' }}>{String(editing.fullName ?? editing.nama ?? editing.label ?? `ID ${editing.id}`)}</p>}
          </div>
          <button className="btn btn-sekunder btn-icon" type="button" onClick={() => { setEditing(null); setOpen(false); }} title="Tutup" aria-label="Tutup"><IkonTutup /></button>
        </div>
        {entity.deskripsi && <p className="kait-deskripsi">{entity.deskripsi}</p>}
        <form onSubmit={submit} data-testid={`form-${entity.key}`}>
          {kelompokkan(entity.fields.filter(terlihat)).map((grup) => {
          const bisaLipat = GRUP_CIUT.has(grup.judul);
          const terbuka = !bisaLipat || dibuka.has(grup.judul);
          return <fieldset className="grup-form" key={grup.judul}>
          <legend>
            {bisaLipat
              ? <button className="grup-lipat" type="button" aria-expanded={terbuka} onClick={() => setDibuka((prev) => {
                  const next = new Set(prev);
                  if (next.has(grup.judul)) next.delete(grup.judul); else next.add(grup.judul);
                  return next;
                })}><IkonLipat terbuka={terbuka} />{grup.judul}</button>
              : grup.judul}
          </legend>
          {/* Dilipat pakai `display: none`, bukan unmount — nilai isian tetap
              terkirim walau grupnya sedang tertutup. */}
          <div className={`grid ${entity.formLebar ? 'g3' : 'g2'} grid-form`} style={terbuka ? undefined : { display: 'none' }}>
            {grup.fields.map((field) => {
              const pasangan = field.pasangan ? entity.fields.find((item) => item.name === field.pasangan) : undefined;
              // Form 2 kolom: span > 1 = selebar baris. Form 3 kolom: span 2
              // memakai dua kolom, span 3 selebar baris.
              const kolom = entity.formLebar ? 3 : 2;
              const lebar = field.span && field.span > 1
                ? { gridColumn: field.span >= kolom ? '1 / -1' : `span ${field.span}` }
                : undefined;
              return <div className="field" key={field.name} style={lebar}>
                <label id={`${entity.key}-${field.name}-label`} htmlFor={`${entity.key}-${field.name}`}>
                  {field.label}
                  {field.required && <span className="wajib" title="Wajib diisi"> *</span>}
                </label>
                {pasangan
                  ? <div className="field-pasangan">
                      <InputField field={field} id={`${entity.key}-${field.name}`} row={editing ?? undefined} />
                      <span aria-hidden>/</span>
                      <InputField field={pasangan} id={`${entity.key}-${pasangan.name}`} row={editing ?? undefined} />
                    </div>
                  : <InputField
                      field={field}
                      id={`${entity.key}-${field.name}`}
                      row={editing ?? undefined}
                      onPilih={field.name in pemicu ? (value) => setPilihan((prev) => ({ ...prev, [field.name]: value })) : undefined}
                    />}
                {field.hint && <p className="petunjuk">{field.hint}</p>}
              </div>;
            })}
          </div>
          </fieldset>;
          })}
          {/* Keterkaitan adalah konteks, bukan isian — taruh setelah field
              supaya mata operator langsung jatuh ke form. */}
          {editing?._kait && <PanelKeterkaitan kait={editing._kait} />}
          <div className="modal-aksi">
            <button className="btn btn-sekunder" type="button" onClick={() => { setEditing(null); setOpen(false); }}>Batal</button>
            <button className="btn" disabled={busy} type="submit">{busy ? 'Menyimpan…' : editing ? 'Simpan perubahan' : 'Simpan'}</button>
          </div>
        </form>
      </div>
    </div>}

    <div className="tabel-wrap">
      <table className="table-compact" style={{ marginTop: 12 }}>
        <thead><tr>
          {entity.columns.map((column) => <th key={column.name}>{column.label}</th>)}
          {adaKait && <th>Peran</th>}
          <th style={{ textAlign: 'center', width: 1, whiteSpace: 'nowrap' }}>Aksi</th>
        </tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={entity.columns.length + (adaKait ? 2 : 1)} className="empty">Tidak ada data yang cocok.</td></tr>}
          {rows.map((row) => <tr key={row.id} data-testid={`row-${entity.key}`}>
            {entity.columns.map((column) => <td key={column.name}><Sel row={row} column={column} refOptions={refByField.get(column.name)} /></td>)}
            {adaKait && <td><span className="kait-sel">
              {(row._kait ?? []).length === 0
                ? <span className="muted">—</span>
                : row._kait!.map((item, i) => <span key={`${item.label}-${i}`} className={`badge badge-${item.nada ?? 'netral'}`} title={item.detail}>{item.label}</span>)}
            </span></td>}
            <td style={{ width: 1, whiteSpace: 'nowrap' }}><div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
              <button className="btn btn-sekunder btn-icon" type="button" disabled={busy} title="Ubah" aria-label="Ubah" onClick={() => { setEditing(row); setPilihan({}); setDibuka(new Set()); setOpen(true); setMessage(''); }}><IkonUbah /></button>
              <button className="btn btn-sekunder btn-icon btn-icon-bahaya" type="button" disabled={busy} title="Hapus" aria-label="Hapus" onClick={() => { if (window.confirm(`Hapus ${entity.label.toLowerCase()} ini?`)) void send('DELETE', { id: row.id }); }}><IkonHapus /></button>
            </div></td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </div>;
}
