/**
 * Impor **riwayat pendidikan Madin** dari berkas presensi operator
 * `docs/PRESENSI DAN JURNAL JULI-AGUSTUS AJARAN BARU 2025_111924.xlsx`
 * (diserahkan 2026-08-29), mencakup empat tahun ajaran sekaligus:
 * 2019/2020, 2021/2022, 2023/2024, dan 2025/2026.
 *
 * Konteks & keputusan operator:
 *
 *   1. **Sumbernya lembar presensi, bukan daftar induk santri.** Tiap sheet
 *      mengulang roster yang sama sekali per blok bulan, jadi nama didedup
 *      per sheet (mis. sheet "kelas 1" 264 baris → 50 orang). Yang tersedia
 *      hanya **nama + tingkat + tahun ajaran** — tidak ada NIS, NISN, TTL,
 *      alamat, maupun wali, sehingga kolom itu dibiarkan kosong.
 *
 *   2. **Muat seluruh riwayat**, bukan hanya tahun berjalan (instruksi
 *      operator "muat riwayat semuanya"). Baris TA lama masuk sebagai
 *      `RiwayatPendidikan` berstatus `Alumni`; hanya roster **2025/2026**
 *      yang menyentuh tabel `Santri` (status `Mukim`). Karena
 *      `RiwayatPendidikan` unik per `[personId, unitId, academicYearId]`,
 *      satu orang boleh punya banyak baris lintas tahun tanpa saling timpa —
 *      dan santri MA/SMP yang juga mengaji di Madin tidak berubah unitnya.
 *
 *   3. **Sheet `Lembar1` salah label.** Nama sheet-nya tak informatif, tapi
 *      judul di dalamnya "PRESENSI KELAS 6" dan rosternya persis kohort
 *      Kelas 4 TA 2021/2022 yang naik ke Kelas 6 pada 2023/2024. Dipetakan
 *      ke Kelas 6, bukan Kelas 4. Sheet `MASTER (2)` (template kosong) dan
 *      `EDIT` (lembar kerja) diabaikan.
 *
 *   4. **`Ali Wafa` tercatat ganda di TA 2021/2022** (Kelas 3 dan Kelas 4,
 *      beda kapitalisasi). Operator memutuskan **Kelas 4**; baris Kelas 3
 *      dibuang. Constraint unik memang melarang keduanya hidup bersama.
 *
 *   5. **`M Ilham Arifin` dan `M Irham Arifin` adalah dua orang berbeda**
 *      (dikonfirmasi operator; NISN-nya pun berbeda di DB), bukan salah ketik.
 *
 *   6. **Pencocokan ke `Orang` yang sudah ada lewat `orangIdExisting`**, hasil
 *      laporan uji coba yang disetujui operator: 60 dari 248 nama sudah ada
 *      (53 cocok persis, 7 cocok setelah normalisasi ejaan — mis. berkas
 *      "M Fattah Maksum" = DB "Muhammad Fattah Maksum"). Nol kasus ambigu.
 *      Id dipatok di daftar supaya tidak bergantung ejaan saat dijalankan ulang.
 *
 *   7. **Jenis kelamin diterka**, karena berkas tidak punya kolomnya sama
 *      sekali sedangkan `Orang.jk` wajib diisi. Sheet "PA"/"PI" (putra/putri)
 *      dipakai bila ada; selebihnya dari kata kunci nama. Ini **data terkaan**
 *      untuk 188 orang baru — mohon dikoreksi operator bila ada yang keliru.
 *      Orang yang sudah ada di DB tidak ditimpa jk-nya.
 *
 *   8. **TA 2019/2020, 2021/2022, 2023/2024 belum ada** di tabel `TahunAjaran`
 *      (generator hanya mulai 2024/2025), jadi dibuat di sini dengan
 *      `isActive: false`, semester Gasal.
 *
 *   9. **NIS** hanya untuk 131 santri aktif 2025/2026, pola `buatNis()` →
 *      `2025PONDOK001..131`, urut tingkat lalu nama. Yang sudah punya NIS dari
 *      unit lain (MA/SMP) **tidak** dinomori ulang — penempatan Madin-nya
 *      cukup tercatat di riwayat.
 *
 * Idempoten: dijalankan berapa kali pun hasilnya sama (upsert semua).
 *
 * Jalankan: `npm run import:santri-madin-riwayat`
 */
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { JenisKelamin, StatusRiwayatPendidikan, StatusSantri } from '@prisma/client';
import { buatNis } from './lib/nis';

const AKTOR_SKRIP = { nama: 'Import riwayat Madin 2019-2026 (skrip)' };

const KODE_UNIT = 'PONDOK';
const UNIT_KEY = 'Pondok';
/** Roster terakhir di berkas; jadi angkatan untuk NIS santri aktif. */
const TA_AKTIF_BERKAS = '2025/2026';
const TAHUN_MASUK = '2025';
const SEMESTER = 'Gasal';

type BarisRiwayat = { ta: string; kelas: string; tingkat: string };

