/** Label & daftar nilai modul Sarpras — dipakai UI dan validasi Server Action. */
export const LABEL_KONDISI: Record<string, string> = {
  Baik: 'Baik', RusakRingan: 'Rusak Ringan', RusakBerat: 'Rusak Berat', Hilang: 'Hilang',
};
export const WARNA_KONDISI: Record<string, string> = {
  Baik: '#0F6B3D', RusakRingan: '#D97706', RusakBerat: '#B91C1C', Hilang: '#6B7280',
};
export const LABEL_STATUS_ASET: Record<string, string> = {
  Aktif: 'Aktif', Dipinjam: 'Dipinjam', DalamPerbaikan: 'Dalam Perbaikan', TidakDipakai: 'Tidak Dipakai',
  MenungguPenghapusan: 'Menunggu Penghapusan', Dihapus: 'Dihapus',
};
export const JENIS_RUANG = ['Kelas', 'Lab', 'Perpustakaan', 'UKS', 'Toilet', 'Ibadah', 'Asrama', 'Dapur', 'Kantor', 'Gudang', 'Aula', 'Lainnya'];
export const CARA_PEROLEHAN = ['Pembelian', 'Wakaf', 'Hibah', 'Donasi', 'Buatan sendiri'];
export const JENIS_BERKAS_ASET = ['FOTO', 'KUITANSI', 'FAKTUR', 'BAST', 'SERTIFIKAT', 'AIW', 'BPKB', 'STNK', 'GARANSI', 'LAINNYA'];
export const TINGKAT_KERUSAKAN = ['Ringan', 'Sedang', 'Berat', 'Darurat'];
export const STATUS_KERUSAKAN = ['Baru', 'Diverifikasi', 'Dikerjakan', 'MenungguSparepart', 'Selesai', 'TidakBisaDiperbaiki', 'Ditolak'];
export const LABEL_STATUS_KERUSAKAN: Record<string, string> = {
  Baru: 'Baru', Diverifikasi: 'Diverifikasi', Dikerjakan: 'Dikerjakan', MenungguSparepart: 'Menunggu Sparepart',
  Selesai: 'Selesai', TidakBisaDiperbaiki: 'Tidak Bisa Diperbaiki', Ditolak: 'Ditolak',
};
export const STATUS_KERUSAKAN_TERBUKA = ['Baru', 'Diverifikasi', 'Dikerjakan', 'MenungguSparepart'];
export const STATUS_PINJAM_AKTIF = ['Diajukan', 'Disetujui', 'Dipinjam', 'Terlambat'];
export const ALASAN_HAPUS = ['RusakBerat', 'Hilang', 'Usang', 'Dijual', 'Dihibahkan', 'Musnah'];
export const METODE_HAPUS = ['Dimusnahkan', 'Dijual/Lelang', 'Dihibahkan', 'Tukar guling'];
export const GOLONGAN_KIB: Record<string, string> = {
  A: 'Tanah', B: 'Peralatan & Mesin', C: 'Gedung & Bangunan', D: 'Jalan, Irigasi & Jaringan', E: 'Aset Tetap Lainnya', F: 'Konstruksi Dalam Pengerjaan',
};
/** Templat pemeliharaan bawaan (04 §6.4) — judul + interval hari. */
export const TEMPLAT_PEMELIHARAAN = [
  { title: 'Servis AC', intervalDays: 180 },
  { title: 'Servis genset', intervalDays: 90 },
  { title: 'Isi ulang APAR', intervalDays: 365 },
  { title: 'Cek tekanan APAR', intervalDays: 30 },
  { title: 'Kuras tandon', intervalDays: 90 },
  { title: 'Servis pompa air', intervalDays: 180 },
  { title: 'Servis kendaraan', intervalDays: 90 },
  { title: 'Pajak kendaraan & STNK', intervalDays: 365 },
  { title: 'Cek instalasi listrik & penangkal petir', intervalDays: 365 },
];
/** Kepala unit per unit.key — penyetuju tahap unit (04 §5). */
export const PERAN_KEPALA_UNIT: Record<string, string> = {
  SMP: 'kepsmp', MA: 'kepma', Pondok: 'pengasuh', Poskestren: 'pengasuh', YAYASAN: 'ketua',
};
export const SETTING_AMBANG_PENGADAAN = 'sarpras.ambang_pengadaan_yayasan';
export const SETTING_AMBANG_KAPITALISASI = 'sarpras.ambang_kapitalisasi';
export const AMBANG_PENGADAAN_BAWAAN = 5_000_000;
export const AMBANG_KAPITALISASI_BAWAAN = 1_000_000;

export function rupiah(n: number | string | { toString(): string } | null | undefined): string {
  const v = Number(n ?? 0);
  return `Rp ${v.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
}
