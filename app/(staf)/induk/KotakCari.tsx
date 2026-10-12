'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/atoms/Input';
import { hrefInduk, type FilterInduk } from './filter';

/**
 * Kotak pencarian daftar induk — TANPA tombol Cari (permintaan user):
 * ketikan langsung diterapkan saat berubah (debounce 450ms) lewat navigasi
 * ke URL filter yang sama seperti chip, jadi hasil selalu sinkron dengan
 * alamat halaman dan bisa di-back/bookmark. Filter lain yang sedang aktif
 * ikut terbawa utuh karena URL dibangun dari `f` lewat hrefInduk.
 */
export function KotakCari({ f }: { f: FilterInduk }) {
  const router = useRouter();
  const [nilai, setNilai] = useState(f.q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const terakhir = useRef(f.q);

  // Sinkronkan bila q berubah dari luar (mis. chip "Cari: ..." dicopot
  // atau operator berpindah lewat riwayat browser).
  useEffect(() => {
    setNilai(f.q);
    terakhir.current = f.q;
  }, [f.q]);

  const ubah = (v: string) => {
    setNilai(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (v === terakhir.current) return;
      terakhir.current = v;
      router.push(hrefInduk(f, { q: v }), { scroll: false });
    }, 450);
  };

  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'center', flex: '1 1 260px' }}>
      <Input
        varian="cari"
        type="search"
        name="q"
        value={nilai}
        onChange={(e) => ubah(e.target.value)}
        placeholder="Cari nama, NIS, atau NISN…"
        aria-label="Cari santri"
        style={{ flex: 1, minWidth: 0 }}
      />
    </div>
  );
}
