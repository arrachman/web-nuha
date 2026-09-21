/**
 * Impor/penyempurnaan 8 siswa MA angkatan 2026/2027 (kelas 1, tingkat 10) dari
 * data yang diserahkan operator dalam bentuk tabel teks — bukan XLSX, sehingga
 * baris-barisnya ditulis literal di berkas ini (satu sumber kebenaran yang bisa
 * di-review lewat git) alih-alih lewat `import-siswa-ma.ts`.
 *
 * Enam dari delapan santri sudah ada di DB dari impor terdahulu yang tak
 * lengkap: `status = Alumni`, tanpa kelas/tahun masuk, tanpa No. KK / anak ke /
 * hobi / cita-cita / asal sekolah, dan hanya punya satu baris `GuardianRelation`
 * berlabel "Wali". Skrip ini memperbaiki semuanya dan menambah dua santri yang
 * belum ada, plus `ProfilKesehatan`.
 *
 * Idempoten: kunci pencocokan santri adalah **NISN**; wali dikunci NIK (atau
 * email sintetis per-anak-per-peran bila NIK tak tersedia, lihat
 * `lib/tulis-wali.ts`). `Orang.alamat` yang sudah terformat rapi di DB
 * dipertahankan — alamat dari tabel operator hanya dipakai bila kolomnya kosong,
 * supaya impor ini tidak menurunkan kualitas data yang sudah dibersihkan.
 *
 * Jalankan: `npm run import:siswa-ma-2026`
 */
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { JenisKelamin, StatusSantri } from '@prisma/client';
import { parseTtl } from './lib/tanggal-id';
import { buatNis } from './lib/nis';
import { tulisGuardianRelation, type DataWali } from './lib/tulis-wali';

const AKTOR_SKRIP = { nama: 'Importir siswa MA 2026/2027 (skrip)' };
const KODE_UNIT = 'MA';
const TAHUN_MASUK = '2026';
const NAMA_KELAS = 'Kelas 1';
const TINGKAT_KELAS = '10';

type BarisSiswa = {
  nama: string;
  ttl: string;
  gender: JenisKelamin;
  nik: string;
  noKk: string;
  nisn: string;
  alamat: string;
  anakKe: number | null;
  jumlahSaudara: number | null;
  hobi: string | null;
  citaCita: string | null;
  hp: string | null;
  asalSekolah: string;
  ayah: DataWali | null;
  ibu: DataWali | null;
  beratKg: number | null;
  tinggiCm: number | null;
  riwayatPenyakit: string | null;
};

