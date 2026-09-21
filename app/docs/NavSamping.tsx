'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export type ItemNav = { id: string; judul: string };

/** Garis baca: bagian yang judulnya sudah melewati garis ini dianggap dibaca. */
const GARIS_BACA = 90;

/**
 * Sidebar navigasi dokumentasi. Klien karena butuh scroll-spy. Dihitung dari
 * posisi scroll ("bagian terakhir yang sudah melewati garis baca"), bukan
 * IntersectionObserver: observer menandai bagian sebelumnya yang ekornya masih
 * terlihat, sehingga sehabis klik justru item di atasnya yang menyala.
 */
export function NavSamping({ items }: { items: ItemNav[] }) {
  const [aktif, setAktif] = useState(items[0]?.id ?? '');

  useEffect(() => {
    let tiket = 0;
    const hitung = () => {
      tiket = 0;
      let terpilih = items[0]?.id ?? '';
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= GARIS_BACA) terpilih = item.id;
      }
      // Mentok di dasar halaman: bagian terakhir bisa terlalu pendek untuk
      // pernah mencapai garis baca, jadi dipilih paksa. Ambangnya longgar
      // karena posisi scroll bisa fractional dan smooth scroll berhenti
      // beberapa piksel sebelum dasar.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 40) {
        terpilih = items[items.length - 1]?.id ?? terpilih;
      }
      setAktif(terpilih);
    };
    const onScroll = () => {
      if (!tiket) tiket = requestAnimationFrame(hitung);
    };
    hitung();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (tiket) cancelAnimationFrame(tiket);
    };
  }, [items]);

  // Lompat ke bagian dengan koreksi: gambar lazy yang termuat di tengah
  // luncuran menggeser tata letak, sehingga scroll browser bawaan mendarat
  // meleset. Setelah luncuran berhenti, posisi dicek ulang dan dikoreksi
  // sampai judul bagian benar-benar berada di garis atas.
  const lompatKe = (id: string) => {
    setAktif(id);
    let sisa = 12;
    let ySebelum = -1;
    const koreksi = () => {
      const el = document.getElementById(id);
      if (!el) return;
      const meleset = Math.abs(el.getBoundingClientRect().top - 18) > 2;
      const masihMeluncur = window.scrollY !== ySebelum;
      ySebelum = window.scrollY;
      if (meleset && sisa-- > 0) {
        if (!masihMeluncur) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(koreksi, 180);
      } else {
        setAktif(id);
      }
    };
    el0(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(koreksi, 180);
  };
  const el0 = (id: string) => document.getElementById(id);

  return (
    <nav className="docs-samping" aria-label="Daftar isi dokumentasi">
      <p className="label">Isi</p>
      <ol>
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={item.id === aktif ? 'aktif' : undefined}
              onClick={(e) => {
                e.preventDefault();
                history.replaceState(null, '', `#${item.id}`);
                lompatKe(item.id);
              }}
            >
              {item.judul}
            </a>
          </li>
        ))}
      </ol>
      <Link href="/" className="btn btn-sekunder docs-samping-kembali">
        Kembali ke aplikasi
      </Link>
    </nav>
  );
}
