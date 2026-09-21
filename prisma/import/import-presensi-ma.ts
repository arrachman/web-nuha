/**
 * Rencana awal: impor "Presensi MA - DashboardSiswa.csv" → `Presensi`
 * (per santri, per tanggal, per sesi) untuk kelas XI IPS.
 *
 * TEMUAN NYATA (bukan asumsi rencana) — berkas ini BUKAN log presensi
 * per-tanggal, melainkan hasil ekspor dashboard rekap agregat per siswa:
 * kolom yang ada adalah `Total Hadir`, `Total Terlambat`, `Total Pulang`,
 * `Hari Tercatat`, `% Kehadiran` — tidak ada kolom tanggal maupun sesi sama
 * sekali. Skema `Presensi` di database mewajibkan pasangan unik
 * `[santriId, tgl, sesi]` per baris, sehingga baris agregat semacam ini
 * TIDAK BISA dipetakan ke baris `Presensi` tanpa mengarang tanggal/sesi —
 * itu melanggar aturan keras "jangan paksakan atau karang data".
 *
 * Sebagai bukti tambahan bahwa ini murni rekap (bukan bisa dibalik jadi
 * log harian): kolom `Hari Tercatat` bernilai 1 untuk SEMUA baris, padahal
 * `Total Hadir + Total Terlambat + Total Pulang` per siswa jauh lebih besar
 * dari 1 (mis. baris pertama: 10 + 4 + 16 = 30) — angka-angka itu tidak
 * konsisten sebagai catatan satu hari, kemungkinan bug/sisa filter di sisi
 * dashboard sumber, bukan sesuatu yang bisa ditafsirkan importir ini.
 *
 * KEPUTUSAN: modul ini TIDAK menulis apa pun ke `Presensi`. Ia hanya
 * memvalidasi bahwa struktur berkas memang seperti temuan di atas (bukan
 * berubah jadi log per-tanggal yang sebenarnya bisa diimpor), lalu berhenti
 * dengan laporan jelas — sesuai instruksi "laporkan apa adanya dan lewati
 * modul itu" bila struktur berkas tidak sesuai rencana. Perlu diklarifikasi
 * ke client: apakah ada ekspor presensi per-tanggal yang sesungguhnya
 * (mis. dari sistem absensi harian), karena berkas ini tidak memuatnya.
 *
 * Jalankan: `npm run import:presensi-ma` (path default docs/, override --file).
 */
import { readFileSync } from 'node:fs';
import { parseCsv } from './lib/csv';

const bacaArgumen = (argv: string[]): Record<string, string> => {
  const hasil: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      hasil[argv[i].slice(2)] = argv[i + 1] ?? '';
      i += 1;
    }
  }
  return hasil;
};

async function jalankan(): Promise<void> {
  const argumen = bacaArgumen(process.argv.slice(2));
  const path = argumen.file || 'docs/Presensi MA - DashboardSiswa.csv';

  const teksMentah = readFileSync(path, 'utf-8');
  // 3 baris pertama berkas ini adalah judul dashboard + baris kosong, bukan
  // header tabel — header sesungguhnya (No,Nama,...) ada di baris ke-4.
  const barisSetelahJudul = teksMentah.split(/\r\n|\r|\n/).slice(3).join('\n');
  const baris = parseCsv(barisSetelahJudul);

  if (baris.length === 0) {
    console.error(`"${path}": tidak ada baris data terbaca setelah melewati 3 baris judul — struktur berkas mungkin berubah.`);
    process.exitCode = 1;
    return;
  }

  const kolomWajib = ['No', 'Nama', 'Kelas / Bidang', 'Total Hadir', 'Total Terlambat', 'Total Pulang', 'Hari Tercatat'];
  const kolomHilang = kolomWajib.filter((k) => !(k in baris[0]));
  if (kolomHilang.length > 0) {
    console.error(`"${path}": kolom wajib tidak ditemukan: ${kolomHilang.join(', ')} — struktur berkas mungkin berubah, cek ulang rencana impor.`);
    process.exitCode = 1;
    return;
  }

  console.error(
    `"${path}" adalah rekap agregat per siswa (kolom Total Hadir/Total Terlambat/Total Pulang/Hari Tercatat), ` +
      'BUKAN log presensi per-tanggal — tidak ada kolom tanggal/sesi untuk dipetakan ke tabel Presensi ' +
      '([santriId, tgl, sesi] unik). Tidak ada data yang ditulis ke DB.\n',
  );
  console.error(`Ditemukan ${baris.length} baris rekap untuk kelas: ${[...new Set(baris.map((b) => b['Kelas / Bidang']))].join(', ')}.`);
  console.error('Perlu diklarifikasi ke client: apakah tersedia ekspor presensi per-tanggal (log harian), bukan rekap dashboard ini.');
  process.exitCode = 1;
}

jalankan().catch((error) => {
  console.error('Galat tak terduga saat memeriksa berkas presensi MA:', error);
  process.exitCode = 1;
});
