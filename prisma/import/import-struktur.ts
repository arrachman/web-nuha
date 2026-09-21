/**
 * Impor struktur organisasi dari SK pengangkatan → `JabatanStruktural`.
 *
 * Sumber: dua SK yang sudah diekstrak manual (PDF tidak bisa dibaca ulang
 * otomatis, jadi datanya hardcode di sini — pola sama dengan
 * `import-piket.ts`):
 *   - SK MA nomor 008/YKM-NH/SK-MA/VII/2026 (2026-07-11 s/d 2029-07-10),
 *     lingkup unit MA, 9 baris.
 *   - SK Asrama Putra nomor 006/YKM-NH/SK-APa/VII/2026 (2026-07-11 s/d
 *     2027-07-10), lingkup Pondok, 31 baris (Lurah/Sekretaris/Keuangan +
 *     28 pengurus divisi).
 *
 * KEPUTUSAN DESAIN (Fase 4) — jabatan struktural BUKAN peran RBAC. `peran`
 * mengatur akses menu; 12 peran yang ada sudah cukup (kepsmp, kepma,
 * pengasuh, guru, wali, bendahara, ketua, poskestren, santri, superadmin,
 * musyrif-asrama, tata-usaha). Tidak ada satu pun jabatan di SK ini yang
 * butuh akses menu berbeda dari peran yang sudah ada, jadi TIDAK ADA peran
 * baru ditambahkan di importir ini.
 *
 * CATATAN PENTING — dua hal yang SENGAJA TIDAK ditebak:
 *   1. Batas divisi pengurus asrama (no 4-31: Div. Pendidikan/Peribadatan/
 *      Keamanan/Kebersihan & Kesehatan/Sarpras) AMBIGU di teks ekstraksi —
 *      tidak jelas apakah label divisi mengawali atau mengakhiri
 *      kelompoknya. `divisi` diisi NULL untuk semua baris no 4-31; ini
 *      PERLU KONFIRMASI CLIENT sebelum bisa diisi.
 *   2. Hampir semua nama di SK Asrama (termasuk Lurah/Sekretaris/Keuangan
 *      dan 28 pengurus) TIDAK ADA di tabel Pegawai — mereka santri/pengurus
 *      pondok, bukan pegawai. `pegawaiId` NULL, `namaMentah` menyimpan nama
 *      persis dari SK. Kecocokan HANYA lewat `normalisasiNama` (otomatis)
 *      ditambah satu koreksi ejaan eksplisit yang sudah diverifikasi
 *      sebelumnya di `import-piket.ts` (Wardatul Haizatil Husna) — tidak ada
 *      tebakan kemiripan lain yang ditambahkan di sini.
 *
 * Kebijakan kegagalan: baris tak cocok ke Pegawai TETAP ditulis dengan
 * `pegawaiId` NULL (bukan dilewati) — beda dari import-piket.ts, karena di
 * sini yang penting adalah struktur organisasinya sendiri (posisi & jabatan)
 * ada terlebih dahulu, bukan cuma baris yang lengkap.
 *
 * Idempoten lewat `@@unique([skNomor, urutan])`. Satu orang boleh menjabat
 * lebih dari satu jabatan (Isma Izha Utama: Waka Sarpras + Kepala Lab di MA,
 * juga muncul di SK Asrama no 26) — tidak ada kunci unik per pegawaiId yang
 * menghalangi ini.
 *
 * Jalankan: `npm exec tsx prisma/import/import-struktur.ts`.
 */
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { normalisasiNama } from './lib/normalisasi-nama';

const AKTOR_SKRIP = { nama: 'Importir struktur organisasi (skrip)' };

type BarisSk = {
  jabatan: string;
  namaMentah: string;
  divisi: string | null;
};

type SumberSk = {
  skNomor: string;
  lingkup: string;
  periodeMulai: string;
  periodeSelesai: string;
  baris: BarisSk[];
};

const SK_MA: SumberSk = {
  skNomor: '008/YKM-NH/SK-MA/VII/2026',
  lingkup: 'MA',
  periodeMulai: '2026-07-11',
  periodeSelesai: '2029-07-10',
  baris: [
    { jabatan: 'Pengawas Internal', namaMentah: 'Dra. Nyai Hj. Roudlatul Hasanah, M.Pd', divisi: null },
    { jabatan: 'Kepala Madrasah', namaMentah: "Khalimatus Sa'diyah, S.Si", divisi: null },
    { jabatan: 'Wakil Ketua Bid. Kurikulum', namaMentah: 'Ilmi Nurhasni Addin', divisi: null },
    { jabatan: 'Wakil Ketua Bid. Kesiswaan', namaMentah: 'Murida Azkia, S.Pd', divisi: null },
    { jabatan: 'Wakil Ketua Bid. Sarana Prasarana', namaMentah: 'Isma Izha Utama', divisi: null },
    { jabatan: 'Wakil Ketua Bid. Humas', namaMentah: "Aulan Nisa' Ulil Kamaliah, S.Pd", divisi: null },
    { jabatan: 'Kepala Laboratorium', namaMentah: 'Isma Izha Utama', divisi: null },
    // Kordinator TU sebelumnya dijabat Khalimatus Sa'diyah (kini Kepala
    // Madrasah) — pengganti belum ditentukan, dikosongkan sesuai instruksi.
    { jabatan: 'Kordinator Tata Usaha', namaMentah: '', divisi: null },
    { jabatan: 'Bimbingan Konseling', namaMentah: 'Wardatul Haaizatil Husna, S.Pd., Gr', divisi: null },
  ],
};

