/**
 * Impor 11 siswa MA Kelas X tahun ajaran **2025/2026** dari tiga tabel yang
 * diserahkan operator (data diri, data wali murid, data kesehatan). Seperti
 * importir MA 2026, barisnya ditulis literal di berkas ini supaya sumbernya
 * satu dan bisa di-review lewat git.
 *
 * Pengecekan DB sebelum menulis: **tidak satu pun** dari 11 NIK/NISN ini sudah
 * ada — seluruh baris berstatus baru. Meski begitu skrip tetap idempoten:
 * pencocokan `Orang` lewat NIK (identitas terkuat) lalu email sintetis berbasis
 * NISN, `Santri` lewat personId/NISN, wali lewat NIK (atau email sintetis
 * per-anak-per-peran bila NIK kosong, lihat `lib/tulis-wali.ts`).
 *
 * Catatan data sumber yang sengaja dipertahankan apa adanya:
 *   - No. 7 (Muhammad Fajar Putra Sulhari) semula tidak punya NIS di tabel
 *     operator sehingga sempat dibuatkan NIS sintetis `2025MA007`. Operator
 *     menyusulkan NIS resminya (`131235730007250129`) pada 2026-08-29, jadi
 *     seluruh 11 baris kini memakai NIS resmi 18 digit dari sumber.
 *     Perpindahan NIS lama → baru ditangani `promosi-ma-2026.ts`.
 *   - No. 11 (Muhammad Hamdan Zaini) tidak punya baris di tabel kesehatan, dan
 *     ibunya (Noer Laila) hanya diketahui namanya — tanpa NIK/TTL/pekerjaan.
 *     Blok alamat wali di sumber juga kosong untuk baris ini.
 *   - No. 5 & 7 punya baris kesehatan kosong (BB/TB tidak diisi). Profil
 *     kesehatan hanya ditulis bila ada minimal satu nilai — tabel tidak diisi
 *     baris hampa.
 *   - Kolom "NAMA WALI" (wali pihak ketiga) kosong untuk seluruh 11 baris,
 *     jadi hanya relasi Ayah & Ibu yang ditulis.
 *
 * Jalankan: `npm run import:siswa-ma-2025`
 */
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { JenisKelamin, StatusSantri } from '@prisma/client';
import { parseTtl } from './lib/tanggal-id';
import { buatNis } from './lib/nis';
import { tulisGuardianRelation, type DataWali } from './lib/tulis-wali';

const AKTOR_SKRIP = { nama: 'Importir siswa MA 2025/2026 (skrip)' };
const KODE_UNIT = 'MA';
const TAHUN_MASUK = '2025';
const KODE_TA = '2025/2026';
const SEMESTER_TA = 'Gasal';
const NAMA_KELAS = 'Kelas 1';
const TINGKAT_KELAS = '10';

type BarisSiswa = {
  /** Nomor baris tabel operator — dipakai untuk pesan galat & urutan NIS cadangan. */
  no: number;
  nama: string;
  ttl: string;
  gender: JenisKelamin;
  nik: string;
  noKk: string;
  nisn: string;
  /** NIS resmi 18 digit dari sumber; null bila operator belum mengisinya. */
  nis: string | null;
  alamat: string;
  anakKe: number | null;
  jumlahSaudara: number | null;
  hobi: string | null;
  citaCita: string | null;
  hp: string | null;
  asalSekolah: string | null;
  ayah: DataWali | null;
  ibu: DataWali | null;
  beratKg: number | null;
  tinggiCm: number | null;
  riwayatPenyakit: string | null;
  kebutuhanKhusus: string | null;
};

