'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPath } from '@/lib/api-path';

export default function GantiSandiPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [sukses, setSukses] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    const form = new FormData(event.currentTarget);
    const sandiBaru = String(form.get('sandiBaru') ?? '');
    const konfirmasi = String(form.get('konfirmasiSandi') ?? '');
    if (sandiBaru !== konfirmasi) {
      setIsLoading(false);
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }
    const response = await fetch(apiPath('/api/auth/ganti-sandi'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sandiSaatIni: form.get('sandiSaatIni'), sandiBaru }),
    });
    const result = await response.json();
    setIsLoading(false);
    if (!response.ok) return setError(result.error?.message ?? 'Tidak dapat mengganti kata sandi.');
    setSukses(true);
    router.replace('/');
    router.refresh();
  }

  return (
    <main className="login-wrap">
      <section className="login-card">
        <p className="muted">SIMTERPADU · Nurul Huda Mergosono</p>
        <h1 style={{ color: 'var(--hijau-tua)', marginBottom: 8 }}>Ganti Kata Sandi</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Demi keamanan, kata sandi bawaan wajib diganti sebelum melanjutkan.
        </p>
        {error && <div className="error" role="alert">{error}</div>}
        {sukses && <div className="muted">Kata sandi berhasil diganti, mengarahkan…</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="sandiSaatIni">Kata sandi saat ini</label>
            <input id="sandiSaatIni" name="sandiSaatIni" type="password" autoComplete="current-password" required />
          </div>
          <div className="field">
            <label htmlFor="sandiBaru">Kata sandi baru</label>
            <input id="sandiBaru" name="sandiBaru" type="password" autoComplete="new-password" minLength={8} required />
          </div>
          <div className="field">
            <label htmlFor="konfirmasiSandi">Konfirmasi kata sandi baru</label>
            <input id="konfirmasiSandi" name="konfirmasiSandi" type="password" autoComplete="new-password" minLength={8} required />
          </div>
          <button className="btn" style={{ width: '100%' }} disabled={isLoading}>
            {isLoading ? 'Menyimpan…' : 'Simpan Kata Sandi Baru'}
          </button>
        </form>
      </section>
    </main>
  );
}