// Nama no 4-31 diduga pengurus/santri asrama, bukan Pegawai — lihat catatan
// berkas di atas soal batas divisi yang ambigu (semua `divisi: null`).
const NAMA_PENGURUS_DIVISI: string[] = [
  'Muhammad Bismar As Sidiq',
  'Agus Rohib',
  'M. Noor Ali Haqqi',
  'Ahmad Rafa Ascarya Ekamas Putra',
  'Maulana Ridwan Aqilah',
  'Ahmad Ahdani Dzikron',
  'Muhammad Choirul Anam',
  'Muhammad Abdullah Azamy',
  'Ahmad Aqil Fathani',
  "Addafi Syar'i Muhammad",
  'Adibu Sholeh Ahmad',
  'Adam Fathurrohman',
  'M. Fitrah Thibbil Qolby',
  'Muhammad Majdul Awaqib',
  'Muhammad Izzy Fadhlu Robby',
  'Muhammad Yushfa Dzihni',
  'Achmad Dzakkir Waspodo',
  'Farouq Ahmad Qorro Tufad',
  'Moch. Hafidz Al-Fikri',
  'Achmad Syaifullah',
  'M. Faris Aufa Syahmi',
  'M. Uwais Qorne',
  'Isma Izha Utama',
  'Ahmad Shafly Al Kautsar',
  'Muhammad Nawwaf Al Hasani',
  'Muhammad Irvan Azis',
  'Yosef Muhaimin Iskandar',
  'Achmad Tsaaqib As-Syawwali',
];

const SK_ASRAMA: SumberSk = {
  skNomor: '006/YKM-NH/SK-APa/VII/2026',
  lingkup: 'Pondok',
  periodeMulai: '2026-07-11',
  periodeSelesai: '2027-07-10',
  baris: [
    { jabatan: 'Lurah', namaMentah: 'Muhammad Nailu Nur Fuadiy', divisi: null },
    { jabatan: 'Sekretaris', namaMentah: 'Ahmad Dliyauddin', divisi: null },
    { jabatan: 'Keuangan', namaMentah: 'Muhammad Maasykur Maulidi', divisi: null },
    // Batas Div. Pendidikan/Peribadatan/Keamanan/Kebersihan & Kesehatan/
    // Sarpras AMBIGU — lihat catatan berkas. Jabatan generik "Pengurus".
    ...NAMA_PENGURUS_DIVISI.map((namaMentah) => ({ jabatan: 'Pengurus', namaMentah, divisi: null })),
  ],
};

/**
 * Koreksi ejaan SK → ejaan `Orang.nama` di database. Hanya satu entri,
 * sudah diverifikasi sebelumnya di `import-piket.ts` (nama sama, sumber
 * beda): SK menulis "Haaizatil" (dua a) sedangkan DB "Haizatil". Nama lain
 * JANGAN ditambahkan tanpa verifikasi setara.
 */
const EJAAN_SK: Readonly<Record<string, string>> = Object.freeze({
  'Wardatul Haaizatil Husna, S.Pd., Gr': 'Wardatul Haizatil Husna, S.Sos., Gr',
});

async function jalankan(): Promise<void> {
  const pegawai = await prisma.staff.findMany({ include: { person: true } });
  const kamusPegawai = new Map(pegawai.map((p) => [normalisasiNama(p.person.fullName), p]));

  let cocok = 0;
  let takCocok = 0;
  let ditulis = 0;

  for (const sumber of [SK_MA, SK_ASRAMA]) {
    for (let i = 0; i < sumber.baris.length; i += 1) {
      const b = sumber.baris[i];
      const namaCari = EJAAN_SK[b.namaMentah] ?? b.namaMentah;
      const p = kamusPegawai.get(normalisasiNama(namaCari));
      if (p) cocok += 1;
      else takCocok += 1;

      await prisma.structuralPosition.upsert({
        where: { decreeNumber_order: { decreeNumber: sumber.skNomor, order: i } },
        create: {
          decreeNumber: sumber.skNomor,
          order: i,
          position: b.jabatan,
          scope: sumber.lingkup,
          division: b.divisi,
          startPeriod: new Date(sumber.periodeMulai),
          endPeriod: new Date(sumber.periodeSelesai),
          staffId: p?.id ?? null,
          sourceName: b.namaMentah,
        },
        update: {
          position: b.jabatan,
          scope: sumber.lingkup,
          division: b.divisi,
          startPeriod: new Date(sumber.periodeMulai),
          endPeriod: new Date(sumber.periodeSelesai),
          staffId: p?.id ?? null,
          sourceName: b.namaMentah,
        },
      });
      ditulis += 1;
    }
  }

  await recordAudit({
    aksi: 'import',
    entitas: 'JabatanStruktural',
    ringkasan: `Impor ${ditulis} baris struktur organisasi dari 2 SK (MA & Asrama Putra) — ${cocok} cocok ke Pegawai, ${takCocok} pegawaiId NULL`,
    aktor: AKTOR_SKRIP,
  });

  console.log(`Selesai: ${ditulis} baris JabatanStruktural ditulis (upsert). Cocok ke Pegawai: ${cocok}. Tidak cocok (pegawaiId NULL): ${takCocok}.`);
}

jalankan()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
