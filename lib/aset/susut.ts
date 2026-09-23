/**
 * Penyusutan garis lurus (04-aset-sarpras §6.6). Fungsi murni — dihitung saat
 * dibaca, tidak disimpan per bulan. Tanah (KIB A) dan konstruksi dalam
 * pengerjaan (KIB F) tidak disusutkan; aset tanpa umur ekonomis juga tidak.
 */
export type InputSusut = {
  harga: number;
  residu?: number | null;
  umurTahun?: number | null;
  tanggalPerolehan: Date;
  kibGroup: string;
};

export type HasilSusut = {
  disusutkan: boolean;
  bulanBerjalan: number;
  susutPerBulan: number;
  akumulasi: number;
  nilaiBuku: number;
};

const GOLONGAN_TIDAK_DISUSUTKAN = new Set(['A', 'F']);

/** Jumlah bulan penuh antara dua tanggal (perolehan bulan ini dihitung mulai bulan berikutnya). */
export function selisihBulan(dari: Date, sampai: Date): number {
  const bulan = (sampai.getFullYear() - dari.getFullYear()) * 12 + (sampai.getMonth() - dari.getMonth());
  const kurangiSatu = sampai.getDate() < dari.getDate() ? 1 : 0;
  return Math.max(0, bulan - kurangiSatu);
}

export function hitungSusut(input: InputSusut, perTanggal: Date = new Date()): HasilSusut {
  const harga = Math.max(0, input.harga);
  const residu = Math.min(harga, Math.max(0, input.residu ?? 0));
  const umur = input.umurTahun ?? 0;
  if (GOLONGAN_TIDAK_DISUSUTKAN.has(input.kibGroup.toUpperCase()) || umur <= 0 || harga === 0) {
    return { disusutkan: false, bulanBerjalan: 0, susutPerBulan: 0, akumulasi: 0, nilaiBuku: harga };
  }
  const totalBulan = umur * 12;
  const bulanBerjalan = Math.min(totalBulan, selisihBulan(input.tanggalPerolehan, perTanggal));
  const susutPerBulan = (harga - residu) / totalBulan;
  const akumulasi = bulanBerjalan >= totalBulan ? harga - residu : Math.round(susutPerBulan * bulanBerjalan * 100) / 100;
  return {
    disusutkan: true,
    bulanBerjalan,
    susutPerBulan: Math.round(susutPerBulan * 100) / 100,
    akumulasi,
    nilaiBuku: Math.round((harga - akumulasi) * 100) / 100,
  };
}
