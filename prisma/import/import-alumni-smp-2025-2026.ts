/**
 * Catat 24 siswa kelas IX-A SMP Nurul Huda sebagai LULUS tahun ajaran
 * 2025/2026, dari data diri siswa yang diserahkan operator (berkas "DATA
 * DIRI SISWA TAHUN AJARAN 2025/2026 KELAS 9"). Data ditulis literal di
 * berkas ini agar sumbernya satu dan bisa di-review lewat git, mengikuti
 * pola `import-siswa-ma-2025.ts`.
 *
 * SEMUA 24 NIK di sumber ini SUDAH ADA di `Orang` (santri lama). Sebagian
 * besar kini aktif sebagai santri `Mukim` di MA — mereka TIDAK boleh ditulis
 * ulang jadi `Santri.status = Alumni` karena satu `Orang` cuma boleh punya
 * satu baris `Santri` aktif (akan menghapus status MA aktif mereka). Karena
 * itu kelulusan SMP ini dicatat di `RiwayatPendidikan` (riwayat jenjang,
 * terpisah dari peran aktif), bukan dengan mengubah `Santri` yang ada.
 *
 * Selain riwayat, skrip ini juga MENYINKRONKAN biodata dari sumber terbaru:
 * wilayah administratif (RT/RW, kelurahan, kecamatan, kabupaten), nomor HP
 * santri, serta nama/NIK/HP wali. Kolom yang kosong di sumber sengaja tidak
 * menimpa nilai yang sudah ada di basis data (lihat `atau`).
 *
 * Baris "Contoh pengisian" di sumber SENGAJA dilewati — itu baris instruksi
 * template, bukan siswa sungguhan.
 *
 * Jalankan: `npm run import:alumni-smp-2025`
 */
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { JenisKelamin, StatusRiwayatPendidikan, StatusSantri } from '@prisma/client';
import { parseTtl } from './lib/tanggal-id';
import { tulisGuardianRelation } from './lib/tulis-wali';

const AKTOR_SKRIP = { nama: 'Importir alumni SMP 2025/2026 (skrip)' };
const KODE_UNIT = 'SMP';
const KODE_TA = '2025/2026';
const SEMESTER_TA = 'Gasal';
const NAMA_KELAS = 'IX-A';
const TINGKAT_KELAS = '9';

type BarisSiswa = {
  no: number;
  nama: string;
  ttl: string;
  jk: JenisKelamin;
  nik: string;
  nisn: string;
  alamat: string;
  rt: string;
  rw: string;
  kelurahan: string;
  kecamatan: string;
  kabupaten: string;
  /** HP santri; kosong di sumber untuk sebagian anak (dipakai HP wali). */
  hp: string;
  /** Sumber SMP hanya punya satu kolom gabungan "NAMA IBU/AYAH/WALI".
   * `peran` diisi bila kita tahu perannya dari sumber lain (berkas MA yang
   * memisah blok Ayah/Ibu); bila kosong dicatat sebagai `Wali`. */
  wali: { nama: string; nik: string; hp: string; peran?: 'Ayah' | 'Ibu' };
};

