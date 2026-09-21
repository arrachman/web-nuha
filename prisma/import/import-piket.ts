/**
 * Impor jadwal guru piket → `JadwalPiket`.
 *
 * Sumber: foto `docs/WhatsApp Image 2026-08-26 at 17.47.31.jpeg` (tabel
 * "A. Jadwal Guru Piket", berlabel MPLS). Client MENGKONFIRMASI (2026-08-26,
 * lihat RENCANA-IMPORT.md §Fase 7.2) jadwal ini dipakai sebagai piket
 * reguler mingguan, bukan khusus masa orientasi.
 *
 * CATATAN PENTING — dua penyimpangan dari asumsi awal, ditemukan saat
 * membaca foto:
 *   1. Jum'at hanya berisi 2 shift (07.00-09.35, 09.00-11.05), BUKAN 3 shift
 *      seperti hari lain — jadi totalnya 17 baris, bukan 18 (6 hari × 3).
 *      Jam shift kedua Jum'at (09.00-11.05) juga tidak nyambung dengan jam
 *      shift pertama, kemungkinan salah cetak di sumber — diimpor apa
 *      adanya, TIDAK dikoreksi menebak.
 *   2. Dari 17 nama di foto, 5 cocok ke `Pegawai` unit MA: 2 lewat normalisasi
 *      gelar saja (Rofiatul Mukarromah, Alfan Jamil) dan 3 lewat pemetaan
 *      eksplisit di `EJAAN_FOTO` di bawah. 12 sisanya tidak punya padanan
 *      sama sekali — seluruhnya diduga guru SMP, yang datanya memang belum
 *      pernah diserahkan client (RENCANA-IMPORT.md §Yang masih perlu dari
 *      client butir 1).
 *
 * Kebijakan kegagalan: baris tak cocok DILEWATI dan dilaporkan, tidak
 * membatalkan seluruh berkas — sama seperti `import-siswa-smp.ts`. Alasannya
 * 12 baris itu menunggu data yang belum ada, sedangkan 5 baris yang sudah
 * pasti benar adalah prasyarat reminder piket (Fase 7.2); menahan semuanya
 * berarti fitur itu tidak bisa diuji sampai data guru SMP tiba. Yang TIDAK
 * dilonggarkan: pencocokan itu sendiri — tetap hanya kecocokan tunggal,
 * selisih ejaan diselesaikan dengan entri eksplisit, bukan tebakan.
 * Idempoten lewat `@@unique([hari, waktuMulai])`, aman dijalankan ulang.
 *
 * Jalankan: `npm exec tsx prisma/import/import-piket.ts`.
 */
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { normalisasiNama } from './lib/normalisasi-nama';

const AKTOR_SKRIP = { nama: 'Importir piket guru (skrip)' };

type BarisPiket = { hari: string; waktuMulai: string; waktuSelesai: string; namaFoto: string; urutan: number };

// Dibaca langsung dari foto — lihat catatan di atas untuk penyimpangan.
const SUMBER: Omit<BarisPiket, 'urutan'>[] = [
  { hari: 'Senin', waktuMulai: '06.45', waktuSelesai: '09.35', namaFoto: 'Rofiatul Mukarromah, S.Pd., Gr.' },
  { hari: 'Senin', waktuMulai: '09.35', waktuSelesai: '11.40', namaFoto: 'Azkannadiya El Syarevah, S.s' },
  { hari: 'Senin', waktuMulai: '11.40', waktuSelesai: '13.25', namaFoto: 'M. Bismar As-Shidiq, S.H' },
  { hari: 'Selasa', waktuMulai: '07.00', waktuSelesai: '09.35', namaFoto: 'Agus Rohib, S.Pd' },
  { hari: 'Selasa', waktuMulai: '09.35', waktuSelesai: '11.40', namaFoto: 'Lathifatul Ummah, S.Pd' },
  { hari: 'Selasa', waktuMulai: '11.40', waktuSelesai: '13.25', namaFoto: 'Hasina tadum Nasitha Amelia, S.s' },
  { hari: 'Rabu', waktuMulai: '07.00', waktuSelesai: '09.35', namaFoto: 'Neni Musdalifah, S.E' },
  { hari: 'Rabu', waktuMulai: '09.35', waktuSelesai: '11.40', namaFoto: 'Ropiah, S.Pn' },
  { hari: 'Rabu', waktuMulai: '11.40', waktuSelesai: '13.25', namaFoto: 'Nafika Fikria Arifianda, S.Pd., Gr.' },
  { hari: 'Kamis', waktuMulai: '07.00', waktuSelesai: '09.35', namaFoto: 'Alfan Jamil, M.Si., Gr.' },
  { hari: 'Kamis', waktuMulai: '09.35', waktuSelesai: '11.40', namaFoto: 'Khoirunnisa, M.Pd' },
  { hari: 'Kamis', waktuMulai: '11.40', waktuSelesai: '13.25', namaFoto: 'Fitri Muchammad Said, S.Pd., Gr.' },
  { hari: "Jum'at", waktuMulai: '07.00', waktuSelesai: '09.35', namaFoto: 'Ahmad Wildan Afif, M.Pd' },
  { hari: "Jum'at", waktuMulai: '09.00', waktuSelesai: '11.05', namaFoto: 'Noor Hidayah, S.s' },
  { hari: 'Sabtu', waktuMulai: '06.45', waktuSelesai: '09.35', namaFoto: 'Abdul Rohman, S.Tr.Kom., Gr.' },
  { hari: 'Sabtu', waktuMulai: '09.35', waktuSelesai: '11.40', namaFoto: 'Devi Musthoviyah, S.Pd' },
  { hari: 'Sabtu', waktuMulai: '11.40', waktuSelesai: '13.25', namaFoto: 'Warda Haizatil Husna, S.Sos., Gr.' },
].map((baris, i) => ({ ...baris, urutan: i }));

