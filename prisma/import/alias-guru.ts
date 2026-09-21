/**
 * Kamus nama panggilan → nama resmi guru MA. Jadwal
 * (`JADWAL KELAS X XI.xlsx` sheet ke-2) memakai nama panggilan ("B. Hasni",
 * "P. Izha"), sedangkan `DATA GURU.xlsx` dan SK memakai nama resmi
 * ("Ilmi Nurhasni Addin"). Daftar ini persis 15 entri dari
 * `docs/RENCANA-IMPORT.md` baris 105-112 — JANGAN ditambah/dikurangi tanpa
 * verifikasi ulang ke dokumen sumber.
 *
 * Nama panggilan yang tidak ada di kamus ini HARUS menggagalkan impor
 * jadwal (lihat `import-jadwal-ma.ts`), bukan diam-diam membuat Pegawai
 * baru — itulah sebabnya bug pencocokan by-nama di Fase 1 butir 5 terjadi.
 */
export const ALIAS_GURU_MA: Readonly<Record<string, string>> = Object.freeze({
  'B. Hasni': 'Ilmi Nurhasni Addin',
  'B. Nina': 'Nisrina Nada Aulia',
  'B. Rona': 'Rona Nadhiroh',
  'B. Murida': 'Murida Azkia',
  'B. Ulil': "Aulan Nisa' Ulil Kamaliah",
  'B. Putri': 'Putri Laksmi Marwa Kamila',
  'Miss Via': 'Rofiatul Mukarromah',
  'B. Ais': 'Wardatul Haizatil Husna',
  'P. Izha': 'Isma Izha Utama',
  'P. Alfan': 'Alfan Jamil',
  'P. Said': "Fitri Muchammad Sa'id",
  // Rencana menulis "Muh. Bismar As Sidiq" (bentuk di SK), tetapi
  // DATA GURU.xlsx — sumber baris Pegawai — menulis "Muhammmad Bismar As
  // Sidiq, S.H" (tiga m, apa adanya dari client). Kamus ini dipakai untuk
  // mencocokkan ke Pegawai, jadi yang dipakai adalah ejaan DATA GURU.
  'P. Bismar': 'Muhammmad Bismar As Sidiq',
  'B. Khal': "Khalimatus Sa'diyah",
  'B. Eka': 'Eka Meilina Wulandari',
  'B. Fida': 'Umi Mufidatul Musyarofah',
  // Entri ke-16, tidak ada di daftar rencana. Ditambahkan setelah verifikasi:
  // "B. Ifa" hanya muncul mengampu KIM & FIS, dan satu-satunya guru MA dengan
  // mapelDiampu "Fisika, Kimia" adalah Kholifatun Khasanah (Khol-IFA-tun).
  // Perlu dikonfirmasi ke client — lihat catatan di HISTORY.md.
  'B. Ifa': 'Kholifatun Khasanah',
});

/**
 * Kode di kolom guru yang sebenarnya BUKAN nama guru. Jadwal memakai sel ini
 * untuk kegiatan tanpa satu pengampu tunggal, jadi `pegawaiId` dibiarkan NULL
 * alih-alih dipaksa cocok ke seseorang.
 */
export const KODE_BUKAN_GURU: ReadonlySet<string> = new Set(['TKA', 'EKSTRA']);

/**
 * Cari nama resmi dari nama panggilan. Melempar Error dengan pesan jelas
 * (bukan mengembalikan `undefined`/membuat data baru) bila alias tidak
 * dikenal, sesuai aturan keras impor jadwal.
 */
export const namaResmiDariAlias = (panggilan: string): string => {
  const resmi = ALIAS_GURU_MA[panggilan];
  if (!resmi) {
    throw new Error(
      `alias guru "${panggilan}" tidak ada di kamus ALIAS_GURU_MA (prisma/import/alias-guru.ts) — ` +
        'tambahkan pemetaannya secara eksplisit setelah verifikasi ke SK/DATA GURU, jangan biarkan guru baru terbuat diam-diam',
    );
  }
  return resmi;
};
