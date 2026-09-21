/**
 * Parser "tempat, tanggal lahir" (TTL) gaya Indonesia dari sumber client,
 * mis. "Malang, 12 Oktober 1995" atau "MALANG, 12 AGUSTUS 2009" (huruf
 * besar/kecil campur antar berkas). Dipakai lintas importir guru & siswa.
 */
const NAMA_BULAN: Record<string, number> = {
  januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6,
  juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12,
};

/** Judul-kasus sederhana: huruf pertama tiap kata kapital, sisanya kecil. */
const judulKasus = (teks: string): string => teks
  .toLowerCase()
  .split(' ')
  .map((kata) => (kata.length > 0 ? kata[0].toUpperCase() + kata.slice(1) : kata))
  .join(' ');

export type Ttl = { tempat: string; tanggal: Date };

/**
 * Parse "Kota, DD Bulan YYYY" → { tempat, tanggal }. Melempar Error jelas
 * bila format tidak sesuai (dipakai importir untuk kumpulkan galat per baris).
 */
export const parseTtl = (mentah: string, label = 'TTL'): Ttl => {
  const teks = mentah.trim();
  const koma = teks.indexOf(',');
  if (koma === -1) {
    throw new Error(`${label} harus berformat "Tempat, DD Bulan YYYY" (dapat: "${mentah}")`);
  }
  const tempat = judulKasus(teks.slice(0, koma).trim());
  const sisaTanggal = teks.slice(koma + 1).trim();

  const m = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(sisaTanggal);
  if (!m) {
    throw new Error(`${label}: bagian tanggal "${sisaTanggal}" harus berformat "DD Bulan YYYY" (dapat: "${mentah}")`);
  }
  const [, hariTeks, bulanTeks, tahunTeks] = m;
  const bulan = NAMA_BULAN[bulanTeks.toLowerCase()];
  if (!bulan) {
    throw new Error(`${label}: nama bulan "${bulanTeks}" tidak dikenal (dapat: "${mentah}")`);
  }
  const hari = Number(hariTeks);
  const tahun = Number(tahunTeks);
  const tanggal = new Date(Date.UTC(tahun, bulan - 1, hari));
  if (tanggal.getUTCDate() !== hari || tanggal.getUTCMonth() !== bulan - 1) {
    throw new Error(`${label}: tanggal "${sisaTanggal}" bukan tanggal kalender yang valid`);
  }

  return { tempat, tanggal };
};
