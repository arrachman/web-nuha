/**
 * Gelombang 2 impor siswa MA angkatan 2026/2027 — 24 baris tabel operator
 * (format Dinkes: identitas siswa + satu kolom "NAMA IBU/AYAH/WALI").
 *
 * Temuan saat pengecekan DB: **ke-24 NIK sudah ada** sebagai `Orang`.
 *   - 7 di antaranya sudah berstatus siswa MA Kelas 1 TA 2026/2027 lewat
 *     `import-siswa-ma-2026.ts` (NIS 2026MA001..008) dan sudah punya relasi
 *     Ayah + Ibu yang lebih lengkap (NIK, TTL, pekerjaan, pendidikan).
 *     Baris-baris itu **dilewati** di sini supaya data walinya yang lebih kaya
 *     tidak tergerus jadi satu baris "Wali" tanpa atribut.
 *   - 17 sisanya masih `unit = SMP`, `status = Alumni`, tanpa kelas/tahun masuk
 *     dan **tanpa satu pun `GuardianRelation`**. Merekalah alumni SMP yang naik ke MA;
 *     skrip ini memindahkan mereka ke unit MA, Kelas 1 (tingkat 10), status
 *     Mukim, tahun masuk 2026, memberi NIS deterministik, melengkapi NISN/HP/
 *     asal sekolah, dan menuliskan wali dari kolom tunggal tabel operator.
 *
 * Kolom wali sumber tidak membedakan ayah/ibu (mis. no. 24 "Zainal Abidin"
 * jelas laki-laki, sisanya nama perempuan), jadi relasinya ditulis dengan peran
 * `Wali` — sesuai jalur yang memang disediakan `tulis-wali.ts` untuk form SMP.
 * Karena anak-anak ini belum punya Ayah/Ibu, wali itu otomatis jadi kontak
 * utama untuk notifikasi.
 *
 * Idempoten: kunci pencocokan santri adalah **NIK** (identitas terkuat; NISN
 * pada impor lama pernah dipakai sebagai NIS sementara), wali dikunci NIK.
 * Alamat yang sudah rapi di DB dipertahankan — sumber hanya mengisi yang kosong.
 *
 * ⚠️ **JANGAN DIJALANKAN LAGI.** Asumsi pokoknya keliru: skrip ini menyimpulkan
 * bahwa 17 alumni SMP otomatis naik ke MA. Operator menegaskan pada 2026-08-29
 * bahwa lulus SMP **tidak** berarti masuk MA — alumni boleh berdiri tanpa kelas,
 * dan MA Kelas 1 TA 2026/2027 hanya berisi 8 nama gelombang 1. Penempatan yang
 * telanjur dibuat sudah dibatalkan oleh `perbaiki-ma-kelas1-2026.ts`; menjalankan
 * skrip ini lagi akan mengulang kesalahan yang sama. Berkas dipertahankan sebagai
 * catatan sumber (biodata & wali dari tabel Dinkes) — bukan untuk dieksekusi.
 *
 * Jalankan: — (dinonaktifkan; lihat `npm run fix:ma-kelas1-2026`)
 */
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { JenisKelamin, StatusSantri } from '@prisma/client';
import { parseTtl } from './lib/tanggal-id';
import { buatNis } from './lib/nis';
import { tulisGuardianRelation } from './lib/tulis-wali';

const AKTOR_SKRIP = { nama: 'Importir siswa MA 2026/2027 gel. 2 (skrip)' };
const KODE_UNIT = 'MA';
const TAHUN_MASUK = '2026';
const NAMA_KELAS = 'Kelas 1';
const TINGKAT_KELAS = '10';
const ASAL_SEKOLAH = 'SMP NURUL HUDA';

/** Nomor urut NIS melanjutkan `2026MA001..008` dari gelombang 1. */
const MULAI_URUT = 9;