/** Tabel operator, urutan kolom mengikuti tiga sheet aslinya (diri, wali, kesehatan). */
const DATA: BarisSiswa[] = [
  {
    nama: 'ACHMAD TSAAQIB AS-SYAWWALI',
    ttl: 'MALANG, 12 SEPTEMBER 2010',
    gender: JenisKelamin.L,
    nik: '3573031209100001',
    noKk: '3573032004100026',
    nisn: '0105377373',
    alamat: 'JL. KOLONEL SUGIONO GG. 3B RT 04/ RW 05 NO 07 MERGOSONO, KEDUNGKANDANG, KOTA MALANG, JAWA TIMUR',
    anakKe: 1,
    jumlahSaudara: 3,
    hobi: 'FUTSAL, IT, KETERAMPILAN',
    citaCita: null,
    hp: null,
    asalSekolah: 'SMP NURUL HUDA',
    ayah: {
      nama: 'MUHTADIN KHOIRUL', nik: '3573030403850009', ttl: 'MALANG, 4 MARET 1985',
      pekerjaan: 'WIRASWASTA', pendapatan: '1.000.000-3.000.000', pendidikan: 'SLTA/SEDERAJAT', hp: '087889973265',
    },
    ibu: {
      nama: 'RENI HARTINI', nik: '3573034407880002', ttl: 'MALANG, 06 JULI 1988',
      pekerjaan: 'IBU RUMAH TANGGA', pendapatan: null, pendidikan: 'SLTA/SEDERAJAT', hp: '087731182775',
    },
    beratKg: 52.75,
    tinggiCm: null,
    riwayatPenyakit: 'TIPES',
  },
  {
    nama: "ADDAAFI SYAR'I MUHAMMAD",
    ttl: 'MALANG, 25 JULI 2011',
    gender: JenisKelamin.L,
    nik: '3573032507110005',
    noKk: '3573031008073027',
    nisn: '0116651628',
    alamat: 'JL. KOLONEL SUGIONO GG. 3A/249 MERGOSONO, KEDUNGKANDANG, KOTA MALANG, JAWA TIMUR',
    anakKe: 3,
    jumlahSaudara: 2,
    hobi: 'MEMBACA, OLAHRAGA',
    citaCita: 'GURU',
    hp: null,
    asalSekolah: 'SMP NURUL HUDA',
    ayah: {
      nama: 'IMAM TURMUDZI', nik: '3573032607800007', ttl: 'MALANG, 26 JULI 1980',
      pekerjaan: 'WIRASWASTA', pendapatan: '1.000.000-3.000.000', pendidikan: 'SLTA/SEDERAJAT', hp: '085843718556',
    },
    ibu: {
      nama: 'NUN FARIDA', nik: '3573036302810005', ttl: 'MALANG, 23 FEBRUARI 1981',
      pekerjaan: 'PNS', pendapatan: null, pendidikan: 'STRATA I', hp: '081230211725',
    },
    beratKg: 41,
    tinggiCm: 156,
    riwayatPenyakit: null,
  },
  {
    nama: 'AISYAH AULIA MUTIARA PUTRI',
    ttl: 'MALANG, 19 NOVEMBER 2010',
    gender: JenisKelamin.P,
    nik: '3573025911100005',
    noKk: '3573020707210008',
    nisn: '0103605635',
    alamat: 'JL. KH. DAHLAN I/465 RT 04/RW 02 SUKOHARJO, KLOJEN, KOTA MALANG, JAWA TIMUR',
    anakKe: 4,
    jumlahSaudara: 3,
    hobi: 'MENGGAMBAR ABSTRAK',
    citaCita: null,
    hp: null,
    asalSekolah: 'SMP NURUL HUDA',
    // Sheet operator hanya mengisi nama ayah, tanpa NIK/TTL/pekerjaan.
    ayah: { nama: 'AKHMAD GOZALI' },
    ibu: {
      nama: 'ENY IRAWATI', nik: '3573026212710001', ttl: 'BLITAR, 22 DESEMBER 1971',
      pekerjaan: 'IBU RUMAH TANGGA', pendapatan: null, pendidikan: 'STRATA I', hp: '083848495121',
    },
    beratKg: 47.45,
    tinggiCm: 163,
    riwayatPenyakit: null,
  },
  {
    nama: 'ERRENA TEMBANG SOSIALISTA TAZHEVA',
    ttl: 'MEDAN, 05 FEBRUARI 2011',
    gender: JenisKelamin.P,
    nik: '1271184502110001',
    noKk: '3674041404140016',
    nisn: '0112234304',
    alamat: 'JL. PARK LINE 20 BLOK B5 NO 38 RT 01/RW 04, PASIRKEMBANG, MAJA, LEBAK, BANTEN',
    anakKe: 1,
    jumlahSaudara: 1,
    hobi: 'MEMBACA NOVEL',
    citaCita: 'DOSEN',
    hp: null,
    asalSekolah: 'SMP NURUL HUDA',
    ayah: {
      nama: 'MOCHAMMED MUCHLIES', nik: '1271182409750003', ttl: 'TANJUNG PINANG, 24 SEPTEMBER 1975',
      pekerjaan: 'BURUH HARIAN LEPAS', pendapatan: '< 1.000.000', pendidikan: 'STRATA I', hp: '081362236119',
    },
    ibu: {
      nama: 'MABRUROH', nik: '1271185902850004', ttl: 'GRESIK, 19 FEBRUARI 1985',
      pekerjaan: 'IBU RUMAH TANGGA', pendapatan: null, pendidikan: 'STRATA I', hp: '089527023362',
    },
    beratKg: 47.45,
    tinggiCm: 158,
    riwayatPenyakit: 'CACAR AIR',
  },
  {
    nama: 'M. UWAIS QORNE',
    ttl: 'SELONG, 14 DESEMBER 2010',
    gender: JenisKelamin.L,
    nik: '5202121412100002',
    noKk: '5202121304110024',
    nisn: '0102393298',
    alamat: 'TERATAK, BATUKLIANG UTARA, LOMBOK TENGAH, NUSA TENGGARA BARAT',
    anakKe: 3,
    jumlahSaudara: 4,
    hobi: 'MEMBACA',
    citaCita: 'GURU',
    hp: '085941059423',
    asalSekolah: 'SMP NURUL HUDA',
    ayah: {
      nama: 'PAOZAN', nik: '5202120107720644', ttl: 'TERATAK, 01 JULI 1972',
      pekerjaan: 'WIRASWASTA', pendapatan: null, pendidikan: 'STRATA II', hp: '081337157268',
    },
    ibu: {
      nama: 'LUTFIANI', nik: '5202124107790418', ttl: 'MAMBEN LAUK AIKMEL, 01 DESEMBER 1979',
      pekerjaan: 'PNS', pendapatan: null, pendidikan: 'STRATA I', hp: '085941059423',
    },
    beratKg: 48,
    tinggiCm: 154,
    riwayatPenyakit: null,
  },
  {
    nama: 'MAULANA MALIK IBRAHIM',
    ttl: 'MALANG, 07 MEI 2010',
    gender: JenisKelamin.L,
    nik: '3573030705100004',
    noKk: '3573032312100009',
    nisn: '0103763965',
    alamat: 'JL. KOLONEL SUGIONO IIIB RT 07/RW 05 MERGOSONO, KEDUNGKANDANG, KOTA MALANG, JAWA TIMUR',
    anakKe: 1,
    jumlahSaudara: null, // sumber menulis "-"
    hobi: 'MEMBUAT GAME',
    citaCita: 'GAMERS',
    hp: '081805022876',
    asalSekolah: 'SMP NURUL HUDA',
    ayah: {
      nama: 'SUGIHARTO', nik: '3573031306730004', ttl: 'MALANG, 13 JUNI 1973',
      pekerjaan: 'WIRASWASTA', pendapatan: '1.000.000-3.000.000', pendidikan: 'DIPLOMA III', hp: '087859161494',
    },
    ibu: {
      nama: 'NUR HAMIDAH', nik: '3573036901770007', ttl: 'MALANG, 29 JANUARI 1977',
      pekerjaan: 'WIRASWASTA', pendapatan: null, pendidikan: 'SLTA/SEDERAJAT', hp: '087859161494',
    },
    beratKg: 46.35,
    tinggiCm: 163,
    riwayatPenyakit: null,
  },
  {
    nama: 'NABILAH BILQIS NUR YASIN',
    ttl: 'PASURUAN, 02 JULI 2011',
    gender: JenisKelamin.P,
    nik: '3514094207110003',
    noKk: '3514090101040994',
    nisn: '0111687152',
    alamat: 'KARANGSONO RT 01/RW 05, SUKOREJO, PASURUAN, JAWA TIMUR',
    anakKe: 3,
    jumlahSaudara: 4,
    hobi: 'MELUKIS',
    citaCita: 'DESAIN',
    hp: '085649926905',
    asalSekolah: 'SMP DARUL QURAN MOJOKERTO',
    ayah: {
      nama: 'ACH. YASIEN AER', nik: '3514092908730003', ttl: 'PASURUAN, 29 AGUSTUS 1973',
      pekerjaan: null, pendapatan: '3.000.001 - 5.000.000', pendidikan: 'STRATA I', hp: '085100645245',
    },
    ibu: {
      nama: 'FADILATIN', nik: '3514094102790001', ttl: 'PASURUAN, 01 FEBRUARI 1979',
      pekerjaan: 'GURU', pendapatan: null, pendidikan: 'STRATA I', hp: '085649926905',
    },
    beratKg: 45,
    tinggiCm: 150,
    riwayatPenyakit: null,
  },
  {
    nama: 'SITI MUNAWAROH',
    ttl: 'MALANG, 23 JUNI 2010',
    gender: JenisKelamin.P,
    nik: '3573036306100001',
    noKk: '3573031312180012',
    nisn: '0106785796',
    alamat: 'JL. KYAI PARSEH JAYA RT 04/RW 01 BUMIAYU, KEDUNGKANDANG, KOTA MALANG, JAWA TIMUR',
    anakKe: 1,
    jumlahSaudara: null, // sumber menulis "-"
    hobi: null,
    citaCita: 'DOKTER',
    hp: '089601662443',
    asalSekolah: 'SMP NURUL HUDA',
    ayah: { nama: 'DJOKO POERWOTO' },
    ibu: {
      nama: 'SUPARMI', nik: '3573036707720005', ttl: 'MALANG, 27 JULI 1972',
      pekerjaan: 'KARYAWAN SWASTA', pendapatan: null, pendidikan: 'SLTA/SEDERAJAT', hp: '089601662443',
    },
    beratKg: 59,
    tinggiCm: 158,
    riwayatPenyakit: 'ASAM LAMBUNG, AMANDEL',
  },
];

