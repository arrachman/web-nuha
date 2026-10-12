'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './login.module.css';
import { apiPath } from '@/lib/api-path';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch(apiPath('/api/auth/login'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier: form.get('identifier'), password: form.get('password') }) });
    const result = await response.json();
    setIsLoading(false);
    if (!response.ok) return setError(result.error?.message ?? 'Tidak dapat masuk.');
    // ?next= dipakai alur pindai QR (/a, /r → /lapor-kerusakan). Hanya path
    // internal satu garis miring — bukan //host — supaya tidak jadi open redirect.
    const next = new URLSearchParams(window.location.search).get('next') ?? '';
    router.replace(next.startsWith('/') && !next.startsWith('//') ? next : '/');
    router.refresh();
  }

  return (
    <main className={styles.section}>
      <section className={styles.card}>
        <div className={styles.header}>
          <Image
            src="/assets/logo-nuha.webp"
            alt="Logo Nurul Huda"
            width={76}
            height={76}
            className={styles.logo}
            priority
          />
          <h1 className={styles.title}>Masuk SIMTERPADU</h1>
          <p className={styles.subtitle}>Gunakan akun yang sudah terdaftar.</p>
        </div>
        {error && <div className="error" role="alert">{error}</div>}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="identifier" className={styles.label}>Email atau nama pengguna</label>
            <Input id="identifier" name="identifier" autoComplete="username" required defaultValue="superadmin" className={styles.input} />
          </div>
          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>Kata sandi</label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required defaultValue="123123" className={styles.input} />
          </div>
          <Button varian="polos" className={styles.submit} disabled={isLoading}>{isLoading ? 'Memeriksa…' : 'Masuk'}</Button>
        </form>
        <div className={styles.footer}>
          <p>Yayasan Pendidikan Islam Nurul Huda Mergosono</p>
        </div>
      </section>
    </main>
  );
}