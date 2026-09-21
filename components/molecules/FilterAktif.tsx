import Link from 'next/link';

export type ChipFilter = { label: string; href: string };

/**
 * Ringkasan penyaring yang sedang berlaku, satu chip per penyaring, masing-masing
 * bisa dicopot sendiri. Dulu tiap modul menampilkannya beda-beda: /akademik punya
 * chip per filter, /induk hanya tombol "Hapus n filter" (tidak bisa copot satu),
 * /kepegawaian tidak menampilkan apa pun sehingga filter aktif bisa terlupakan.
 *
 * Pemanggil menghitung sendiri `chip` dan `hrefBersih` karena bentuk URL tiap
 * modul berbeda; komponen ini hanya menyeragamkan tampilan dan perilakunya.
 */
export function FilterAktif({ chip, hrefBersih }: { chip: ChipFilter[]; hrefBersih: string }) {
  if (chip.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
      <span className="chip-label">Penyaring aktif</span>
      {chip.map((c) => (
        <Link key={c.href + c.label} href={c.href} className="chip-copot">
          {c.label} <span className="x">×</span>
        </Link>
      ))}
      {chip.length > 1 && (
        <Link href={hrefBersih} className="chip-copot">
          Bersihkan semua ({chip.length})
        </Link>
      )}
    </div>
  );
}
