// Ikon menu sidebar: satu warna seragam mengikuti warna teks item menu
// (currentColor) — tidak aktif krem lembut, hover terang, aktif emas
// (diatur lewat .menuitem di globals.css). Dulu tiap menu beda warna
// (rainbow) dan perpustakaan tidak ada di petanya sehingga tampak pucat.
const IKON_CADANGAN = 'M4 6h16v12H4z';

export function IkonMenu({ path, size = 17 }: { menuKey: string; path?: string | null; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={path || IKON_CADANGAN} />
    </svg>
  );
}
