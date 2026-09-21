export const UKURAN_HALAMAN = 15;

export type SearchParams = Record<string, string | string[] | undefined>;

/** Ambil satu nilai dari searchParams (kolaps array jadi string pertama). */
export const satu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

/** Baca & clamp nomor halaman dari searchParams, minimal 1. */
export function bacaHalaman(sp: SearchParams) {
  return Math.max(1, Number(satu(sp.halaman)) || 1);
}

export const OPSI_LIMIT = [10, 25, 50, 100];

/** Baca jumlah baris per halaman dari searchParams, default 10, dibatasi ke OPSI_LIMIT. */
export function bacaLimit(sp: SearchParams, def = 10) {
  const nilai = Number(satu(sp.limit));
  return OPSI_LIMIT.includes(nilai) ? nilai : def;
}

/** Serialisasi filter aktif jadi potongan query string (mis. "&status=Aktif&q=budi"). */
export function filterQuery(filters: Record<string, string>) {
  return Object.entries(filters).map(([key, value]) => `&${key}=${encodeURIComponent(value)}`).join('');
}