type BarisSiswa = {
  /** Nomor baris di tabel operator — dipakai hanya untuk pesan galat. */
  no: number;
  nama: string;
  ttl: string;
  jk: JenisKelamin;
  nik: string;
  nisn: string;
  alamat: string;
  rt: string | null;
  rw: string | null;
  hp: string | null;
  waliNama: string;
  waliNik: string;
  waliHp: string | null;
};

/**
 * Ke-24 baris tabel operator ditulis lengkap (bukan hanya 17 yang diproses)
 * supaya berkas ini tetap merepresentasikan sumbernya apa adanya dan bisa
 * di-diff bila operator mengirim revisi. Penyaringan terjadi saat runtime:
 * siapa pun yang sudah jadi santri MA dilewati.
 *
 * Catatan pembersihan dari sumber:
 *   - Kolom "JENIS KELAMIN" no. 1 (P) dan no. 2/3 (L) bertentangan dengan nama
 *     dan dengan data DB yang sudah diverifikasi; dipakai jenis kelamin yang
 *     konsisten dengan baris DB/gelombang 1.
 *   - Typo lokasi sumber dibiarkan pada alamat bila DB sudah punya versi rapi.
 */
const DATA: BarisSiswa[] = [
  {
    no: 1, nama: 'Achmad Tsaaqib As-Syawwali', ttl: 'Malang, 12 September 2010', jk: JenisKelamin.L,
    nik: '3573031209100001', nisn: '0105377373',
    alamat: 'Jl. Kol. Sugiono III B/7, RT. 004, RW. 005, Kel. Mergosono, Kec. Kedungkandang, Kota Malang',
    rt: '4', rw: '5', hp: '087889973265',
    waliNama: 'Reni Hartini', waliNik: '3573034407880002', waliHp: '087889973265',
  },
  {
    no: 2, nama: "Addafi Syar'i Muhammad", ttl: 'Malang, 25 Juli 2011', jk: JenisKelamin.L,
    nik: '3573032507110005', nisn: '0116651628',
    alamat: 'Jl. Kol. Sugiono III A/249, RT. 005, RW. 004, Kel. Mergosono, Kec. Kedungkandang, Kota Malang',
    rt: '5', rw: '4', hp: '081230211725',
    waliNama: 'Nun Farida', waliNik: '3573036302810005', waliHp: '081230211725',
  },
  {
    no: 3, nama: 'Ade Gita Fadilah', ttl: 'Malang, 25 Januari 2011', jk: JenisKelamin.P,
    nik: '3573036501110003', nisn: '0116130624',
    alamat: 'Jl. Kol. Sugiono VA/175, RT. 004, RW. 003, Kel. Mergosono, Kec. Kedungkandang, Kota Malang',
    rt: '4', rw: '3', hp: '089507428974',
    waliNama: 'Nurhayati', waliNik: '3573035111790010', waliHp: '089507428974',
  },
  {
    no: 4, nama: 'Aisyah Aulia Mutiara Putri', ttl: 'Malang, 19 November 2010', jk: JenisKelamin.P,
    nik: '3573025911100005', nisn: '0103605635',
    alamat: 'Jl. KH. Ahmad Dahlan I/465, RT. 004, RW. 002, Kel. Sukoharjo, Kec. Klojen, Kota Malang',
    rt: '4', rw: '2', hp: '083848495121',
    waliNama: 'Eny Irawati', waliNik: '3573026212710001', waliHp: '083848495121',
  },
  {
    no: 5, nama: 'Alisyah Hikmah Maulana', ttl: 'Malang, 22 Februari 2011', jk: JenisKelamin.P,
    nik: '3573036202110008', nisn: '0116201580',
    alamat: 'Jl. Muharto VII/33, RT. 008, RW. 007, Kel. Kota Lama, Kec. Kedungkandang, Kota Malang',
    rt: '8', rw: '7', hp: '085706399663',
    waliNama: 'Siti Chopsyah', waliNik: '3573035209780002', waliHp: '085706399663',
  },
  {
    no: 6, nama: 'Dewi Aisar', ttl: 'Malang, 05 November 2010', jk: JenisKelamin.P,
    nik: '3573034511100006', nisn: '0106738352',
    alamat: 'Jl. Kol. Sugiono III B/37, RT. 007, RW. 005, Kel. Mergosono, Kec. Kedungkandang, Kota Malang',
    rt: '7', rw: '5', hp: '087777754022',
    waliNama: 'Lusiah', waliNik: '3573034809780005', waliHp: '081232606533',
  },
  {
    no: 7, nama: 'Dzaki Rohmatullah', ttl: 'Malang, 25 September 2010', jk: JenisKelamin.L,
    nik: '3573032509100003', nisn: '0105685773',
    alamat: 'Jl. Kol. Sugiono 3B, RT. 009, RW. 005, Kel. Mergosono, Kec. Kedungkandang, Kota Malang',
    rt: '9', rw: '5', hp: '081233009017',
    waliNama: 'Anna Indriani', waliNik: '3573035703770004', waliHp: '081233009017',
  },
  {
    no: 8, nama: 'Errena Tembang Sosialista Tazheva', ttl: 'Medan, 05 Februari 2011', jk: JenisKelamin.P,
    nik: '1271184502110001', nisn: '0112234300',
    alamat: 'Jl. Park Line 20 Blok B5 No. 38, RT. 001, RW. 004, Desa Pasirkembang, Kec. Maja, Kab. Lebak, Banten',
    rt: '1', rw: '4', hp: '089527023362',
    waliNama: 'Mabruroh', waliNik: '1271185902850004', waliHp: '089527023362',
  },
  {
    no: 9, nama: 'Gus Ramadhani', ttl: 'Malang, 14 Agustus 2010', jk: JenisKelamin.L,
    nik: '3573011408100006', nisn: '0102492388',
    alamat: 'Jl. Jodipan Wetan Gg 1, RT. 014, RW. 007, Kel. Jodipan, Kec. Blimbing, Kota Malang',
    rt: '14', rw: '7', hp: '0895344308117',
    waliNama: 'Agustin Ariyani', waliNik: '3573015608930001', waliHp: '0895344308117',
  },
  {
    no: 10, nama: 'Khairan Muhamad Alghifari', ttl: 'Sukabumi, 05 Februari 2009', jk: JenisKelamin.L,
    nik: '3202400502090001', nisn: '0096790373',
    alamat: 'Kp. Babakan, RT. 001, RW. 004, Desa Jambenenggang, Kec. Kebonpedes, Kab. Sukabumi',
    rt: '1', rw: '4', hp: '081315110076',
    waliNama: 'Ani Jatnikasari', waliNik: '3202404104850004', waliHp: '081315110076',
  },
  {
    no: 11, nama: 'M. Uwais Qorne', ttl: 'Selong, 14 Desember 2010', jk: JenisKelamin.L,
    nik: '5202121412100002', nisn: '0102393298',
    alamat: 'Teratak, Desa Teratak, Kec. Batukliang Utara, Kab. Lombok Tengah',
    rt: null, rw: null, hp: '085941059423',
    waliNama: 'Lutfiani', waliNik: '5202124107790418', waliHp: '085941059423',
  },
  {
    no: 12, nama: 'Maulana Malik Ibrahim', ttl: 'Malang, 07 Mei 2010', jk: JenisKelamin.L,
    nik: '3573030705100004', nisn: '0103763965',
    alamat: 'Jl. Kol. Sugiono IIIB, RT. 007, RW. 005, Kel. Mergosono, Kec. Kedungkandang, Kota Malang',
    rt: '7', rw: '5', hp: '081805022876',
    waliNama: 'Nur Hamidah', waliNik: '3573036901770007', waliHp: '081805022876',
  },
  {
    no: 13, nama: 'Maulana Ridwan Aqilah', ttl: 'Malang, 23 September 2010', jk: JenisKelamin.L,
    nik: '3573032309100001', nisn: '0103968096',
    alamat: 'Jl. Kol. Sugiono IIIB/52, RT. 004, RW. 005, Kel. Mergosono, Kec. Kedungkandang, Kota Malang',
    rt: '4', rw: '5', hp: '085755047597',
    waliNama: 'Sri Sunari Bawatiningsih', waliNik: '3573036305770002', waliHp: '085755047597',
  },
  {
    no: 14, nama: 'Muchammad Akbar Octavino', ttl: 'Malang, 26 Oktober 2010', jk: JenisKelamin.L,
    nik: '3573042610100004', nisn: '0103287113',
    alamat: 'Perum Karang Duren Permai Blok D-20, RT. 001, RW. 007, Kel. Karangduren, Kec. Pakisaji, Kab. Malang',
    rt: '1', rw: '7', hp: '088234004790',
    waliNama: 'Ninik Sulistyowati', waliNik: '3573044211710006', waliHp: '081911186220',
  },
  {
    no: 15, nama: 'Muhammad', ttl: 'Malang, 07 Mei 2010', jk: JenisKelamin.L,
    nik: '3573030705100006', nisn: '0102454863',
    alamat: 'Dusun Krajan, RT. 014, RW. 007, Desa Ngroto, Kec. Pujon, Kab. Malang',
    rt: '14', rw: '7', hp: '089660760530',
    waliNama: 'Evi Rohmawati', waliNik: '3573035003870010', waliHp: '089660760530',
  },
  {
    no: 16, nama: 'Muhammad Fathian Akbar Al Aqil', ttl: 'Malang, 08 November 2010', jk: JenisKelamin.L,
    nik: '3507170811100002', nisn: '3109188544',
    alamat: 'Dusun Bayang, RT. 014, RW. 001, Desa Pandansari Lor, Kec. Jabung, Kab. Malang',
    rt: '14', rw: '1', hp: null,
    waliNama: 'Ning Farida', waliNik: '3507176809870001', waliHp: null,
  },
  {
    no: 17, nama: 'Muhammad Irvan Azis', ttl: 'Malang, 17 Mei 2009', jk: JenisKelamin.L,
    nik: '3573031705090003', nisn: '0096834239',
    alamat: 'Jl. Kol. Sugiono IIIC/42, RT. 012, RW. 004, Kel. Mergosono, Kec. Kedungkandang, Kota Malang',
    rt: '12', rw: '4', hp: '085103571762',
    waliNama: 'Sugiati', waliNik: '3573035001790003', waliHp: '085103571762',
  },
  {
    no: 18, nama: "Mutma'inatus Zahro", ttl: 'Blora, 03 Desember 2009', jk: JenisKelamin.P,
    nik: '3316054312090002', nisn: '3100628774',
    alamat: 'Nglanjuk, RT. 001, RW. 002, Desa Nglanjuk, Kec. Cepu, Kab. Blora',
    rt: '1', rw: '2', hp: '082226161659',
    waliNama: 'Estiyorini', waliNik: '3316054703740000', waliHp: '082226161659',
  },
  {
    no: 19, nama: 'Nafisa Isna Asyari', ttl: 'Malang, 15 Juni 2010', jk: JenisKelamin.P,
    nik: '3573035506100001', nisn: '0106484216',
    alamat: 'Jl. Lembayung, RT. 012, RW. 002, Kel. Bumiayu, Kec. Kedungkandang, Kota Malang',
    rt: '12', rw: '2', hp: '0881036434852',
    waliNama: 'Siti Suromisliwanti', waliNik: '3573036110820000', waliHp: '0881036434852',
  },
  {
    no: 20, nama: 'Naura Ahlam Mahfuzhah', ttl: 'Malang, 29 April 2011', jk: JenisKelamin.P,
    nik: '3507216904110001', nisn: '0113953717',
    alamat: 'Jl. Raya Pandanlandung, RT. 005, RW. 001, Kel. Pandanlandung, Kec. Wagir, Kab. Malang',
    rt: '5', rw: '1', hp: '082264913884',
    waliNama: 'Sulistiami', waliNik: '3507215606790000', waliHp: '082264913884',
  },
  {
    no: 21, nama: 'Nia Putri Ramadhani', ttl: 'Malang, 19 Agustus 2010', jk: JenisKelamin.P,
    nik: '3573035908100007', nisn: '0106480375',
    alamat: 'Jl. Kol. Sugiono IIIB/25, RT. 006, RW. 005, Kel. Mergosono, Kec. Kedungkandang, Kota Malang',
    rt: '6', rw: '5', hp: '089654201882',
    waliNama: 'Siti Uriyah', waliNik: '3573035606840009', waliHp: '081934775048',
  },
  {
    no: 22, nama: 'Shinta Aulia Anggoro Kasih', ttl: 'Malang, 03 Mei 2010', jk: JenisKelamin.P,
    nik: '3573014305100004', nisn: '0109197482',
    alamat: 'Jl. Jodipan Wetan I/19, RT. 016, RW. 006, Kel. Jodipan, Kec. Blimbing, Kota Malang',
    rt: '16', rw: '6', hp: null,
    waliNama: 'Yohanita Dwi Nanda Sari', waliNik: '3573016103880000', waliHp: null,
  },
  {
    no: 23, nama: 'Siti Munawaroh', ttl: 'Malang, 23 Juni 2010', jk: JenisKelamin.P,
    nik: '3573036306100001', nisn: '0106785796',
    alamat: 'Jl. Kyai Parseh Jaya, RT. 004, RW. 001, Kel. Bumiayu, Kec. Kedungkandang, Kota Malang',
    rt: '4', rw: '1', hp: '089601662443',
    waliNama: 'Suparmi', waliNik: '3573036707720005', waliHp: '089601662443',
  },
  {
    no: 24, nama: 'Siti Roudloh', ttl: 'Malang, 29 Oktober 2010', jk: JenisKelamin.P,
    nik: '3507246910100002', nisn: '0105290110',
    alamat: 'Bunut, RT. 006, RW. 005, Kel. Tunjungtirto, Kec. Singosari, Kab. Malang',
    rt: '6', rw: '5', hp: '087814525575',
    waliNama: 'Zainal Abidin', waliNik: '3507240303770001', waliHp: '087814525575',
  },
];

