'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { resetSandiPengguna } from './actions';

/** Reset sandi via Server Action yang MENGEMBALIKAN sandi sementara — ditampilkan sekali, tidak lewat URL. */
export function TombolResetSandi({ userId, nama }: { userId: string; nama: string }) {
  const [hasil, setHasil] = useState<{ ok: boolean; pesan: string; sandi?: string } | null>(null);
  const [proses, setProses] = useState(false);
  async function reset() {
    if (!window.confirm(`Reset sandi ${nama}? Sesi yang sedang aktif akan dicabut.`)) return;
    setProses(true);
    const fd = new FormData();
    fd.set('id', userId);
    setHasil(await resetSandiPengguna(fd));
    setProses(false);
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Button type="button" varian="sekunder" style={{ fontSize: 12, padding: '6px 10px' }} onClick={reset} disabled={proses}>{proses ? 'Mereset…' : 'Reset sandi'}</Button>
      {hasil && (
        <span data-testid={`hasil-reset-${userId}`} style={{ fontSize: 11.5, color: hasil.ok ? '#14532d' : '#7f1d1d', maxWidth: 240 }}>
          {hasil.pesan}{hasil.sandi && <> Sandi sementara: <code style={{ fontWeight: 700, userSelect: 'all' }} data-testid="sandi-sementara">{hasil.sandi}</code></>}
        </span>
      )}
    </div>
  );
}
