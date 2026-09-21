'use client';

import { FormEvent, useState } from 'react';

export function WaTestForm({ templates }: { templates: Array<{ kode: string; judul: string }> }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/wa/kirim', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) });
    const result = await response.json();
    setMessage(result.error?.message ?? `Status: ${result.data?.status ?? 'OK'}`);
    setBusy(false);
  }
  return <form onSubmit={submit} className="card" style={{ marginTop: 16 }}>
    <h3>Kirim uji</h3><p className="muted">Mode dry-run aktif secara default; pesan tidak keluar gateway sampai WA_DRY_RUN=false.</p>
    <div className="grid g3"><div className="field"><label htmlFor="templateKode">Template</label><select id="templateKode" name="templateKode" required><option value="">Pilih template</option>{templates.map((item) => <option key={item.kode} value={item.kode}>{item.kode} · {item.judul}</option>)}</select></div><div className="field"><label htmlFor="nomor">Nomor WhatsApp</label><input id="nomor" name="nomor" placeholder="0812..." required /></div><div className="field"><label htmlFor="tujuan">Tujuan</label><input id="tujuan" name="tujuan" placeholder="Nama penerima" required /></div></div>
    <button className="btn" disabled={busy}>{busy ? 'Mengirim…' : 'Kirim pesan'}</button>{message && <p className="muted" role="status" style={{ marginTop: 10 }}>{message}</p>}
  </form>;
}