const DATA: BarisSiswa[] = [
  {
    no: 1,
    nama: 'AHMAD SHAFLY AL KAUTSAR',
    ttl: 'MALANG, 12 AGUSTUS 2009',
    gender: JenisKelamin.L,
    nik: '3507131208090002',
    noKk: '3507131204230001',
    nisn: '3096502331',
    nis: '131235730007250123',
    alamat: 'JL. SUNAN MURIA 371 RT 003/RW 002 DUSUN KETAPANG, SUKORAHARJO, KEPANJEN, MALANG, JAWA TIMUR',
    anakKe: 2,
    jumlahSaudara: 1,
    hobi: 'JOGGING',
    citaCita: 'PRESIDEN',
    hp: '085107070059',
    asalSekolah: 'SMP Al-Rahbini',
    // Sumber hanya mengisi nama ayah, tanpa NIK/TTL/pekerjaan.
    ayah: { nama: 'AMINUDIN' },
    ibu: {
      nama: "QURROTA A'YUN", nik: '3507134305750012', ttl: 'MALANG, 03 MEI 1975',
      pekerjaan: 'GURU', pendapatan: null, pendidikan: 'STRATA I', hp: '085107070059',
    },
    beratKg: 43,
    tinggiCm: 160,
    riwayatPenyakit: null,
    kebutuhanKhusus: null,
  },
  {
    no: 2,
    nama: 'DINDA AULIA RAMADANI',
    ttl: 'PAMEKASAN, 16 AGUSTUS 2010',
    gender: JenisKelamin.P,
    nik: '3528055608100001',
    noKk: '3528052803220007',
    nisn: '3102629196',
    nis: '131235730007250124',
    alamat: 'DUSUN TENGAH, MAPPER, PROPPO, PAMEKASAN, JAWA TIMUR',
    anakKe: 2,
    jumlahSaudara: 2,
    hobi: 'MASAK',
    citaCita: 'MUA',
    hp: null,
    asalSekolah: null,
    ayah: { nama: 'ABDUL HOLIK' },
    ibu: {
      nama: 'SRI', nik: '3528054107850515', ttl: 'PAMEKASAN, 01 JULI 1985',
      pekerjaan: 'KARYAWAN SWASTA', pendapatan: null, pendidikan: 'SLTP/SEDERAJAT', hp: null,
    },
    beratKg: 60,
    tinggiCm: 154,
    riwayatPenyakit: null,
    kebutuhanKhusus: null,
  },
  {
    no: 3,
    nama: 'DZIHNI LAILA MAFTUHA',
    ttl: 'PASURUAN, 14 MEI 2010',
    gender: JenisKelamin.P,
    nik: '3505105405100001',
    noKk: '3505100810200004',
    nisn: '3104598474',
    nis: '131235730007250125',
    alamat: 'DUSUN GAJAH RT 004/RW 003 PAPUNGAN, KANIGORO, BLITAR, JAWA TIMUR',
    anakKe: 1,
    jumlahSaudara: 1,
    hobi: 'MENULIS',
    citaCita: 'POLWAN',
    hp: '085706712415',
    asalSekolah: null,
    ayah: {
      nama: 'EKO WAHYUDIN', nik: '3505101012790001', ttl: 'BLITAR, 10 DESEMBER 1979',
      pekerjaan: 'KARYAWAN SWASTA', pendapatan: '1.000.000 - 3.000.000', pendidikan: 'SLTP/SEDERAJAT', hp: '085604038389',
    },
    ibu: {
      nama: 'MAI MUFIDAH', nik: '3505106705840002', ttl: 'PASURUAN, 27 MEI 1984',
      pekerjaan: 'MENGURUS RUMAH TANGGA', pendapatan: null, pendidikan: 'SLTP/SEDERAJAT', hp: '085604038389',
    },
    beratKg: 41,
    tinggiCm: 150,
    riwayatPenyakit: 'MAAG',
    kebutuhanKhusus: null,
  },
  {
    no: 4,
    nama: 'MEUTYA SAILA IMANIA AZ ZAHRA',
    ttl: 'MALANG, 15 FEBRUARI 2010',
    gender: JenisKelamin.P,
    nik: '3507185502100001',
    noKk: '3507182907100009',
    nisn: '0104053532',
    nis: '131235730007250126',
    alamat: 'JL. KENONGO RT 002/RW 001 SEKARPURO, PAKIS, MALANG, JAWA TIMUR',
    anakKe: 1,
    jumlahSaudara: 4,
    hobi: 'MENGAJI',
    citaCita: "PENGHAFAL AL QUR'AN",
    hp: '085231684727',
    asalSekolah: null,
    ayah: {
      nama: 'RIYADJI', nik: '3507180310790005', ttl: 'MALANG, 03 OKTOBER 1979',
      pekerjaan: 'PEDAGANG', pendapatan: '1.000.000 - 3.000.000', pendidikan: 'SD/SEDERAJAT', hp: '085231684727',
    },
    ibu: {
      nama: 'NURUL KHOMARIYAH', nik: '3507185510820002', ttl: 'MALANG, 15 OKTOBER 1982',
      pekerjaan: 'MENGURUS RUMAH TANGGA', pendapatan: null, pendidikan: 'SLTA/SEDERAJAT', hp: '085231684727',
    },
    beratKg: 39,
    tinggiCm: 144,
    riwayatPenyakit: 'CACAR AIR',
    kebutuhanKhusus: null,
  },
  {
    no: 5,
    nama: 'MUHAMMAD ABDULLOH AZAMY',
    ttl: 'MALANG, 25 FEBRUARI 2010',
    gender: JenisKelamin.L,
    nik: '3573042502100002',
    noKk: '3573042503100016',
    nisn: '0109784803',
    nis: '131235730007250127',
    alamat: 'JL. GADANG VIIB/18 RT 012/RW 001 GADANG, SUKUN, MALANG, JAWA TIMUR',
    anakKe: 1,
    jumlahSaudara: 2,
    hobi: 'NAIK TURUN TANGGA',
    citaCita: 'MENJADI TRANSLATOR B. ARAB',
    hp: null,
    asalSekolah: null,
    ayah: {
      nama: 'EKO APRIYANTO', nik: '3573041307820001', ttl: 'BREBES, 13 JULI 1982',
      pekerjaan: 'GURU', pendapatan: '>3.000.000', pendidikan: 'STRATA I', hp: '0895342044611',
    },
    ibu: {
      nama: 'SRI REJEKI', nik: '3573045305900008', ttl: 'MALANG, 13 MEI 1990',
      pekerjaan: 'MENGURUS RUMAH TANGGA', pendapatan: null, pendidikan: 'SLTA/SEDERAJAT', hp: '0895342044611',
    },
    // Baris kesehatan ada di tabel tapi seluruh kolomnya kosong.
    beratKg: null,
    tinggiCm: null,
    riwayatPenyakit: null,
    kebutuhanKhusus: null,
  },
  {
    no: 6,
    nama: 'MUHAMMAD CHOIRUL ANAM',
    ttl: 'MALANG, 08 JULI 2009',
    gender: JenisKelamin.L,
    nik: '3573040807090006',
    noKk: '3573031606080003',
    nisn: '0096214001',
    nis: '131235730007250128',
    alamat: 'JL. KLAYATAN II/66 RT 013/RW 012 BANDUNGREJOSARI, SUKUN, MALANG, JAWA TIMUR',
    anakKe: 1,
    jumlahSaudara: 3,
    hobi: 'SEPAK BOLA',
    citaCita: 'PENGUSAHA',
    hp: null,
    asalSekolah: null,
    ayah: {
      nama: 'ACHMAD FAUZY', nik: '3573030305840001', ttl: 'MALANG, 03 MEI 1984',
      pekerjaan: 'KARYAWAN SWASTA', pendapatan: '1.000.000 - 3.000.000', pendidikan: 'SLTA/SEDERAJAT', hp: '089523884779',
    },
    ibu: {
      nama: 'SITI MARDIYAH', nik: '3573046803840001', ttl: 'MALANG, 28 MARET 1984',
      pekerjaan: 'USTADZAH/MUBALIGHOH', pendapatan: null, pendidikan: 'SLTA/SEDERAJAT', hp: '089623193939',
    },
    beratKg: 60,
    tinggiCm: 166,
    riwayatPenyakit: null,
    kebutuhanKhusus: null,
  },
  {
    no: 7,
    nama: 'MUHAMMAD FAJAR PUTRA SULHARI',
    ttl: 'BATU, 11 MEI 2010',
    gender: JenisKelamin.L,
    nik: '3579021105100002',
    noKk: '3579021104080007',
    nisn: '0109024036',
    nis: '131235730007250129', // NIS resmi menyusul dari operator (2026-08-29)
    alamat: 'DUSUN PRAMBATAN RT 003/RW 001 GUNUNGSARI, BUMIAJI, BATU, JAWA TIMUR',
    anakKe: 2,
    jumlahSaudara: 3,
    hobi: 'OLAHRAGA',
    citaCita: 'SUKSES DALAM SEGALA HAL',
    hp: '085238251195',
    asalSekolah: null,
    ayah: {
      nama: 'SULHARI', nik: '3579021103810002', ttl: 'MALANG, 11 MARET 1981',
      pekerjaan: 'BURUH HARIAN LEPAS', pendapatan: null, pendidikan: 'SLTP/SEDERAJAT', hp: null,
    },
    ibu: {
      nama: 'RIRIN MUJIATI', nik: '3579026910840001', ttl: 'MALANG, 29 OKTOBER 1984',
      pekerjaan: 'MENGURUS RUMAH TANGGA', pendapatan: null, pendidikan: 'SLTP/SEDERAJAT', hp: '085238251195',
    },
    beratKg: null,
    tinggiCm: null,
    riwayatPenyakit: null,
    kebutuhanKhusus: null,
  },
  {
    no: 8,
    nama: 'MUHAMMAD FARIS AUFA SYAHMI',
    ttl: 'GORONTALO, 01 OKTOBER 2009',
    gender: JenisKelamin.L,
    nik: '7503060110090001',
    noKk: '7503061402080139',
    nisn: '3098189860',
    nis: '131235730007250130',
    alamat: 'DESA MOUTONG DUSUN I, TILONGKABILA, BONE BOLANGO, GORONTALO',
    anakKe: 2,
    jumlahSaudara: 3,
    hobi: 'OLAHRAGA',
    citaCita: 'TENTARA',
    hp: '085298920135',
    asalSekolah: 'MTsS Wahdah Islamiyah',
    ayah: {
      nama: 'HERRY KURNIAWAN', nik: '7503062911780001', ttl: 'JAKARTA, 29 NOVEMBER 1978',
      pekerjaan: 'GURU', pendapatan: '4.000.000', pendidikan: 'STRATA I', hp: '085298920135',
    },
    ibu: {
      nama: 'SARTINI', nik: '7503066108780001', ttl: 'PURWOREJO, 21 AGUSTUS 1978',
      pekerjaan: 'GURU', pendapatan: null, pendidikan: 'STRATA II', hp: '081356199175',
    },
    beratKg: 54,
    tinggiCm: null,
    riwayatPenyakit: 'BRONKITIS',
    kebutuhanKhusus: null,
  },
  {
    no: 9,
    nama: 'MUHAMMAD IZZY FADHLU ROBBY',
    ttl: 'MALANG, 29 APRIL 2010',
    gender: JenisKelamin.L,
    nik: '3507182904100001',
    noKk: '3507181907040434',
    nisn: '0104959701',
    nis: '131235730007250131',
    alamat: 'DUSUN KLETAK RT 012/RW 004 PUCANGSONGO, PAKIS, MALANG, JAWA TIMUR',
    anakKe: 2,
    jumlahSaudara: 1,
    hobi: 'OLAHRAGA',
    citaCita: 'ATLET',
    hp: null,
    asalSekolah: null,
    ayah: {
      nama: 'AHMAD DIMYATI', nik: '3507181003640001', ttl: 'MALANG, 10 MARET 1964',
      pekerjaan: 'GURU', pendapatan: '1.000.000 - 3.000.000', pendidikan: 'STRATA I', hp: null,
    },
    ibu: {
      nama: 'LAILATUL FARCHAH', nik: '3507095711730001', ttl: 'MALANG, 17 NOVEMBER 1973',
      pekerjaan: 'MENGURUS RUMAH TANGGA', pendapatan: null, pendidikan: 'SLTP/SEDERAJAT', hp: '085101772197',
    },
    beratKg: 56,
    tinggiCm: 160,
    riwayatPenyakit: 'FLU, DEMAM, PUSING, BIDURAN',
    kebutuhanKhusus: null,
  },
  {
    no: 10,
    nama: 'TAZKIYA NUR MADINA',
    ttl: 'NGANJUK, 12 JULI 2009',
    gender: JenisKelamin.P,
    nik: '3518135207090001',
    noKk: '3518131008020393',
    nisn: '0092045093',
    nis: '131235730007250132',
    alamat: 'JL. CITARUM I NO 09 RT 002/RW 006, DESA MANGUNDIKARAN, NGANJUK, NGANJUK, JAWA TIMUR',
    anakKe: 4,
    jumlahSaudara: 4,
    hobi: 'MENGGAMBAR',
    citaCita: 'DESIGNER',
    hp: '081359167669',
    asalSekolah: "MTS Ilmu Al-Qur'an",
    ayah: {
      nama: 'MOCHAMMAD ABDUL RASYID', nik: '3518130104670003', ttl: 'NGANJUK, 01 APRIL 1967',
      pekerjaan: 'GURU/DOSEN', pendapatan: '5.000.000', pendidikan: 'STRATA I', hp: null,
    },
    ibu: {
      nama: 'ZUNI MASTURIN', nik: '3518136607780001', ttl: 'NGANJUK, 26 JULI 1978',
      pekerjaan: 'MENGURUS RUMAH TANGGA', pendapatan: null, pendidikan: 'SLTA/SEDERAJAT', hp: '081359167669',
    },
    beratKg: 41,
    tinggiCm: null,
    riwayatPenyakit: 'DEMAM',
    kebutuhanKhusus: null,
  },
  {
    no: 11,
    nama: 'MUHAMMAD HAMDAN ZAINI',
    ttl: 'MALANG, 29 SEPTEMBER 2009',
    gender: JenisKelamin.L,
    nik: '3573032909090003',
    noKk: '3573032212090019',
    nisn: '0097115212',
    nis: '131235730007250135',
    alamat: 'JL. KOLONEL SUGIONO IIIA/177 RT 02/ RW 04 MERGOSONO, KEDUNGKANDANG, KOTA MALANG, JAWA TIMUR',
    anakKe: 1,
    jumlahSaudara: 2,
    hobi: null,
    citaCita: null,
    hp: null,
    asalSekolah: "MTs MU'ALLIMAT",
    ayah: {
      nama: 'SOFYAN ZAINI', nik: '3573032005810002', ttl: 'MALANG, 20 MEI 1981',
      pekerjaan: 'WIRASWASTA', pendapatan: null, pendidikan: 'SLTA/SEDERAJAT', hp: '08998720111',
    },
    // Sumber hanya mengisi nama ibu — sisanya kosong.
    ibu: { nama: 'NOER LAILA' },
    // Tidak ada baris di tabel kesehatan untuk siswa ini.
    beratKg: null,
    tinggiCm: null,
    riwayatPenyakit: null,
    kebutuhanKhusus: null,
  },
];