type BarisOrang = {
  no: number;
  nama: string;
  jk: JenisKelamin;
  /** Diisi bila orangnya sudah ada di DB — pencocokan lewat id, bukan ejaan. */
  orangIdExisting?: number;
  riwayat: BarisRiwayat[];
};

/**
 * Daftar tertutup 248 orang hasil ekstraksi + pencocokan yang disetujui
 * operator. Urutan menentukan nomor urut NIS, jadi jangan diacak.
 */
const DAFTAR: BarisOrang[] = [
  { no: 1, nama: 'Ahmad Arif', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas I\'dad', tingkat: '0' }] },
  { no: 2, nama: 'Ahmad Syafly Al-Kautsar', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas I\'dad', tingkat: '0' }] },
  { no: 3, nama: 'Alissa Nada Salsabila', jk: JenisKelamin.P, orangIdExisting: 487, riwayat: [{ ta: '2025/2026', kelas: 'Kelas I\'dad', tingkat: '0' }] },
  { no: 4, nama: 'Almira Azzahra Ramadhan', jk: JenisKelamin.P, orangIdExisting: 272, riwayat: [{ ta: '2025/2026', kelas: 'Kelas I\'dad', tingkat: '0' }] },
  { no: 5, nama: 'Anando Rafa Hariyanto', jk: JenisKelamin.L, orangIdExisting: 328, riwayat: [{ ta: '2025/2026', kelas: 'Kelas I\'dad', tingkat: '0' }] },
  { no: 6, nama: 'Arkaan Muhammad Zufar', jk: JenisKelamin.L, orangIdExisting: 330, riwayat: [{ ta: '2025/2026', kelas: 'Kelas I\'dad', tingkat: '0' }] },
  { no: 7, nama: 'Bilqis Aulia Izatun N.A', jk: JenisKelamin.P, riwayat: [{ ta: '2025/2026', kelas: 'Kelas I\'dad', tingkat: '0' }] },
  { no: 8, nama: 'Fadli Al Farisy', jk: JenisKelamin.L, orangIdExisting: 274, riwayat: [{ ta: '2025/2026', kelas: 'Kelas I\'dad', tingkat: '0' }] },
  { no: 9, nama: 'Farzan Ahmad Khalfani', jk: JenisKelamin.L, orangIdExisting: 276, riwayat: [{ ta: '2025/2026', kelas: 'Kelas I\'dad', tingkat: '0' }] },
  { no: 10, nama: 'Gilang Rezky Maulana', jk: JenisKelamin.L, orangIdExisting: 278, riwayat: [{ ta: '2025/2026', kelas: 'Kelas I\'dad', tingkat: '0' }] },
  { no: 11, nama: 'Kholidul Asyhar', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas I\'dad', tingkat: '0' }] },
  // DB: "Muhammad Fattah Maksum"
  { no: 12, nama: 'M Fattah Maksum', jk: JenisKelamin.L, orangIdExisting: 281, riwayat: [{ ta: '2025/2026', kelas: 'Kelas I\'dad', tingkat: '0' }] },
  // DB: "Muhammad Ilham Arifin"
  { no: 13, nama: 'M Ilham Arifin', jk: JenisKelamin.L, orangIdExisting: 283, riwayat: [{ ta: '2025/2026', kelas: 'Kelas I\'dad', tingkat: '0' }] },
  // DB: "Muhammad Irham Arifin"
  { no: 14, nama: 'M Irham Arifin', jk: JenisKelamin.L, orangIdExisting: 285, riwayat: [{ ta: '2025/2026', kelas: 'Kelas I\'dad', tingkat: '0' }] },
  { no: 15, nama: 'M. Faris Aufa S.', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas I\'dad', tingkat: '0' }] },
  { no: 16, nama: 'Muhammad Abdun Nafi\'', jk: JenisKelamin.L, orangIdExisting: 342, riwayat: [{ ta: '2025/2026', kelas: 'Kelas I\'dad', tingkat: '0' }] },
  // DB: "Muhammad Anis Musyaffa\'"
  { no: 17, nama: 'Muhammad Anis Musyaffa', jk: JenisKelamin.L, orangIdExisting: 286, riwayat: [{ ta: '2025/2026', kelas: 'Kelas I\'dad', tingkat: '0' }] },
  { no: 18, nama: 'Muhammad Kenzhi Putra', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas I\'dad', tingkat: '0' }] },
  { no: 19, nama: 'Muhammad Nawwaf Al Hasani', jk: JenisKelamin.L, orangIdExisting: 348, riwayat: [{ ta: '2025/2026', kelas: 'Kelas I\'dad', tingkat: '0' }] },
  { no: 20, nama: 'Nadhifa Fauchatul Qudsiyah', jk: JenisKelamin.P, orangIdExisting: 488, riwayat: [{ ta: '2025/2026', kelas: 'Kelas I\'dad', tingkat: '0' }] },
  { no: 21, nama: 'Queen Ulumi Dzakiya', jk: JenisKelamin.P, orangIdExisting: 292, riwayat: [{ ta: '2025/2026', kelas: 'Kelas I\'dad', tingkat: '0' }] },
  { no: 22, nama: 'Rachel Maryam', jk: JenisKelamin.P, orangIdExisting: 294, riwayat: [{ ta: '2025/2026', kelas: 'Kelas I\'dad', tingkat: '0' }] },
  { no: 23, nama: 'Zalfa Alfina Leksono', jk: JenisKelamin.P, orangIdExisting: 296, riwayat: [{ ta: '2025/2026', kelas: 'Kelas I\'dad', tingkat: '0' }] },
  { no: 24, nama: 'Achmad Chabibi Firmansyah', jk: JenisKelamin.L, orangIdExisting: 324, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 25, nama: 'Achmad Hamdan Habibi', jk: JenisKelamin.L, orangIdExisting: 298, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 26, nama: 'Achmad Tsaaqib', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 27, nama: 'Adegita', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 28, nama: 'Adibu Sholeh Ahmad', jk: JenisKelamin.L, orangIdExisting: 300, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 29, nama: 'Ahmad Aqil Fathani', jk: JenisKelamin.L, orangIdExisting: 302, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 30, nama: 'Ahmad Multazam', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 31, nama: 'Ahmad Multazam Zain', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 32, nama: 'Aisyah Aulia Mutiara Putri', jk: JenisKelamin.P, orangIdExisting: 362, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 33, nama: 'Alisyah Hikmah Maulana', jk: JenisKelamin.P, orangIdExisting: 364, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 34, nama: 'Almira Marsya Larasati', jk: JenisKelamin.P, orangIdExisting: 326, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 35, nama: 'Aminah', jk: JenisKelamin.P, orangIdExisting: 306, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 36, nama: 'Ashfa Achmal Mukarromah', jk: JenisKelamin.P, orangIdExisting: 308, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 37, nama: 'Danang Agung Samudra', jk: JenisKelamin.L, orangIdExisting: 310, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 38, nama: 'Dewi Aisar', jk: JenisKelamin.P, orangIdExisting: 366, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 39, nama: 'Dinda Aulia Ramadhani', jk: JenisKelamin.P, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 40, nama: 'Dwi Nuril \'Aqila', jk: JenisKelamin.P, orangIdExisting: 332, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 41, nama: 'Dzaki Rohmatullah', jk: JenisKelamin.L, orangIdExisting: 368, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 42, nama: 'Dzihni Laila Maftuha', jk: JenisKelamin.P, orangIdExisting: 445, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 43, nama: 'Emil Virgianing Tyas', jk: JenisKelamin.P, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 44, nama: 'Fairuz Hibatullah', jk: JenisKelamin.L, orangIdExisting: 334, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 45, nama: 'Hasna Safa Salisa', jk: JenisKelamin.P, orangIdExisting: 338, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 46, nama: 'Kafka Zidani Caesar A', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 47, nama: 'Khairan Muhamad Alghifari', jk: JenisKelamin.L, orangIdExisting: 374, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 48, nama: 'M. Akbar Oktavino', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 49, nama: 'M. Irfan Aziz', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 50, nama: 'M. Uwais Qorne', jk: JenisKelamin.L, orangIdExisting: 376, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 51, nama: 'Maulana Malik Ibrahim', jk: JenisKelamin.L, orangIdExisting: 378, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 52, nama: 'Mochammad Irsyaadun N', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 53, nama: 'Muhammad Azam Satya Alfaro', jk: JenisKelamin.L, orangIdExisting: 314, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 54, nama: 'Muhammad Choirul Anam', jk: JenisKelamin.L, orangIdExisting: 454, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 55, nama: 'Muhammad Dimas Dwi', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 56, nama: 'Muhammad Fadhlan Rozin', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 57, nama: 'Muhammad Fajar Putra', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 58, nama: 'Muhammad Jahfal Iqyan', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 59, nama: 'Muhammad Rakha Alfiansyah', jk: JenisKelamin.L, orangIdExisting: 318, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  // DB: "Muhammad Syarif Althof"
  { no: 60, nama: 'Muhammad Syarif Althof', jk: JenisKelamin.L, orangIdExisting: 290, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 61, nama: 'Muhammad Syauqi Bangga', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 62, nama: 'Mutma\'inatus Zahro', jk: JenisKelamin.P, orangIdExisting: 389, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 63, nama: 'Nafisa Isna Asyari', jk: JenisKelamin.P, orangIdExisting: 391, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 64, nama: 'Naura Ahlam Mahfuzhah', jk: JenisKelamin.P, orangIdExisting: 393, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 65, nama: 'Naura Hasna Annida', jk: JenisKelamin.P, orangIdExisting: 322, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 66, nama: 'Nia Putri Ramadhani', jk: JenisKelamin.P, orangIdExisting: 395, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 67, nama: 'Nizam Rabbani Muhammad', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 68, nama: 'Rafa A', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 69, nama: 'Rahadian Tegar Fahreza', jk: JenisKelamin.L, orangIdExisting: 352, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 70, nama: 'Riris Asyifa Qurota\'Ayun', jk: JenisKelamin.P, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 71, nama: 'Shinta Aulia Anggoro K', jk: JenisKelamin.P, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 72, nama: 'Siti Munawaroh', jk: JenisKelamin.P, orangIdExisting: 399, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 73, nama: 'Siti Nabilah', jk: JenisKelamin.P, orangIdExisting: 354, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 1', tingkat: '1' }] },
  // DB: "Addafi Syar\'i Muhammad"
  { no: 74, nama: 'Addafi Syari Muhammad', jk: JenisKelamin.L, orangIdExisting: 358, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 75, nama: 'Ahmad Faisal Irfan', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 76, nama: 'Asep Muhaimin Pamungkas', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }, { ta: '2025/2026', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 77, nama: 'Errena Tembang Sosialista T', jk: JenisKelamin.P, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 78, nama: 'Fahad Abdullah Arrosyid', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 79, nama: 'Gus Ramadhani', jk: JenisKelamin.L, orangIdExisting: 372, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 80, nama: 'Hafidz Al Qarana', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 81, nama: 'Isma Izha Utama', jk: JenisKelamin.L, orangIdExisting: 410, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 82, nama: 'Masah Noor Saudah', jk: JenisKelamin.P, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 83, nama: 'Maulana Farid Widianto', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 84, nama: 'Maulana Ridwan Aqilah', jk: JenisKelamin.L, orangIdExisting: 380, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 85, nama: 'Meutya Saila Imania', jk: JenisKelamin.P, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 86, nama: 'Muhammad', jk: JenisKelamin.L, orangIdExisting: 384, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 87, nama: 'Muhammad Abdulloh A', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 88, nama: 'Muhammad Fathian Akbar Al Aqil', jk: JenisKelamin.L, orangIdExisting: 385, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 89, nama: 'Muhammad Izzy Fadhlu', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 90, nama: 'Muhammad Luthfillah', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 91, nama: 'Nasywa Sani Nafisa', jk: JenisKelamin.P, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 92, nama: 'Tasya Elmazaya', jk: JenisKelamin.P, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 93, nama: 'Ahmad Saifullah', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 94, nama: 'Aqila Latifah Hasan', jk: JenisKelamin.P, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 95, nama: 'Farouq Ahmad Q. T', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 96, nama: 'Ilmi Nurhasni', jk: JenisKelamin.P, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 97, nama: 'M. Fathurrahman', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 98, nama: 'M. Masykur Maulidi', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 99, nama: 'Muhammad Alwi Syihab', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 100, nama: 'Murida Azkia', jk: JenisKelamin.P, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 101, nama: 'Sabrina Laila', jk: JenisKelamin.P, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 102, nama: 'Uliyyatuz Zakiyah', jk: JenisKelamin.P, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 103, nama: 'Wahyu Warkham Nur Bai', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 104, nama: 'Ana Yunita Nuraini', jk: JenisKelamin.P, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 4', tingkat: '4' }] },
  { no: 105, nama: 'Anggun Maula A', jk: JenisKelamin.P, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 4', tingkat: '4' }] },
  { no: 106, nama: 'Farhan Rizky Kurniansyah', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 4', tingkat: '4' }] },
  { no: 107, nama: 'Fikril Hadad Ramadhani', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }, { ta: '2025/2026', kelas: 'Kelas 4', tingkat: '4' }] },
  { no: 108, nama: 'M. Najib Mubarok', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 4', tingkat: '4' }] },
  { no: 109, nama: 'M. Nur Ali Haqi', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }, { ta: '2025/2026', kelas: 'Kelas 4', tingkat: '4' }] },
  { no: 110, nama: 'Maulana Alfan Nur M', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 4', tingkat: '4' }] },
  { no: 111, nama: 'Selamita Syafira', jk: JenisKelamin.P, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 4', tingkat: '4' }] },
  { no: 112, nama: 'Syakira Lathifa', jk: JenisKelamin.P, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 4', tingkat: '4' }] },
  { no: 113, nama: 'Aflah Shidqi Murtadho', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 114, nama: 'Agus Rohib', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 115, nama: 'Ahmad Dliyauddin', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 116, nama: 'At Vidya Rahmatika R', jk: JenisKelamin.P, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 117, nama: 'Hasyimah Silvy Sefhia', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }, { ta: '2025/2026', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 118, nama: 'Hufairoh Al Adawiyyah', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }, { ta: '2025/2026', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 119, nama: 'Khullatul Laili', jk: JenisKelamin.P, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 120, nama: 'M. Hafidz Al-Fikri', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 121, nama: 'M. Naufal Syahma', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 2', tingkat: '2' }, { ta: '2025/2026', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 122, nama: 'M. Yushfa Dzihni', jk: JenisKelamin.L, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 123, nama: 'Masudah', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }, { ta: '2025/2026', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 124, nama: 'Vina Munya Zahra', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }, { ta: '2025/2026', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 125, nama: 'Agus Rosifat Aqli', jk: JenisKelamin.L, orangIdExisting: 515, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 2', tingkat: '2' }, { ta: '2025/2026', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 126, nama: 'Ahmad Dzakkir Waspodo', jk: JenisKelamin.L, orangIdExisting: 516, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 127, nama: 'Fahruz Zakiyyah Almah', jk: JenisKelamin.P, orangIdExisting: 517, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 6', tingkat: '6' }] },
  // DB: "Muhammmad Bismar As Sidiq, S.H" (Guru Mapel MA yang juga mengaji di
  // Madin). Nama roster tanpa gelar, jadi pencocokan nama persis gagal dan
  // sempat membuat Orang duplikat — dipatok lewat id.
  { no: 128, nama: 'M. Bismar As Sidiq', jk: JenisKelamin.L, orangIdExisting: 414, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 2', tingkat: '2' }, { ta: '2025/2026', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 129, nama: 'M. Misbahussurur', jk: JenisKelamin.L, orangIdExisting: 518, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 3', tingkat: '3' }, { ta: '2025/2026', kelas: 'Kelas 6', tingkat: '6' }] },
  // DB: "Wardatul Haizatil Husna, S.Sos., Gr" — sama seperti no. 128.
  { no: 130, nama: 'Wardatul Haizatil Husna', jk: JenisKelamin.P, orangIdExisting: 419, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 131, nama: 'Wildana Izza Afkarina', jk: JenisKelamin.P, orangIdExisting: 423, riwayat: [{ ta: '2025/2026', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 132, nama: 'Abdul Rahman', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 133, nama: 'Ach. Faridhal Athros', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 134, nama: 'Achmad Nauval Chaidar R', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 135, nama: 'Adam Faturrohman', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 136, nama: 'Afifah Asri Nur Fadhilah', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 1', tingkat: '1' }] },
  // DB: "Achmad Ahdani Dzikron"
  { no: 137, nama: 'Ahmad Ahdani Dzikron', jk: JenisKelamin.L, orangIdExisting: 499, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 138, nama: 'Ahmad Baha\'udin', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 139, nama: 'Ahmad Faiz Ubaidillah', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 140, nama: 'Ahmad Saiful Ikhwan', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 141, nama: 'Akmal Estu Wijaya', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 142, nama: 'Alfianti Nursyafitri', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 143, nama: 'Ali Wafa', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 4', tingkat: '4' }] },
  { no: 144, nama: 'Anisa Fitri Amalia', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 145, nama: 'Ariel Izza Kurnia', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 146, nama: 'At Vidya Rahmatika Raqshisima', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 147, nama: 'At Vidya Rahmatika Raqshusima', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 148, nama: 'Atiqoh Sabrina Hasan', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 149, nama: 'Aufal Anief', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 150, nama: 'Aulan Nisa’ Ulil K', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 4', tingkat: '4' }, { ta: '2023/2024', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 151, nama: 'Bidayati Lathifah', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 4', tingkat: '4' }] },
  { no: 152, nama: 'Bidayati Latifah', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 153, nama: 'Candra Susiana', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 154, nama: 'Dani Zakiata Fahmi', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 155, nama: 'Devi Musthoviyah', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 156, nama: 'Eka Zahroul Maulidiah', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 1', tingkat: '1' }, { ta: '2021/2022', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 157, nama: 'Ening Lu’luk Rosyada', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 158, nama: 'Fahmi Nasikh', jk: JenisKelamin.L, riwayat: [{ ta: '2023/2024', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 159, nama: 'Fahmi Nasikh Attahmidi', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 4', tingkat: '4' }] },
  { no: 160, nama: 'Faqihatul Mardhiyah', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 2', tingkat: '2' }, { ta: '2021/2022', kelas: 'Kelas 4', tingkat: '4' }, { ta: '2023/2024', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 161, nama: 'Farhan Zaky Audani', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 162, nama: 'Fatimatuz Zahro', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 163, nama: 'Fitri Muhammad Said', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 164, nama: 'Fitri Nabila', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 165, nama: 'Giana Ega Yustanti', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 166, nama: 'Halimatus Sa’diyah', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 167, nama: 'Hanna Khonsaul Adibah', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 168, nama: 'Hasina Tadum Nasitha Amelia', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 169, nama: 'Hulifatun Fauziyah', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 170, nama: 'Husnul Kholidah', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 1', tingkat: '1' }, { ta: '2021/2022', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 171, nama: 'Indri Nurul Fadhilah', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 172, nama: 'Indri Nurul Fadilah', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 4', tingkat: '4' }] },
  { no: 173, nama: 'Ishaqul Baihaqi', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 174, nama: 'Iskobar Santani', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 175, nama: 'Isma Nur Aziza', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 176, nama: 'Kamiliah Maulidiah', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 177, nama: 'Kholida Khuril Maula', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 178, nama: 'Kholifatun Khasanah', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 2', tingkat: '2' }, { ta: '2021/2022', kelas: 'Kelas 4', tingkat: '4' }, { ta: '2023/2024', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 179, nama: 'Lailatul Muizza', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 180, nama: 'Layyin Qorin Anisyah', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 1', tingkat: '1' }, { ta: '2021/2022', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 181, nama: 'Lubba Fatima Al Rashida', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 182, nama: 'M. Aliqodin', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 4', tingkat: '4' }, { ta: '2023/2024', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 183, nama: 'M. Andhi Hary Setya', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 184, nama: 'M. Dzamirul Haqqi', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 4', tingkat: '4' }, { ta: '2023/2024', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 185, nama: 'M. Faisal Zidan', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 186, nama: 'M. Ibadurrahman', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 187, nama: 'M. Irsyad Hanif', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 188, nama: 'M. Majdul Awaqib', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 189, nama: 'M. Ma’danil Fawaid', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 190, nama: 'M. Nabih Umamah', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 191, nama: 'M. Nasril Nirwansyah', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 192, nama: 'M. Rifqi Himami', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 193, nama: 'M. Rizki Ardiansyah', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 194, nama: 'M. Saifurrijaal', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 195, nama: 'M. Sofiul Umam Albar', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 196, nama: 'Marcella Maulidiya Aisya', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 197, nama: 'Mariyam Suroyya', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 198, nama: 'Maulana Alfan Nur Maghribi', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 199, nama: 'Miftakhul Ulum', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 200, nama: 'Muammar Kadafi', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 201, nama: 'Muhammad Azka Faliandri', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 202, nama: 'Muhammad Irfan', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 203, nama: 'Muhammad Islah Zam-zami', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 204, nama: 'Musfirotun', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 205, nama: 'Nadda Amalia Khoiro', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 206, nama: 'Nafika Fikria Arifianda', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 207, nama: 'Naila Hurriyah', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 208, nama: 'Nailah Nadwah', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 5', tingkat: '5' }, { ta: '2023/2024', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 209, nama: 'Najib Azhar M', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 210, nama: 'Narita Dewi Cahyani', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 2', tingkat: '2' }, { ta: '2021/2022', kelas: 'Kelas 4', tingkat: '4' }, { ta: '2023/2024', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 211, nama: 'Neni Musdalifah', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 4', tingkat: '4' }, { ta: '2023/2024', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 212, nama: 'Nila Khoirunaili', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 2', tingkat: '2' }, { ta: '2021/2022', kelas: 'Kelas 4', tingkat: '4' }, { ta: '2023/2024', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 213, nama: 'Nisrina Nada Aulia', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 214, nama: 'Nur Fatimatuz Zahrah', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 215, nama: 'Nuril Nikmatuz Zahro', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 1', tingkat: '1' }, { ta: '2021/2022', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 216, nama: 'Puji Bayu Slamet', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 217, nama: 'Putri Laksmi Marwa K', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 218, nama: 'Putri Rahayu Permatasari', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 1', tingkat: '1' }, { ta: '2021/2022', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 219, nama: 'Rafiidah Zaahiyah Rahmah', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 1', tingkat: '1' }, { ta: '2021/2022', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 220, nama: 'Rengganis', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 1', tingkat: '1' }, { ta: '2021/2022', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 221, nama: 'Rina Rizki Amalia', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 1', tingkat: '1' }, { ta: '2021/2022', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 222, nama: 'Rizqy Nur Ayu Putri', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 223, nama: 'Rofiah', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 224, nama: 'Rofiatul Karimah', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 225, nama: 'Rosyidah Husnul Khotimah', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 226, nama: 'Sabita Azmy Wardani', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 227, nama: 'Safira Lathifful Bizzah', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 228, nama: 'Sandrina Hanum', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 229, nama: 'Sinta Maya Diani', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 230, nama: 'Siti Fatimah', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 231, nama: 'Siti Masriatul', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 232, nama: 'Siti Masriatul K', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 233, nama: 'Siti Nur Alifah', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 234, nama: 'Siti Nur Hidayati', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 235, nama: 'Siti Zulfa Nurfatin Nuha', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 236, nama: 'Sufi Lutviah', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 2', tingkat: '2' }] },
  { no: 237, nama: 'Susi Lawati', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 1', tingkat: '1' }, { ta: '2021/2022', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 238, nama: 'Suwita Ningsih', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 1', tingkat: '1' }, { ta: '2021/2022', kelas: 'Kelas 3', tingkat: '3' }] },
  { no: 239, nama: 'Tika Kartika', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 240, nama: 'Tri Wahyu Ningsih', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 241, nama: 'Ulum Wahyu Febri Anggraini', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 5', tingkat: '5' }] },
  { no: 242, nama: 'Usep Umar Fauzi', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 243, nama: 'Vina Annafisah Nur’aini', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 244, nama: 'Wajendra Sakhvirnada Putra', jk: JenisKelamin.L, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 245, nama: 'Wilda Tamimatul Muna', jk: JenisKelamin.P, riwayat: [{ ta: '2021/2022', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 246, nama: 'Yuanita Tristi Amanda', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 2', tingkat: '2' }, { ta: '2021/2022', kelas: 'Kelas 4', tingkat: '4' }, { ta: '2023/2024', kelas: 'Kelas 6', tingkat: '6' }] },
  { no: 247, nama: 'Zahwa Mauliea Rahmadhan', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 1', tingkat: '1' }] },
  { no: 248, nama: 'Zulfa Fikriyah', jk: JenisKelamin.P, riwayat: [{ ta: '2019/2020', kelas: 'Kelas 1', tingkat: '1' }] },
];

async function main() {
  // --- Validasi seluruh daftar dulu, baru tulis (hindari partial write). ---
  const namaTerpakai = new Set<string>();
  const idTerpakai = new Set<number>();
  for (const o of DAFTAR) {
    if (!o.nama.trim()) throw new Error(`Baris ${o.no}: nama kosong`);
    if (namaTerpakai.has(o.nama)) throw new Error(`Baris ${o.no}: nama duplikat "${o.nama}"`);
    namaTerpakai.add(o.nama);
    if (o.orangIdExisting) {
      if (idTerpakai.has(o.orangIdExisting)) {
        throw new Error(`Baris ${o.no}: personId #${o.orangIdExisting} dipakai dua kali`);
      }
      idTerpakai.add(o.orangIdExisting);
    }
    if (o.riwayat.length === 0) throw new Error(`Baris ${o.no}: "${o.nama}" tanpa riwayat`);
    const taTerpakai = new Set<string>();
    for (const r of o.riwayat) {
      if (taTerpakai.has(r.ta)) {
        throw new Error(`Baris ${o.no}: "${o.nama}" punya dua kelas di TA ${r.ta}`);
      }
      taTerpakai.add(r.ta);
    }
  }

  const unit = await prisma.unit.findUniqueOrThrow({ where: { key: UNIT_KEY } });

  // Pastikan semua orang yang diklaim sudah ada memang ada, sebelum menulis.
  for (const o of DAFTAR.filter((x) => x.orangIdExisting)) {
    const ada = await prisma.person.findUnique({ where: { id: o.orangIdExisting! } });
    if (!ada) {
      throw new Error(`Baris ${o.no}: Orang #${o.orangIdExisting} ("${o.nama}") tidak ditemukan`);
    }
  }

  // --- Tahun ajaran: yang lama dibuat non-aktif bila belum ada. ---
  const kodeTa = [...new Set(DAFTAR.flatMap((o) => o.riwayat.map((r) => r.ta)))].sort();
  const taPerKode = new Map<string, { id: number; kode: string }>();
  for (const kode of kodeTa) {
    const ta = await prisma.academicYear.upsert({
      where: { code_semester: { code: kode, semester: SEMESTER } },
      update: {},
      create: { code: kode, semester: SEMESTER, isActive: false },
    });
    taPerKode.set(kode, { id: ta.id, kode: ta.code });
  }

  // --- Kelas per (nama kelas, tahun ajaran) yang dipakai daftar ini. ---
  const kelasPerKunci = new Map<string, { id: number }>();
  const kunciKelas = (nama: string, taId: number) => `${nama}@${taId}`;
  const kombinasi = new Map<string, BarisRiwayat>();
  for (const o of DAFTAR) {
    for (const r of o.riwayat) kombinasi.set(`${r.kelas}@${r.ta}`, r);
  }
  for (const r of kombinasi.values()) {
    const ta = taPerKode.get(r.ta)!;
    const kelas = await prisma.kelas.upsert({
      where: { unitId_nama_academicYearId: { unitId: unit.id, nama: r.kelas, academicYearId: ta.id } },
      update: {},
      create: { unitId: unit.id, nama: r.kelas, tingkat: r.tingkat, academicYearId: ta.id },
    });
    kelasPerKunci.set(kunciKelas(r.kelas, ta.id), { id: kelas.id });
  }

  let orangBaru = 0;
  let orangDipakaiUlang = 0;
  let santriDitulis = 0;
  /** Santri unit lain (MA/SMP) yang juga mengaji di Madin — tidak dipindah unit. */
  let santriLintasUnit = 0;
  let riwayatDitulis = 0;
  /** urut NIS hanya berjalan untuk santri aktif 2025/2026 */
  let urutNis = 0;

  for (const o of DAFTAR) {
    // 1. Orang: pakai yang sudah ada bila ditandai, else cocokkan nama, else buat.
    let orang = o.orangIdExisting
      ? await prisma.person.findUniqueOrThrow({ where: { id: o.orangIdExisting } })
      : await prisma.person.findFirst({ where: { fullName: o.nama, deletedAt: null } });

    if (orang) {
      orangDipakaiUlang += 1;
    } else {
      orang = await prisma.person.create({ data: { fullName: o.nama, gender: o.jk } });
      orangBaru += 1;
      await recordAudit({
        aksi: 'create',
        entitas: 'Orang',
        entitasId: String(orang.id),
        ringkasan: `Tambah orang baru "${o.nama}" dari roster Madin`,
        perubahan: { ke: { fullName: o.nama, gender: o.jk } },
        aktor: AKTOR_SKRIP,
      });
    }

    // 2. Santri: hanya untuk yang ada di roster TA berjalan (2025/2026).
    const barisAktif = o.riwayat.find((r) => r.ta === TA_AKTIF_BERKAS);
    if (barisAktif) {
      urutNis += 1;
      const ta = taPerKode.get(barisAktif.ta)!;
      const kelas = kelasPerKunci.get(kunciKelas(barisAktif.kelas, ta.id))!;
      const santriLama = await prisma.santri.findUnique({ where: { personId: orang.id } });

      if (santriLama) {
        // Santri unit lain (MA/SMP) yang juga mengaji di Madin: jangan pindahkan
        // unit/kelas/NIS-nya — cukup riwayat Madin di langkah 3.
        if (santriLama.unitId !== unit.id) {
          santriLintasUnit += 1;
        } else {
          const data = {
            kelasId: kelas.id,
            status: StatusSantri.Aktif,
            nis: santriLama.nis ?? buatNis(TAHUN_MASUK, KODE_UNIT, urutNis),
            tahunMasuk: santriLama.tahunMasuk ?? TAHUN_MASUK,
          };
          await prisma.santri.update({ where: { personId: orang.id }, data });
          santriDitulis += 1;
          await recordAudit({
            aksi: 'update',
            entitas: 'Santri',
            entitasId: String(santriLama.id),
            ringkasan: `Tempatkan "${orang.fullName}" di Madin ${barisAktif.kelas} ${ta.kode}`,
            perubahan: {
              dari: { kelasId: santriLama.kelasId, status: santriLama.status, nis: santriLama.nis },
              ke: data,
            },
            aktor: AKTOR_SKRIP,
          });
        }
      } else {
        const data = {
          personId: orang.id,
          nis: buatNis(TAHUN_MASUK, KODE_UNIT, urutNis),
          unitId: unit.id,
          kelasId: kelas.id,
          status: StatusSantri.Aktif,
          tahunMasuk: TAHUN_MASUK,
        };
        const dibuat = await prisma.santri.create({ data });
        santriDitulis += 1;
        await recordAudit({
          aksi: 'create',
          entitas: 'Santri',
          entitasId: String(dibuat.id),
          ringkasan: `Daftarkan "${orang.fullName}" sebagai santri Madin ${barisAktif.kelas} ${ta.kode}`,
          perubahan: { ke: data },
          aktor: AKTOR_SKRIP,
        });
      }
    }

    // 3. Riwayat per tahun ajaran — termasuk TA berjalan.
    for (const r of o.riwayat) {
      const ta = taPerKode.get(r.ta)!;
      const status = r.ta === TA_AKTIF_BERKAS ? StatusSantri.Aktif : StatusRiwayatPendidikan.Lulus;
      await prisma.riwayatPendidikan.upsert({
        where: {
          personId_unitId_academicYearId: { personId: orang.id, unitId: unit.id, academicYearId: ta.id },
        },
        update: { kelasNama: r.kelas, tingkat: r.tingkat, status },
        create: {
          personId: orang.id,
          unitId: unit.id,
          kelasNama: r.kelas,
          tingkat: r.tingkat,
          academicYearId: ta.id,
          status,
        },
      });
      riwayatDitulis += 1;
    }
  }

  console.log(`Impor riwayat Madin — unit ${unit.nama}`);
  console.log(`  Orang baru dibuat     : ${orangBaru}`);
  console.log(`  Orang dipakai ulang   : ${orangDipakaiUlang}`);
  console.log(`  Baris Santri ditulis  : ${santriDitulis}`);
  console.log(`  Santri unit lain      : ${santriLintasUnit} (riwayat Madin saja, unit tidak diubah)`);
  console.log(`  Baris riwayat ditulis : ${riwayatDitulis}`);

  // --- Assertion akhir. ---
  const totalRiwayat = DAFTAR.reduce((a, o) => a + o.riwayat.length, 0);
  if (riwayatDitulis !== totalRiwayat) {
    throw new Error(`Verifikasi gagal: ${riwayatDitulis} dari ${totalRiwayat} riwayat ditulis`);
  }
  for (const [kode, ta] of taPerKode) {
    const n = await prisma.riwayatPendidikan.count({
      where: { unitId: unit.id, academicYearId: ta.id },
    });
    const harap = DAFTAR.filter((o) => o.riwayat.some((r) => r.ta === kode)).length;
    if (n < harap) {
      throw new Error(`Verifikasi gagal TA ${kode}: ${n} riwayat, minimal ${harap}`);
    }
    console.log(`  TA ${kode}: ${n} riwayat (daftar ini: ${harap})`);
  }
  console.log('\nOK — seluruh riwayat Madin tercatat.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
