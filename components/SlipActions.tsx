'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiPath } from '@/lib/api-path';
import { Button } from '@/components/atoms/Button';

type Aksi = 'terbitkan' | 'bayar' | 'revisi';

export function SlipActions({ pegawaiId, periode, status }: { pegawaiId: string; periode: string; status?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function jalankan(aksi: Aksi) {
    setBusy(true);
    // A revision after payment is allowed; the note is what makes it accountable.
    const catatan = aksi === 'revisi' ? window.prompt('Catatan revisi (wajib untuk jejak audit)') ?? '' : undefined;
    if (aksi === 'revisi' && !catatan) return setBusy(false);
    const response = await fetch(apiPath('/api/gaji/slip'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pegawaiId, periode, aksi, catatan }) });
    const result = await response.json();
    setBusy(false);
    if (!result.success) window.alert(result.error?.message ?? 'Gagal.');
    router.refresh();
  }

  return <div style={{ display: 'flex', gap: 6 }}>
    {!status && <Button disabled={busy} onClick={() => jalankan('terbitkan')}>Terbitkan</Button>}
    {status && status !== 'Dibayar' && <Button disabled={busy} onClick={() => jalankan('bayar')}>Tandai dibayar</Button>}
    {status && <Button varian="sekunder" disabled={busy} onClick={() => jalankan('revisi')}>Revisi</Button>}
  </div>;
}