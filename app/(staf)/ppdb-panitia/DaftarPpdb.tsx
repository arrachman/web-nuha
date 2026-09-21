'use client';

import { FormEvent, useState } from 'react';

export function DaftarPpdb() {
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(''); setIsSaving(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/ppdb', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) });
    const result = await response.json(); setIsSaving(false);
    if (!response.ok) return setMessage(result.error?.message ?? 'Pendaftaran gagal.');
    event.currentTarget.reset(); setMessage(`Pendaftaran diterima. Nomor registrasi: ${result.data.noReg}`);
  }
  return <form onSubmit={submit} className="card" style={{ maxWidth: 680 }}>
    <h3>Daftar PPDB Online</h3><p className="muted">Isi data awal, panitia akan memverifikasi berkas Anda.</p>
    {message && <div className={message.startsWith('Pendaftaran diterima') ? 'badge badge-hijau' : 'error'} style={{ margin: '12px 0', display: 'block' }}>{message}</div>}
    <div className="grid g2"><div className="field"><label>Nama lengkap</label><input name="nama" required maxLength={160} /></div><div className="field"><label>Jenis kelamin</label><select name="jk" required><option value="L">Putra</option><option value="P">Putri</option></select></div></div>
    <div className="grid g2"><div className="field"><label>Pilihan unit</label><select name="pilihan" required><option value="SMP">SMP Nurul Huda</option><option value="MA">MA Nurul Huda</option><option value="Pondok">Pondok Pesantren</option></select></div><div className="field"><label>Asal sekolah</label><input name="asalSekolah" maxLength={160} /></div></div>
    <div className="field"><label>Nomor HP wali</label><input name="hpWali" inputMode="tel" required maxLength={20} /></div>
    <button className="btn" disabled={isSaving}>{isSaving ? 'Mengirim…' : 'Kirim pendaftaran'}</button>
  </form>;
}