/**
 * Judul-kasus sederhana, dipakai agar nama tidak tersimpan ALL CAPS seperti di
 * sheet. Apostrof **tidak** dianggap pembatas kata: "Syar'i" bukan "Syar'I".
 */
const judulKasus = (teks: string): string => teks
  .toLowerCase()
  .replace(/(^|[\s.-])([a-z])/g, (_, sep: string, huruf: string) => sep + huruf.toUpperCase());

/** Ambil "04"/"05" dari "RT 04/ RW 05" — sebagian baris memakai spasi setelah garis miring. */
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
    return { ...d, tmpLahir: tempat, tglLahir: tanggal, ...ambilRtRw(d.alamat) };
  });

  const nisnUnik = new Set(siap.map((s) => s.nisn));
  if (nisnUnik.size !== siap.length) throw new Error('Ada NISN duplikat di tabel sumber.');

  const unit = await prisma.unit.findUniqueOrThrow({ where: { key: KODE_UNIT } });
  const academicYear = await prisma.academicYear.findFirstOrThrow({ where: { isActive: true } });
  const kelas = await prisma.kelas.upsert({
    where: { unitId_nama_academicYearId: { unitId: unit.id, nama: NAMA_KELAS, academicYearId: academicYear.id } },
    create: { unitId: unit.id, nama: NAMA_KELAS, tingkat: TINGKAT_KELAS, academicYearId: academicYear.id },
    update: {},
  });

  console.log(
    `Validasi lolos: ${siap.length} siswa → unit ${unit.key}, ${NAMA_KELAS} (tingkat ${TINGKAT_KELAS}), `
    + `TA ${academicYear.code} ${academicYear.semester}. Menulis ke database...`,
  );

  let urut = 0;
  for (const s of siap) {
    urut += 1;
    const nama = judulKasus(s.nama);
    const emailSintetis = `santri.${s.nisn}@nuha.local`;
    const hp = bersihkanHp(s.hp);

    // Pencocokan NIK lebih dulu, baru email sintetis berbasis NISN: impor
    // terdahulu pernah memuat NISN yang beda satu digit untuk orang yang sama
    // (Errena, ...300 vs ...304). NIK 16 digit adalah identitas yang lebih kuat,
    // jadi baris lama itu dikoreksi — bukan diduplikasi jadi santri kedua.
    const adaSebelumnya = await prisma.person.findFirst({
      where: { OR: [{ nik: s.nik }, { email: emailSintetis }] },
      select: { id: true, addressLine: true, phone: true },
    });

    // Alamat & HP hasil pembersihan manual di DB tidak ditimpa oleh versi ALL CAPS dari sheet.
    const alamat = adaSebelumnya?.addressLine?.trim() || s.alamat;
    const isiOrang = {
      fullName: nama,
      gender: s.gender,
      birthDate: s.tglLahir,
      birthPlace: s.tmpLahir,
      nik: s.nik,
      familyCardNumber: s.noKk,
      addressLine: alamat,
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
      ? await prisma.person.update({
        where: { id: adaSebelumnya.id },
        data: { ...isiOrang, email: emailSintetis },
      })
      : await prisma.person.create({ data: { ...isiOrang, email: emailSintetis } });

    const nis = buatNis(TAHUN_MASUK, KODE_UNIT, urut);
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

    const isiKesehatan = {
      weightKg: s.beratKg,
      heightCm: s.tinggiCm,
      medicalHistory: s.riwayatPenyakit,
    };
    await prisma.healthProfile.upsert({
      where: { studentId: santri.id },
      create: { studentId: santri.id, ...isiKesehatan },
      update: isiKesehatan,
    });

    console.log(`  ✓ ${nis} ${nama} (NISN ${s.nisn})${adaSebelumnya ? ' [perbarui]' : ' [baru]'}`);
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
    console.error('Galat saat impor siswa MA 2026/2027:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