/** Buang kutip tunggal pembuka warisan Excel dan spasi dari nomor HP. */
const bersihkanHp = (hp: string | null): string | null => {
  const teks = hp?.trim().replace(/^'+/, '').replace(/\s+/g, '') ?? '';
  return teks || null;
};

async function jalankan(): Promise<void> {
  // Validasi seluruh baris lebih dulu — tidak ada tulis parsial bila ada galat.
  const siap = DATA.map((d) => {
    const { tempat, tanggal } = parseTtl(d.ttl, `TTL "${d.nama}" (baris ${d.no})`);
    if (!/^\d{16}$/.test(d.nik)) throw new Error(`NIK "${d.nama}" harus 16 digit (dapat: "${d.nik}")`);
    if (!/^\d{16}$/.test(d.waliNik)) throw new Error(`NIK wali "${d.nama}" harus 16 digit (dapat: "${d.waliNik}")`);
    if (!/^\d{10}$/.test(d.nisn)) throw new Error(`NISN "${d.nama}" harus 10 digit (dapat: "${d.nisn}")`);
    return { ...d, tmpLahir: tempat, tglLahir: tanggal };
  });

  if (new Set(siap.map((s) => s.nik)).size !== siap.length) throw new Error('Ada NIK duplikat di tabel sumber.');

  const unit = await prisma.unit.findUniqueOrThrow({ where: { key: KODE_UNIT } });
  const academicYear = await prisma.academicYear.findFirstOrThrow({ where: { isActive: true } });
  const kelas = await prisma.kelas.upsert({
    where: { unitId_nama_academicYearId: { unitId: unit.id, nama: NAMA_KELAS, academicYearId: academicYear.id } },
    create: { unitId: unit.id, nama: NAMA_KELAS, tingkat: TINGKAT_KELAS, academicYearId: academicYear.id },
    update: {},
  });

  console.log(
    `Validasi lolos: ${siap.length} baris sumber → unit ${unit.key}, ${NAMA_KELAS} (tingkat ${TINGKAT_KELAS}), `
    + `TA ${academicYear.code} ${academicYear.semester}. Menulis ke database...`,
  );

  let urut = MULAI_URUT - 1;
  let dilewati = 0;
  let diproses = 0;

  for (const s of siap) {
    const orangLama = await prisma.person.findUnique({
      where: { nik: s.nik },
      select: { id: true, fullName: true, addressLine: true, neighborhoodRt: true, neighborhoodRw: true, phone: true, santri: { select: { id: true, nis: true, unitId: true } } },
    });

    // Sudah diproses gelombang 1 (data wali Ayah/Ibu-nya lebih lengkap): lewati.
    if (orangLama?.santri && orangLama.santri.unitId === unit.id) {
      dilewati += 1;
      console.log(`  – ${orangLama.santri.nis} ${orangLama.fullName} — sudah siswa MA, dilewati`);
      continue;
    }

    urut += 1;
    diproses += 1;
    const hp = bersihkanHp(s.hp);

    const isiOrang = {
      fullName: s.nama,
      gender: s.jk,
      birthDate: s.tglLahir,
      birthPlace: s.tmpLahir,
      nik: s.nik,
      // Alamat/RT/RW hasil pembersihan manual di DB tidak ditimpa versi sumber.
      addressLine: orangLama?.addressLine?.trim() || s.alamat,
      neighborhoodRt: orangLama?.neighborhoodRt ?? s.rt,
      neighborhoodRw: orangLama?.neighborhoodRw ?? s.rw,
      asalSekolah: ASAL_SEKOLAH,
      phone: hp ?? bersihkanHp(orangLama?.phone ?? null),
    };

    const orang = orangLama
      ? await prisma.person.update({ where: { id: orangLama.id }, data: isiOrang })
      : await prisma.person.create({ data: { ...isiOrang, email: `santri.${s.nisn}@nuha.local` } });

    const isiSantri = {
      nis: buatNis(TAHUN_MASUK, KODE_UNIT, urut),
      nisn: s.nisn,
      unitId: unit.id,
      kelasId: kelas.id,
      status: StatusSantri.Aktif,
      tahunMasuk: TAHUN_MASUK,
    };
    const santri = orangLama?.santri
      ? await prisma.santri.update({ where: { id: orangLama.santri.id }, data: isiSantri })
      : await prisma.santri.create({ data: { personId: orang.id, ...isiSantri } });

    // Sumber hanya punya satu kolom wali tanpa penanda ayah/ibu → peran "Wali".
    await tulisGuardianRelation(orang.id, s.nisn, 'Wali', {
      nama: s.waliNama,
      nik: s.waliNik,
      hp: bersihkanHp(s.waliHp),
    });

    console.log(
      `  ✓ ${santri.nis} ${s.nama} (NISN ${s.nisn}) — wali ${s.waliNama}`
      + `${orangLama ? ' [alumni SMP → MA]' : ' [baru]'}`,
    );
  }

  await recordAudit({
    aksi: 'import',
    entitas: 'Santri',
    entitasId: 'batch',
    ringkasan:
      `Impor gelombang 2 siswa MA ${NAMA_KELAS} TA ${academicYear.code} ${academicYear.semester}: `
      + `${diproses} alumni SMP dipromosikan ke MA beserta wali, ${dilewati} baris dilewati (sudah siswa MA).`,
    aktor: AKTOR_SKRIP,
  });

  console.log(`Selesai. ${diproses} santri diproses, ${dilewati} dilewati.`);
}

jalankan()
  .catch((error) => {
    console.error('Galat saat impor siswa MA 2026/2027 gelombang 2:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
