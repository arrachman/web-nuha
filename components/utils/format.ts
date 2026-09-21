// Helper yang di prototype hidup sebagai fungsi lepas di DCLogic.
export const rp = (n: number) => `Rp ${Math.abs(n).toLocaleString('id-ID')}`;

export const inisial = (nama: string) =>
  nama.split(' ').filter((w) => w.length > 1).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const AVA_BG = ['#0F6B3D', '#1D4ED8', '#7C2D12', '#5B21B6', '#166534', '#9A3412', '#065F46', '#3730A3'];
export const avaBg = (nama: string) => AVA_BG[nama.length % AVA_BG.length];

/** Satu tabel status → kelas badge, dipakai seluruh modul. */
const KELAS_STATUS: Record<string, string> = {
  Lunas: 'badge-hijau', Selesai: 'badge-hijau', Disetujui: 'badge-biru',
  Aktif: 'badge-hijau', TidakAktif: 'badge-netral', Terbit: 'badge-hijau', Dibayar: 'badge-hijau', Dibaca: 'badge-hijau',
  Lulus: 'badge-hijau', 'Sudah kembali': 'badge-hijau', Hadir: 'badge-hijau',
  Terkirim: 'badge-biru', Seleksi: 'badge-biru', Putra: 'badge-biru',
  Sebagian: 'badge-kuning', Menunggu: 'badge-kuning', Baru: 'badge-kuning', Verifikasi: 'badge-kuning',
  Draft: 'badge-kuning', 'Dry-run': 'badge-kuning', Izin: 'badge-kuning',
  'Menunggu verifikasi': 'badge-kuning', Revisi: 'badge-kuning', Sakit: 'badge-kuning',
  'Belum bayar': 'badge-merah', 'Tidak Lulus': 'badge-merah', 'Telat kembali': 'badge-merah',
  Gagal: 'badge-merah', Alpa: 'badge-merah',
  'Sedang di luar': 'badge-oranye', Cicil: 'badge-oranye', Menunggak: 'badge-merah',
  Nonaktif: 'badge-netral', Ditolak: 'badge-netral',
  Putri: 'badge-pink',
};
export const kelasStatus = (status: string) => KELAS_STATUS[status] ?? 'badge-netral';
