'use client';

import { useEffect } from 'react';

/** Batas error global: menggantikan layar error Next mentah saat query/render
 * halaman gagal (mis. Prisma down). `reset()` mencoba render ulang segmen ini
 * tanpa reload penuh. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="pad" style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ maxWidth: 420, padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--teks-kuat)' }}>Terjadi kesalahan</div>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Halaman ini gagal dimuat. Coba lagi — kalau masih gagal, hubungi admin sistem.
        </p>
        <button type="button" className="btn" onClick={() => reset()} style={{ alignSelf: 'center' }}>
          Coba lagi
        </button>
      </div>
    </div>
  );
}