const DATA: BarisSiswa[] = [
  { no: 1, nama: 'Achmad Tsaaqib As-Syawwali', ttl: 'Malang, 12 September 2010', jk: JenisKelamin.P, nik: '3573031209100001', nisn: '0105377373', alamat: 'Jl. Kol. Sugiono III B/7, Kel. Mergosono, Kec. Kedungkandang, Kota Malang', rt: '4', rw: '5', kelurahan: 'Mergosono', kecamatan: 'Kedungkandang', kabupaten: 'Kota Malang', hp: '087889973265', wali: { nama: 'Reni Hartini', nik: '3573034407880002', hp: '087889973265' , peran: 'Ibu' } },
  { no: 2, nama: "Addafi Syar'i Muhammad", ttl: 'Malang, 25 Juli 2011', jk: JenisKelamin.L, nik: '3573032507110005', nisn: '0116651628', alamat: 'Jl. Kol. Sugiono III A/249, Kel. Mergosono, Kec. Kedungkandang, Kota Malang', rt: '5', rw: '4', kelurahan: 'Mergosono', kecamatan: 'Kedungkandang', kabupaten: 'Kota Malang', hp: '081230211725', wali: { nama: 'Nun Farida', nik: '3573036302810005', hp: '081230211725' , peran: 'Ibu' } },
  { no: 3, nama: 'Ade Gita Fadilah', ttl: 'Malang, 25 Januari 2011', jk: JenisKelamin.L, nik: '3573036501110003', nisn: '0116130624', alamat: 'Jl. Kol. Sugiono VA/175, Kel. Mergosono, Kec. Kedungkandang, Kota Malang', rt: '4', rw: '3', kelurahan: 'Mergosono', kecamatan: 'Kedungkandang', kabupaten: 'Kota Malang', hp: '089507428974', wali: { nama: 'Nurhayati', nik: '3573035111790010', hp: '089507428974' } },
  { no: 4, nama: 'Aisyah Aulia Mutiara Putri', ttl: 'Malang, 19 November 2010', jk: JenisKelamin.P, nik: '3573025911100005', nisn: '0103605635', alamat: 'Jl. KH. Ahmad Dahan I/465, Kel. Sukoharjo, Kec. Klojen, Kota Malang', rt: '4', rw: '2', kelurahan: 'Sukoharjo', kecamatan: 'Klojen', kabupaten: 'Kota Malang', hp: '083848495121', wali: { nama: 'Eny Irawati', nik: '3573026212710001', hp: '083848495121' , peran: 'Ibu' } },
  { no: 5, nama: 'Alisyah Hikmah Maulana', ttl: 'Malang, 22 Februari 2011', jk: JenisKelamin.P, nik: '3573036202110008', nisn: '0116201580', alamat: 'Jl. Muharto VII/33, Kel. Kota Lama, Kec. Kedungkandang, Kota Malang', rt: '8', rw: '7', kelurahan: 'Kota Lama', kecamatan: 'Kedungkandang', kabupaten: 'Kota Malang', hp: '085706399663', wali: { nama: 'Siti Chopsyah', nik: '3573035209780002', hp: '085706399663' } },
  { no: 6, nama: 'Dewi Aisar', ttl: 'Malang, 05 November 2010', jk: JenisKelamin.P, nik: '3573034511100006', nisn: '0106738352', alamat: 'Jl. Kol. Sugiono III B/37, Kel. Mergosono, Kec. Kedungkandang, Kota Malang', rt: '7', rw: '5', kelurahan: 'Mergosono', kecamatan: 'Kedungkandang', kabupaten: 'Kota Malang', hp: '087777754022', wali: { nama: 'Lusiah', nik: '3573034809780005', hp: '081232606533' } },
  { no: 7, nama: 'Dzaki Rohmatullah', ttl: 'Malang, 25 September 2010', jk: JenisKelamin.L, nik: '3573032509100003', nisn: '0105685773', alamat: 'Jl. Kol. Sugiono 3B, Kel. Mergosono, Kec. Kedungkandang, Kota Malang', rt: '9', rw: '5', kelurahan: 'Mergosono', kecamatan: 'Kedungkandang', kabupaten: 'Kota Malang', hp: '081233009017', wali: { nama: 'Anna Indriani', nik: '3573035703770004', hp: '081233009017' } },
  { no: 8, nama: 'Errena Tembang Sosialista Tazheva', ttl: 'Medan, 05 Februari 2011', jk: JenisKelamin.P, nik: '1271184502110001', nisn: '0112234300', alamat: 'Jl. Park Line 20 Blok B5 No. 38, Desa Pasirkembang, Kec. Maja, Kab. Lebak, Banten', rt: '1', rw: '4', kelurahan: 'Pasirkembang', kecamatan: 'Maja', kabupaten: 'Kab. Lebak', hp: '089527023362', wali: { nama: 'Mabruroh', nik: '1271185902850004', hp: '089527023362' , peran: 'Ibu' } },
  { no: 9, nama: 'Gus Ramadhani', ttl: 'Malang, 14 Agustus 2010', jk: JenisKelamin.L, nik: '3573011408100006', nisn: '0102492388', alamat: 'Jl. Jodipan Wetan Gg 1, Kel. Jodipan, Kec. Blimbing, Kota Malang', rt: '14', rw: '7', kelurahan: 'Jodipan', kecamatan: 'Blimbing', kabupaten: 'Kota Malang', hp: '0895344308117', wali: { nama: 'Agustin Ariyani', nik: '3573015608930001', hp: '0895344308117' } },
  { no: 10, nama: 'Khairan Muhamad Alghifari', ttl: 'Sukabumi, 05 Februari 2009', jk: JenisKelamin.L, nik: '3202400502090001', nisn: '0096790373', alamat: 'Kp. Babakan, Desa Jambenenggang, Kec. Kebonpedes, Kab. Sukabumi', rt: '1', rw: '4', kelurahan: 'Jambenenggang', kecamatan: 'Kebonpedes', kabupaten: 'Kab. Sukabumi', hp: '081315110076', wali: { nama: 'Ani Jatnikasari', nik: '3202404104850004', hp: '081315110076' } },
  // RT/RW tidak diisi di sumber (ditulis "-"), jadi dikosongkan.
  { no: 11, nama: 'M. Uwais Qorne', ttl: 'Selong, 14 Desember 2010', jk: JenisKelamin.L, nik: '5202121412100002', nisn: '0102393298', alamat: 'Teratak, Desa Teratak, Kec. Batukliang Utara, Kab. Lombok Tengah', rt: '', rw: '', kelurahan: 'Teratak', kecamatan: 'Batukliang Utara', kabupaten: 'Kab. Lombok Tengah', hp: '085941059423', wali: { nama: 'Lutfiani', nik: '5202124107790418', hp: '085941059423' , peran: 'Ibu' } },
  { no: 12, nama: 'Maulana Malik Ibrahim', ttl: 'Malang, 07 Mei 2010', jk: JenisKelamin.L, nik: '3573030705100004', nisn: '0103763965', alamat: 'Jl. Kol. Sugiono IIIB, Kel. Mergosono, Kec. Kedungkandang, Kota Malang', rt: '7', rw: '5', kelurahan: 'Mergosono', kecamatan: 'Kedungkandang', kabupaten: 'Kota Malang', hp: '081805022876', wali: { nama: 'Nur Hamidah', nik: '3573036901770007', hp: '081805022876' , peran: 'Ibu' } },
  { no: 13, nama: 'Maulana Ridwan Aqilah', ttl: 'Malang, 23 September 2010', jk: JenisKelamin.L, nik: '3573032309100001', nisn: '0103968096', alamat: 'Jl. Kol. Sugiono IIIB/52, Kel. Mergosono, Kec. Kedungkandang, Kota Malang', rt: '4', rw: '5', kelurahan: 'Mergosono', kecamatan: 'Kedungkandang', kabupaten: 'Kota Malang', hp: '085755047597', wali: { nama: 'Sri Sunari Bawatiningsih', nik: '3573036305770002', hp: '085755047597' } },
  { no: 14, nama: 'Muchammad Akbar Octavino', ttl: 'Malang, 26 Oktober 2010', jk: JenisKelamin.L, nik: '3573042610100004', nisn: '0103287113', alamat: 'Perum Karang Duren Permai Blok D-20, Kel. Karangduren, Kec. Pakisaji, Kab. Malang', rt: '1', rw: '7', kelurahan: 'Karangduren', kecamatan: 'Pakisaji', kabupaten: 'Kab. Malang', hp: '088234004790', wali: { nama: 'Ninik Sulistyowati', nik: '3573044211710006', hp: '081911186220' } },
  { no: 15, nama: 'Muhammad', ttl: 'Malang, 07 Mei 2010', jk: JenisKelamin.L, nik: '3573030705100006', nisn: '0102454863', alamat: 'Dusun Krajan, Desa Ngroto, Kec. Pujon, Kab. Malang', rt: '14', rw: '7', kelurahan: 'Ngroto', kecamatan: 'Pujon', kabupaten: 'Kab. Malang', hp: '089660760530', wali: { nama: 'Evi Rohmawati', nik: '3573035003870010', hp: '089660760530' } },
  { no: 16, nama: 'Muhammad Fathian Akbar Al Aqil', ttl: 'Malang, 08 November 2010', jk: JenisKelamin.L, nik: '3507170811100002', nisn: '3109188544', alamat: 'Dusun Bayang, Desa Pandansari Lor, Kec. Jabung, Kab. Malang', rt: '14', rw: '1', kelurahan: 'Pandansari Lor', kecamatan: 'Jabung', kabupaten: 'Kab. Malang', hp: '', wali: { nama: 'Ning Farida', nik: '3507176809870001', hp: '' } },
  { no: 17, nama: 'Muhammad Irvan Azis', ttl: 'Malang, 17 Mei 2009', jk: JenisKelamin.L, nik: '3573031705090003', nisn: '0096834239', alamat: 'Jl. Kol. Sugiono IIIC/42, Kel. Mergosono, Kec. Kedungkandang, Kota Malang', rt: '12', rw: '4', kelurahan: 'Mergosono', kecamatan: 'Kedungkandang', kabupaten: 'Kota Malang', hp: '085103571762', wali: { nama: 'Sugiati', nik: '3573035001790003', hp: '085103571762' } },
  // Sumber menulis kelurahan "Nglanjurk" di kolom terpisah tapi "Nglanjuk" di
  // kolom alamat; dipakai ejaan alamat (Desa Nglanjuk, Cepu, Blora).
  { no: 18, nama: "Mutma'inatus Zahro", ttl: 'Blora, 03 Desember 2009', jk: JenisKelamin.P, nik: '3316054312090002', nisn: '3100628774', alamat: 'Nglanjuk, Desa Nglanjuk, Kec. Cepu, Kab. Blora', rt: '1', rw: '2', kelurahan: 'Nglanjuk', kecamatan: 'Cepu', kabupaten: 'Kab. Blora', hp: '082226161659', wali: { nama: 'Estiyorini', nik: '3316054703740000', hp: '082226161659' } },
  { no: 19, nama: 'Nafisa Isna Asyari', ttl: 'Malang, 15 Juni 2010', jk: JenisKelamin.P, nik: '3573035506100001', nisn: '0106484216', alamat: 'Jl. Lembayung, Kel. Bumiayu, Kec. Kedungkandang, Kota Malang', rt: '12', rw: '2', kelurahan: 'Bumiayu', kecamatan: 'Kedungkandang', kabupaten: 'Kota Malang', hp: '0881036434852', wali: { nama: 'Siti Suromisliwanti', nik: '3573036110820000', hp: '0881036434852' } },
  { no: 20, nama: 'Naura Ahlam Mahfuzhah', ttl: 'Malang, 29 April 2011', jk: JenisKelamin.P, nik: '3507216904110001', nisn: '0113953717', alamat: 'Jl. Raya Pandanlandung, Kel. Pandanlandung, Kec. Wagir, Kab. Malang', rt: '5', rw: '1', kelurahan: 'Pandanlandung', kecamatan: 'Wagir', kabupaten: 'Kab. Malang', hp: '082264913884', wali: { nama: 'Sulistiami', nik: '3507215606790000', hp: '082264913884' } },
  { no: 21, nama: 'Nia Putri Ramadhani', ttl: 'Malang, 19 Agustus 2010', jk: JenisKelamin.P, nik: '3573035908100007', nisn: '0106480375', alamat: 'Jl. Kol. Sugiono IIIB/25, Kel. Mergosono, Kec. Kedungkandang, Kota Malang', rt: '6', rw: '5', kelurahan: 'Mergosono', kecamatan: 'Kedungkandang', kabupaten: 'Kota Malang', hp: '089654201882', wali: { nama: 'Siti Uriyah', nik: '3573035606840009', hp: '081934775048' } },
  { no: 22, nama: 'Shinta Aulia Anggoro Kasih', ttl: 'Malang, 03 Mei 2010', jk: JenisKelamin.P, nik: '3573014305100004', nisn: '0109197482', alamat: 'Jl. Jodipan Wetan I/19, Kel. Jodipan, Kec. Blimbing, Kota Malang', rt: '16', rw: '6', kelurahan: 'Jodipan', kecamatan: 'Blimbing', kabupaten: 'Kota Malang', hp: '', wali: { nama: 'Yohanita Dwi Nanda Sari', nik: '3573016103880000', hp: '' } },
  { no: 23, nama: 'Siti Munawaroh', ttl: 'Malang, 23 Juni 2010', jk: JenisKelamin.P, nik: '3573036306100001', nisn: '0106785796', alamat: 'Jl. Kyai Parseh Jaya, Kel. Bumiayu, Kec. Kedungkandang, Kota Malang', rt: '4', rw: '1', kelurahan: 'Bumiayu', kecamatan: 'Kedungkandang', kabupaten: 'Kota Malang', hp: '089601662443', wali: { nama: 'Suparmi', nik: '3573036707720005', hp: '089601662443' , peran: 'Ibu' } },
  { no: 24, nama: 'Siti Roudloh', ttl: 'Malang, 29 Oktober 2010', jk: JenisKelamin.P, nik: '3507246910100002', nisn: '0105290110', alamat: 'Bunut, Kel. Tunjungtirto, Kec. Singosari, Kota Malang', rt: '6', rw: '5', kelurahan: 'Tunjungtirto', kecamatan: 'Singosari', kabupaten: 'Kab. Malang', hp: '087814525575', wali: { nama: 'Zainal Abidin', nik: '3507240303770001', hp: '087814525575' } },
];

