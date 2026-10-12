'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { FormField } from '@/components/molecules/FormField';
import { apiPath } from '@/lib/api-path';

export function DaftarPpdb() {
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(''); setIsSaving(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch(apiPath('/api/ppdb'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) });
    const result = await response.json(); setIsSaving(false);
    if (!response.ok) return setMessage(result.error?.message ?? 'Pendaftaran gagal.');
    event.currentTarget.reset(); setMessage(`Pendaftaran diterima. Nomor registrasi: ${result.data.noReg}`);
  }
  return <form onSubmit={submit} className="card" style={{ maxWidth: 680 }}>
    <h3>Daftar PPDB Online</h3><p className="muted">Isi data awal, panitia akan memverifikasi berkas Anda.</p>
    {message && <div className={message.startsWith('Pendaftaran diterima') ? 'badge badge-hijau' : 'error'} style={{ margin: '12px 0', display: 'block' }}>{message}</div>}
    <div className="grid g2"><FormField label="Nama lengkap" htmlFor="nama"><Input id="nama" name="nama" required maxLength={160} /></FormField><FormField label="Jenis kelamin" htmlFor="jk"><Select id="jk" name="jk" required><option value="L">Putra</option><option value="P">Putri</option></Select></FormField></div>
    <div className="grid g2"><FormField label="Pilihan unit" htmlFor="pilihan"><Select id="pilihan" name="pilihan" required><option value="SMP">SMP Nurul Huda</option><option value="MA">MA Nurul Huda</option><option value="Pondok">Pondok Pesantren</option></Select></FormField><FormField label="Asal sekolah" htmlFor="asalSekolah"><Input id="asalSekolah" name="asalSekolah" maxLength={160} /></FormField></div>
    <FormField label="Nomor HP wali" htmlFor="hpWali"><Input id="hpWali" name="hpWali" inputMode="tel" required maxLength={20} /></FormField>
    <Button disabled={isSaving}>{isSaving ? 'Mengirim…' : 'Kirim pendaftaran'}</Button>
  </form>;
}