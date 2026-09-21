'use client';

import { useEffect, useState } from 'react';

type OpsiWilayah = { id: string; nama: string; keterangan: string };

type Props = {
  name: string;
  label: string;
  id?: string;
  hint?: string;
  placeholder?: string;
  nilaiAwal?: string;
  /** Opsional: dipanggil tiap kali pilihan berubah (dipilih atau dikosongkan). Dipakai oleh form berbasis state, bukan FormData. */
  onChange?: (regionId: string) => void;
};

const JEDA_KETIK = 250;

export function PemilihWilayah({ name, label, id, hint, placeholder, nilaiAwal, onChange }: Props) {
  const [ketik, setKetik] = useState('');
  const [hasil, setHasil] = useState<OpsiWilayah[]>([]);
  const [dipilih, setDipilih] = useState<OpsiWilayah | null>(null);
  const [terbuka, setTerbuka] = useState(false);
  const [memuat, setMemuat] = useState(false);

  useEffect(() => {
    if (!nilaiAwal) return;
    fetch(`/api/wilayah/cari?ids=${encodeURIComponent(nilaiAwal)}`)
      .then((response) => response.json())
      .then((json) => { if (json.success && json.data[0]) setDipilih(json.data[0]); })
      .catch(() => undefined);
  }, [nilaiAwal]);

  useEffect(() => {
    if (!terbuka) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setMemuat(true);
      try {
        const response = await fetch(`/api/wilayah/cari?q=${encodeURIComponent(ketik.trim())}`, { signal: controller.signal });
        const json = await response.json();
        setHasil(json.success ? json.data : []);
      } catch {
        if (!controller.signal.aborted) setHasil([]);
      } finally {
        if (!controller.signal.aborted) setMemuat(false);
      }
    }, JEDA_KETIK);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [ketik, terbuka]);

  return <div style={{ position: 'relative' }}>
    <input
      id={id ?? `pilih-${name}`}
      aria-label={label}
      type="text"
      autoComplete="off"
      value={dipilih ? dipilih.nama : ketik}
      onChange={(event) => { setDipilih(null); setKetik(event.target.value); onChange?.(''); }}
      onFocus={() => setTerbuka(true)}
      onBlur={() => setTimeout(() => setTerbuka(false), 150)}
      placeholder={placeholder ?? 'Ketik nama desa atau kelurahan…'}
    />
    {hint && <p className="petunjuk">{hint}</p>}
    {terbuka && <ul className="saran">
      {memuat && <li className="saran-kosong">Mencari…</li>}
      {!memuat && hasil.length === 0 && <li className="saran-kosong">Tidak ada desa yang cocok.</li>}
      {hasil.map((item) => <li key={item.id}><button type="button" onClick={() => { setDipilih(item); setKetik(''); setTerbuka(false); onChange?.(item.id); }}><strong>{item.nama}</strong><span>{item.keterangan}</span></button></li>)}
    </ul>}
    <input type="hidden" name={name} value={dipilih?.id ?? ''} />
  </div>;
}