/** Kolom kosong di sumber tidak boleh menghapus data yang sudah ada. */
const atau = (baru: string, lama: string | null): string | null => baru.trim() || lama;

async function jalankan(): Promise<void> {
  const unit = await prisma.unit.findUniqueOrThrow({ where: { key: KODE_UNIT } });
  const academicYear = await prisma.academicYear.upsert({
    where: { code_semester: { code: KODE_TA, semester: SEMESTER_TA } },
    create: { code: KODE_TA, semester: SEMESTER_TA },
    update: {},
  });
  console.log(`Menulis ${DATA.length} riwayat kelulusan SMP kelas ${NAMA_KELAS} (TA ${KODE_TA} ${SEMESTER_TA})...`);

  for (const s of DATA) {
    const orang = await prisma.person.findUniqueOrThrow({
      where: { nik: s.nik },
      select: { id: true, phone: true, addressLine: true },
    });
    const { tempat, tanggal } = parseTtl(s.ttl, `TTL ${s.nama}`);

    await prisma.person.update({
      where: { id: orang.id },
      data: {
        fullName: s.nama,
        gender: s.jk,
        birthPlace: tempat,
        birthDate: tanggal,
        addressLine: atau(s.alamat, orang.addressLine),
        neighborhoodRt: s.rt.trim() || null,
        neighborhoodRw: s.rw.trim() || null,
        villageName: s.kelurahan,
        districtName: s.kecamatan,
        regencyName: s.kabupaten,
        phone: atau(s.hp, orang.phone),
      },
    });

    // Sumber SMP hanya menyediakan satu kolom gabungan "NAMA IBU/AYAH/WALI"
    // tanpa menyebut perannya. Kalau orang yang sama sudah tercatat sebagai
    // Ayah/Ibu lewat importir MA (yang sumbernya memang memisah peran), peran
    // itu dipertahankan — menuliskannya ulang sebagai `Wali` justru membuang
    // informasi yang lebih spesifik.
    await tulisGuardianRelation(orang.id, s.nisn, s.wali.peran ?? 'Wali', {
      nama: s.wali.nama,
      nik: s.wali.nik,
      hp: s.wali.hp,
    });

    await prisma.riwayatPendidikan.upsert({
      where: { personId_unitId_academicYearId: { personId: orang.id, unitId: unit.id, academicYearId: academicYear.id } },
      create: {
        personId: orang.id, unitId: unit.id, kelasNama: NAMA_KELAS, tingkat: TINGKAT_KELAS,
        academicYearId: academicYear.id, status: StatusRiwayatPendidikan.Lulus,
      },
      update: { kelasNama: NAMA_KELAS, tingkat: TINGKAT_KELAS, status: StatusRiwayatPendidikan.Lulus },
    });
  }

  await recordAudit({
    aksi: 'import',
    entitas: 'Santri',
    entitasId: 'batch',
    ringkasan: `Impor alumni SMP kelas ${NAMA_KELAS} TA ${KODE_TA} ${SEMESTER_TA}: ${DATA.length} siswa (riwayat + biodata + wali).`,
    aktor: AKTOR_SKRIP,
  });

  console.log(`Selesai. ${DATA.length} alumni SMP di-upsert (riwayat, biodata, wali).`);
}

jalankan()
  .catch((error) => {
    console.error('Galat tak terduga saat impor alumni SMP:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