/**
 * Ejaan di foto → ejaan `Orang.nama` di database, untuk nama yang tidak bisa
 * dijembatani `normalisasiNama` (singkatan, huruf hilang, apostrof lengkung).
 * Ketiganya diverifikasi satu per satu ke daftar Pegawai unit MA — masing-
 * masing hanya punya SATU kandidat yang masuk akal, bukan tebakan kemiripan:
 *   - "M. Bismar"      → "Muhammmad Bismar As Sidiq" (DATA GURU.xlsx, tiga m)
 *   - "Muchammad Said" → "Fitri Muchammad Sa’id" (apostrof U+2019 di DB)
 *   - "Warda Haizatil" → "Wardatul Haizatil Husna" (foto kehilangan "tul")
 * Nama lain JANGAN ditambahkan ke sini tanpa verifikasi setara.
 */
const EJAAN_FOTO: Readonly<Record<string, string>> = Object.freeze({
  'M. Bismar As-Shidiq, S.H': 'Muhammmad Bismar As Sidiq, S.H',
  'Fitri Muchammad Said, S.Pd., Gr.': 'Fitri Muchammad Sa’id, S.Pd, Gr',
  'Warda Haizatil Husna, S.Sos., Gr.': 'Wardatul Haizatil Husna, S.Sos., Gr',
});

type Galat = { baris: number; pesan: string };

async function jalankan(): Promise<void> {
  const pegawai = await prisma.staff.findMany({ include: { person: true } });
  const kamusPegawai = new Map(pegawai.map((p) => [normalisasiNama(p.person.fullName), p]));

  const siap: { baris: BarisPiket; pegawaiId: bigint }[] = [];
  const galat: Galat[] = [];

  SUMBER.forEach((baris, i) => {
    const namaCari = EJAAN_FOTO[baris.namaFoto] ?? baris.namaFoto;
    const cocok = kamusPegawai.get(normalisasiNama(namaCari));
    if (!cocok) {
      galat.push({ baris: i + 1, pesan: `nama "${baris.namaFoto}" (${baris.hari} ${baris.waktuMulai}) tidak cocok ke Pegawai manapun di database` });
      return;
    }
    siap.push({ baris: { ...baris, urutan: i }, pegawaiId: cocok.id });
  });

  if (galat.length > 0) {
    console.error(
      `${galat.length} dari ${SUMBER.length} baris DILEWATI karena namanya tidak cocok ke Pegawai manapun ` +
        '(diduga guru SMP — datanya belum pernah diserahkan client):\n',
    );
    for (const g of galat) console.error(`  - [baris ${g.baris}] ${g.pesan}`);
    console.error('\nSetelah data guru SMP masuk, jalankan ulang skrip ini — idempoten, baris yang sudah ada di-upsert.\n');
  }

  if (siap.length === 0) {
    console.error('Tidak ada baris yang cocok sama sekali. Tidak ada data yang ditulis ke DB.');
    process.exitCode = 1;
    return;
  }

  console.log(`${siap.length} baris cocok. Menulis ke database...`);
  for (const s of siap) {
    await prisma.jadwalPiket.upsert({
      where: { hari_waktuMulai: { hari: s.baris.hari, waktuMulai: s.baris.waktuMulai } },
      create: {
        hari: s.baris.hari,
        waktuMulai: s.baris.waktuMulai,
        waktuSelesai: s.baris.waktuSelesai,
        staffId: s.pegawaiId,
        urutan: s.baris.urutan,
      },
      update: { waktuSelesai: s.baris.waktuSelesai, staffId: s.pegawaiId, urutan: s.baris.urutan },
    });
  }
  await recordAudit({
    aksi: 'import',
    entitas: 'JadwalPiket',
    ringkasan: `Impor ${siap.length} baris jadwal piket guru dari foto MPLS`,
    aktor: AKTOR_SKRIP,
  });
  console.log(`Selesai: ${siap.length} baris JadwalPiket ditulis.`);
}

jalankan()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