/**
 * Judul-kasus sederhana agar nama tidak tersimpan ALL CAPS seperti di sheet.
 * Apostrof **tidak** dianggap pembatas kata: "Qurrota A'yun" bukan "A'Yun".
 */
const judulKasus = (teks: string): string => teks
  .toLowerCase()
  .replace(/(^|[\s.-])([a-z])/g, (_, sep: string, huruf: string) => sep + huruf.toUpperCase());

/** Ambil "003"/"002" dari "RT 003/RW 002" — sebagian baris memakai spasi setelah garis miring. */
const ambilRtRw = (alamat: string): { rt: string | null; rw: string | null } => {
  const rt = /RT\.?\s*(\d{1,3})/i.exec(alamat);
  const rw = /RW\.?\s*(\d{1,3})/i.exec(alamat);
  return {
    rt: rt ? String(Number(rt[1])) : null,
    rw: rw ? String(Number(rw[1])) : null,
  };
};

/** Buang kutip tunggal pembuka warisan Excel dan spasi berlebih dari nomor HP. */
const bersihkanHp = (hp: string | null | undefined): string | null => {
  const teks = hp?.trim().replace(/^'+/, '').replace(/\s+/g, '') ?? '';
  return teks || null;
};

async function jalankan(): Promise<void> {
  // Validasi seluruh baris lebih dulu — tidak ada tulis parsial bila ada galat.
  const siap = DATA.map((d) => {
    const { tempat, tanggal } = parseTtl(d.ttl, `TTL "${d.nama}"`);
    if (!/^\d{16}$/.test(d.nik)) throw new Error(`NIK "${d.nama}" harus 16 digit (dapat: "${d.nik}")`);
    if (!/^\d{16}$/.test(d.noKk)) throw new Error(`No. KK "${d.nama}" harus 16 digit (dapat: "${d.noKk}")`);
    if (!/^\d{10}$/.test(d.nisn)) throw new Error(`NISN "${d.nama}" harus 10 digit (dapat: "${d.nisn}")`);
    if (d.nis !== null && !/^\d{18}$/.test(d.nis)) throw new Error(`NIS "${d.nama}" harus 18 digit (dapat: "${d.nis}")`);
    for (const [peran, wali] of [['Ayah', d.ayah], ['Ibu', d.ibu]] as const) {
      if (wali?.nik && !/^\d{16}$/.test(wali.nik)) {
        throw new Error(`NIK ${peran} "${d.nama}" harus 16 digit (dapat: "${wali.nik}")`);
      }
      if (wali?.ttl) parseTtl(wali.ttl, `TTL ${peran} "${d.nama}"`);
    }
    return { ...d, tmpLahir: tempat, tglLahir: tanggal, ...ambilRtRw(d.alamat) };
  });

  const wajibUnik = (nilai: (string | null)[], label: string) => {
    const isi = nilai.filter((v): v is string => v !== null);
    if (new Set(isi).size !== isi.length) throw new Error(`Ada ${label} duplikat di tabel sumber.`);
  };
  wajibUnik(siap.map((s) => s.nisn), 'NISN');
  wajibUnik(siap.map((s) => s.nik), 'NIK');
  wajibUnik(siap.map((s) => s.nis), 'NIS');

  const unit = await prisma.unit.findUniqueOrThrow({ where: { key: KODE_UNIT } });
  const academicYear = await prisma.academicYear.findUniqueOrThrow({
    where: { code_semester: { code: KODE_TA, semester: SEMESTER_TA } },
  });
  const kelas = await prisma.kelas.upsert({
    where: { unitId_nama_academicYearId: { unitId: unit.id, nama: NAMA_KELAS, academicYearId: academicYear.id } },
    create: { unitId: unit.id, nama: NAMA_KELAS, tingkat: TINGKAT_KELAS, academicYearId: academicYear.id },
    update: {},
  });

  console.log(
    `Validasi lolos: ${siap.length} siswa → unit ${unit.key}, ${NAMA_KELAS} (tingkat ${TINGKAT_KELAS}), `
    + `TA ${academicYear.code} ${academicYear.semester}. Menulis ke database...`,
  );

  for (const s of siap) {
    const nama = judulKasus(s.nama);
    const emailSintetis = `santri.${s.nisn}@nuha.local`;
    const hp = bersihkanHp(s.hp);

    const adaSebelumnya = await prisma.person.findFirst({
      where: { OR: [{ nik: s.nik }, { email: emailSintetis }] },
      select: { id: true, addressLine: true, phone: true },
    });

    // Alamat & HP hasil pembersihan manual di DB tidak ditimpa versi ALL CAPS dari sheet.
    const isiOrang = {
      fullName: nama,
      gender: s.gender,
      birthDate: s.tglLahir,
      birthPlace: s.tmpLahir,
      nik: s.nik,
      familyCardNumber: s.noKk,
      addressLine: adaSebelumnya?.addressLine?.trim() || s.alamat,
      neighborhoodRt: s.rt,
      neighborhoodRw: s.rw,
      birthOrder: s.anakKe,
      siblingCount: s.jumlahSaudara,
      hobby: s.hobi,
      aspiration: s.citaCita,
      previousSchool: s.asalSekolah,
      phone: hp ?? bersihkanHp(adaSebelumnya?.phone),
    };

    const orang = adaSebelumnya
      ? await prisma.person.update({ where: { id: adaSebelumnya.id }, data: { ...isiOrang, email: emailSintetis } })
      : await prisma.person.create({ data: { ...isiOrang, email: emailSintetis } });

    const nis = s.nis ?? buatNis(TAHUN_MASUK, KODE_UNIT, s.no);
    const isiSantri = {
      nis, nisn: s.nisn, unitId: unit.id, kelasId: kelas.id,
      status: StatusSantri.Aktif, tahunMasuk: TAHUN_MASUK,
    };
    const santriLama = await prisma.santri.findFirst({
      where: { OR: [{ personId: orang.id }, { nisn: s.nisn }] },
      select: { id: true },
    });
    const santri = santriLama
      ? await prisma.santri.update({ where: { id: santriLama.id }, data: { personId: orang.id, ...isiSantri } })
      : await prisma.santri.create({ data: { personId: orang.id, ...isiSantri } });

    if (s.ayah) await tulisGuardianRelation(orang.id, s.nisn, 'Ayah', { ...s.ayah, nama: judulKasus(s.ayah.nama), hp: bersihkanHp(s.ayah.hp) });
    if (s.ibu) await tulisGuardianRelation(orang.id, s.nisn, 'Ibu', { ...s.ibu, nama: judulKasus(s.ibu.nama), hp: bersihkanHp(s.ibu.hp) });

    // Baris kesehatan yang seluruh kolomnya kosong tidak menghasilkan profil hampa.
    const isiKesehatan = {
      weightKg: s.beratKg,
      heightCm: s.tinggiCm,
      medicalHistory: s.riwayatPenyakit,
      specialNeeds: s.kebutuhanKhusus,
    };
    const adaDataKesehatan = Object.values(isiKesehatan).some((v) => v !== null);
    if (adaDataKesehatan) {
      await prisma.healthProfile.upsert({
        where: { studentId: santri.id },
        create: { studentId: santri.id, ...isiKesehatan },
        update: isiKesehatan,
      });
    }

    const catatan = [
      santriLama ? 'perbarui' : 'baru',
      s.nis ? null : 'NIS dibuat otomatis',
      adaDataKesehatan ? null : 'tanpa profil kesehatan',
    ].filter(Boolean).join(', ');
    console.log(`  ✓ ${nis} ${nama} (NISN ${s.nisn}) [${catatan}]`);
  }

  await recordAudit({
    aksi: 'import',
    entitas: 'Santri',
    entitasId: 'batch',
    ringkasan:
      `Impor ${siap.length} siswa MA ${NAMA_KELAS} TA ${academicYear.code} ${academicYear.semester} `
      + '(data diri, wali Ayah/Ibu, profil kesehatan) dari tabel operator.',
    aktor: AKTOR_SKRIP,
  });

  console.log(`Selesai. ${siap.length} Santri MA di-upsert beserta wali & profil kesehatan.`);
}

jalankan()
  .catch((error) => {
    console.error('Galat saat impor siswa MA 2025/2026:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
