'use client';

import { FormEvent, useState } from 'react';
import { apiPath } from '@/lib/api-path';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { FormField } from '@/components/molecules/FormField';

export function WaTestForm({ templates }: { templates: Array<{ kode: string; judul: string }> }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const response = await fetch(apiPath('/api/wa/kirim'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) });
    const result = await response.json();
    setMessage(result.error?.message ?? `Status: ${result.data?.status ?? 'OK'}`);
    setBusy(false);
  }
  return <form onSubmit={submit} className="card" style={{ marginTop: 16 }}>
    <h3>Kirim uji</h3><p className="muted">Pesan dikirim lewat gateway SentiWA dari nomor pengirim terdaftar. Selama mode uji, semua nomor tujuan dialihkan ke nomor uji 085607550989.</p>
    <div className="grid g3"><FormField label="Template" htmlFor="templateKode"><Select id="templateKode" name="templateKode" required><option value="">Pilih template</option>{templates.map((item) => <option key={item.kode} value={item.kode}>{item.kode} · {item.judul}</option>)}</Select></FormField><FormField label="Nomor WhatsApp" htmlFor="nomor"><Input id="nomor" name="nomor" placeholder="0812..." required /></FormField><FormField label="Tujuan" htmlFor="tujuan"><Input id="tujuan" name="tujuan" placeholder="Nama penerima" required /></FormField></div>
    <Button disabled={busy}>{busy ? 'Mengirim…' : 'Kirim pesan'}</Button>{message && <p className="muted" role="status" style={{ marginTop: 10 }}>{message}</p>}
  </form>;
}