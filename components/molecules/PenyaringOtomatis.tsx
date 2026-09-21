'use client';

import { useRouter } from 'next/navigation';

/** `href` sudah dihitung di server (Server Component tidak boleh mengirim
 * fungsi ke Client Component), jadi tiap opsi membawa tujuan navigasinya sendiri. */
export type OpsiPenyaring = { nilai: string; label: string; href: string };

/**
 * `<select>` yang langsung berlaku saat dipilih — tanpa tombol "Terapkan".
 * Navigasinya tetap ke URL penuh (pola sama seperti `LimitPicker`), jadi
 * keadaan filter tetap hidup di query dan bisa dibookmark.
 *
 * Kotak pencarian sengaja TIDAK memakai ini: mengetik tidak boleh memicu
 * navigasi per ketukan, jadi pencarian tetap form GET dengan tombol.
 */
export function PenyaringOtomatis({
  label, nilai, opsi, lebar = 132,
}: {
  label: string;
  nilai: string;
  opsi: OpsiPenyaring[];
  lebar?: number;
}) {
  const router = useRouter();
  return (
    <div className="field" style={{ minWidth: lebar, marginBottom: 0 }}>
      <label>{label}</label>
      <select
        value={nilai}
        onChange={(e) => {
          const tujuan = opsi.find((o) => o.nilai === e.target.value)?.href;
          if (tujuan) router.push(tujuan);
        }}
      >
        {opsi.map((o) => <option key={o.nilai} value={o.nilai}>{o.label}</option>)}
      </select>
    </div>
  );
}
