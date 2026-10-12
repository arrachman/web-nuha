'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { ButtonLink } from '@/components/atoms/ButtonLink';
import { Input } from '@/components/atoms/Input';

export type SalinanLabel = {
  id: string;
  kodeEksemplar: string;
  kodeBuku: string;
  judul: string;
  rak: string | null;
  status: string;
  kondisi: string;
};

/** Pemilih eksemplar untuk dicetak labelnya — daftar centang + tautan ke halaman cetak. */
export function LabelPicker({ salinan }: { salinan: SalinanLabel[] }) {
  const [terpilih, setTerpilih] = useState<ReadonlySet<string>>(new Set());

  const atur = (id: string, on: boolean) => {
    setTerpilih((prev) => {
      const baru = new Set(prev);
      if (on) baru.add(id); else baru.delete(id);
      return baru;
    });
  };

  const hrefCetak = useMemo(() => {
    if (terpilih.size === 0) return '#';
    const ids = salinan.filter((s) => terpilih.has(s.id)).map((s) => `id=${s.id}`);
    return `/cetak/label-buku?${ids.join('&')}`;
  }, [salinan, terpilih]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <Button type="button" varian="sekunder" onClick={() => setTerpilih(new Set(salinan.map((s) => s.id)))}>Pilih semua</Button>
        <Button type="button" varian="sekunder" onClick={() => setTerpilih(new Set())}>Kosongkan</Button>
        <span className="muted" style={{ fontSize: 13 }}>{terpilih.size} dari {salinan.length} eksemplar terpilih</span>
        <span style={{ flex: 1 }} />
        <ButtonLink href={hrefCetak} aria-disabled={terpilih.size === 0} style={terpilih.size === 0 ? { opacity: 0.5, pointerEvents: 'none' } : undefined}>
          Cetak label terpilih
        </ButtonLink>
      </div>

      {salinan.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>Tidak ada eksemplar yang cocok dengan penyaring.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="tabel">
            <thead>
              <tr>
                <th style={{ width: 36 }}><span className="sr-only">Pilih</span></th>
                <th>Kode eksemplar</th>
                <th>Judul</th>
                <th>Rak</th>
                <th>Status</th>
                <th>Kondisi</th>
              </tr>
            </thead>
            <tbody>
              {salinan.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Input
                      type="checkbox"
                      checked={terpilih.has(s.id)}
                      onChange={(e) => atur(s.id, e.target.checked)}
                      aria-label={`Pilih label ${s.kodeEksemplar}`}
                    />
                  </td>
                  <td><span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{s.kodeEksemplar}</span></td>
                  <td>{s.judul}</td>
                  <td>{s.rak || <span className="muted">-</span>}</td>
                  <td>{s.status}</td>
                  <td>{s.kondisi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
