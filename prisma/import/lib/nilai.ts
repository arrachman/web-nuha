/**
 * Helper konversi nilai mentah dari CSV. Semua fungsi melempar Error dengan
 * pesan jelas bila format tidak sesuai — dipakai importir untuk mengumpulkan
 * galat validasi per baris, bukan langsung menghentikan proses.
 */

/** Angka polos saja, mis. "350000". Menolak "Rp350.000" dan "350,000". */
export const keAngka = (mentah: string, label = 'nilai'): number => {
  const teks = mentah.trim();
  if (!/^-?\d+(\.\d+)?$/.test(teks)) {
    throw new Error(`${label} harus angka polos tanpa titik ribuan/koma/prefiks "Rp" (dapat: "${mentah}")`);
  }
  const angka = Number(teks);
  if (!Number.isFinite(angka)) {
    throw new Error(`${label} bukan angka yang valid (dapat: "${mentah}")`);
  }
  return angka;
};

/** Tanggal format YYYY-MM-DD saja. */
export const keTanggal = (mentah: string, label = 'tanggal'): Date => {
  const teks = mentah.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(teks)) {
    throw new Error(`${label} harus berformat YYYY-MM-DD (dapat: "${mentah}")`);
  }
  const tanggal = new Date(`${teks}T00:00:00Z`);
  if (Number.isNaN(tanggal.getTime())) {
    throw new Error(`${label} bukan tanggal yang valid (dapat: "${mentah}")`);
  }
  // Pastikan komponen tanggal tidak "meluber" (mis. 2026-02-30).
  const [tahun, bulan, hari] = teks.split('-').map(Number);
  if (
    tanggal.getUTCFullYear() !== tahun ||
    tanggal.getUTCMonth() !== bulan - 1 ||
    tanggal.getUTCDate() !== hari
  ) {
    throw new Error(`${label} bukan tanggal kalender yang valid (dapat: "${mentah}")`);
  }
  return tanggal;
};

/** Arah kas: hanya "Masuk" atau "Keluar" (enum ArahKas). */
export const keArahKas = (mentah: string, label = 'arah'): 'Masuk' | 'Keluar' => {
  const teks = mentah.trim();
  if (teks !== 'Masuk' && teks !== 'Keluar') {
    throw new Error(`${label} harus "Masuk" atau "Keluar" (dapat: "${mentah}")`);
  }
  return teks;
};
