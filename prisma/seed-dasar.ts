/**
 * Seed minimum untuk deployment nyata: hanya kerangka yang tanpanya aplikasi
 * tidak bisa dipakai — peran, menu + grant menu per peran, unit, tahun ajaran,
 * template WhatsApp, dan akun super admin.
 *
 * Berbeda dengan `prisma/seed.ts` (importir data contoh dari prototype), berkas
 * ini TIDAK memuat santri, pegawai, nilai, presensi, atau tagihan fiktif.
 * Inilah yang dijalankan `nuha-migrate` di docker-compose.
 */
import { PrismaClient, JenisKelamin } from '@prisma/client';
import bcrypt from 'bcryptjs';
import data from './proto-data.json';
import { daftarAcademicYear } from './tahun-ajaran';

const prisma = new PrismaClient();
type PrototypeData = Record<string, Array<Record<string, unknown>>>;
const source = data as PrototypeData;

const ALAMAT_PONDOK = 'Jl. Kol. Sugiono 3B No.103, Mergosono, Kedungkandang, Kota Malang, Jawa Timur';

/**
 * Unit beserta profil kelembagaannya. `kepalaNama` diisi teks di sini; FK
 * `kepalaPegawaiId` dipautkan belakangan oleh `tautkanKepalaUnit()` bila
 * pegawai dengan nama itu sudah terdaftar (seed contoh / data import).
 */
const UNIT_ROWS = [
  {
    key: 'SMP',
    nama: 'SMP',
    namaResmi: 'SMP Nurul Huda Mergosono',
    deskripsi: 'Kurikulum Merdeka, 12 rombel 9 rombel, jurusan PA/IPS / Keagamaan, naungan Kemenag. Kelas 7-9. NPSN 20539394.',
    jenjang: 'SMP',
    npsn: '20539394',
    akreditasi: 'B',
    tahunBerdiri: 2004,
    logoPath: '/assets/logo-nuha.webp',
    alamat: ALAMAT_PONDOK,
    telepon: '(0341) 361234',
    email: 'smpnuhamergosono@gmail.com',
    website: 'https://nuha.pesantren.web.id',
    kepalaNama: 'Drs. Sulaiman Hadi, M.Pd.',
    kepalaJabatan: 'Kepala Sekolah',
    visi: 'Terwujudnya lulusan yang berakhlak pesantren, cakap akademik, dan mandiri.',
    misi: 'Menyelenggarakan pembelajaran Kurikulum Merdeka yang berpadu dengan pembinaan diniyah; membiasakan ibadah dan adab harian; mengembangkan minat bakat santri.',
  },
  {
    key: 'MA',
    nama: 'MA',
    namaResmi: 'MA Nurul Huda Mergosono',
    deskripsi: 'Kurikulum Merdeka, 12 rombel 9 rombel, jurusan PA/IPS / Keagamaan, naungan Kemenag. Kelas 10-12. NPSN 131235730021.',
    jenjang: 'MA',
    npsn: '131235730021',
    akreditasi: 'B',
    tahunBerdiri: 2010,
    logoPath: '/assets/logo-nuha.webp',
    alamat: ALAMAT_PONDOK,
    telepon: '(0341) 361234',
    email: 'manuhamergosono@gmail.com',
    website: 'https://nuha.pesantren.web.id',
    kepalaNama: "Khalimatus Sa'diyah, S.Si",
    kepalaJabatan: 'Kepala Madrasah',
    visi: 'Madrasah yang unggul dalam tafaqquh fid-din dan siap melanjutkan ke perguruan tinggi.',
    misi: 'Menguatkan penguasaan kitab dan Al-Qur’an; menyiapkan peminatan IPA, IPS, dan Keagamaan; membina karakter santri yang moderat.',
  },
  {
    key: 'Pondok',
    nama: 'Pondok Pesantren',
    deskripsi: '6 asrama, program Tahfidz & Kitab Kuning, 24 ustadz dan ustadzah membina santri mukim putra dan putri sepanjang hari — dari qiyamul lail sampai muroja\'ah malam.',
    namaResmi: 'Pondok Pesantren Salafiyah Syafi’iyah Nurul Huda Mergosono',
    jenjang: 'Pesantren',
    npsn: '512357301234',
    tahunBerdiri: 1970,
    logoPath: '/assets/logo-nuha.webp',
    alamat: ALAMAT_PONDOK,
    telepon: '(0341) 361234',
    email: 'ppssnuhamergosono@gmail.com',
    website: 'https://nuha.pesantren.web.id',
    kepalaNama: 'Ust. Abdul Karim',
    kepalaJabatan: 'Lurah Pondok',
    visi: 'Pesantren salaf yang kuat pada sanad kitab dan Al-Qur’an, terbuka pada tata kelola modern.',
    misi: 'Menyelenggarakan pengajian kitab kuning berjenjang; membina hafalan Al-Qur’an; menanamkan adab dan kemandirian santri aktif.',
  },
  {
    key: 'Poskestren',
    nama: 'Poskestren',
    deskripsi: '1 perawat tetap, 2 dokter kunjung, 12 kader Santri Husada, 6 bed rawat, dan deteksi dini KLB otomatis.',
    namaResmi: 'Poskestren Nurul Huda Mergosono',
    jenjang: 'Layanan Kesehatan',
    tahunBerdiri: 2016,
    logoPath: '/assets/logo-nuha.webp',
    alamat: ALAMAT_PONDOK,
    telepon: '(0341) 361234',
    email: 'poskestrennuha@gmail.com',
    kepalaNama: 'Ns. Maimunah, S.Kep.',
    kepalaJabatan: 'Penanggung Jawab Poskestren',
    visi: 'Santri sehat, pesantren bersih, layanan kesehatan yang tersistem.',
    misi: 'Menyediakan layanan kesehatan dasar santri bersama Puskesmas Kedungkandang; mencatat riwayat kesehatan santri; menggerakkan perilaku hidup bersih dan sehat.',
  },
];

/** Profil yayasan induk — satu baris, dipakai untuk kop surat & halaman publik. */
const PROFIL_YAYASAN = {
  key: 'yayasan',
  nama: 'Yayasan Pendidikan Islam Nurul Huda Mergosono',
  namaArab: 'مَعْهَدُ نُوْرُ الْهُدَى',
  singkatan: 'PPSS Nurul Huda Mergosono',
  logoPath: '/assets/logo-nuha.webp',
  alamat: ALAMAT_PONDOK,
  telepon: '(0341) 361234',
  email: 'smpnuhamergosono@gmail.com',
  website: 'https://nuha.pesantren.web.id',
  tahunBerdiri: 1970,
  aktaNotaris: 'Akta Yayasan No. 12/1998',
  ketuaNama: 'KH. Ahmad Zainuri, M.Ag.',
  pengasuhNama: 'KH. Masduqi Machfudz',
  rekening: 'BSI 7011-2345-6789 a.n. PPSS Nurul Huda Mergosono',
  visi: 'Menjadi lembaga pendidikan Islam yang melahirkan generasi berilmu, beramal, dan berakhlak mulia.',
  misi: 'Menyelenggarakan pendidikan formal dan diniyah yang terpadu; mengelola pesantren secara amanah dan transparan; melayani umat lewat pendidikan, kesehatan, dan pemberdayaan.',
};

/**
 * Memautkan `kepalaPegawaiId` ke pegawai yang namanya cocok dengan `kepalaNama`.
 * Dilewati diam-diam bila pegawai belum ada (deployment nyata yang baru diseed).
 */
async function tautkanKepalaUnit() {
  for (const row of UNIT_ROWS) {
    const pegawai = await prisma.staff.findFirst({
      where: { person: { fullName: row.kepalaNama } },
      select: { id: true },
    });
    if (!pegawai) continue;
    await prisma.unit.update({ where: { key: row.key }, data: { headStaffId: pegawai.id } });
  }
}

const TAHUN_AJARAN_ROWS = daftarAcademicYear();

async function seedPeranDanMenu() {
  const roles = await Promise.all(source.roles.map((row) => prisma.role.upsert({
    where: { key: String(row.key) },
    create: { key: String(row.key), name: String(row.nama) },
    update: { name: String(row.nama) },
  })));
  const roleByKey = new Map(roles.map((role) => [role.key, role]));

  for (const [index, row] of source.menuDefs.entries()) {
    const menu = await prisma.menuItem.upsert({
      where: { key: String(row.key) },
      create: { key: String(row.key), label: String(row.label), icon: String(row.icon ?? ''), order: index },
      update: { label: String(row.label), icon: String(row.icon ?? ''), order: index },
    });
    for (const key of (row.roles as string[]) ?? []) {
      const role = roleByKey.get(key);
      if (!role) continue;
      await prisma.menuRole.upsert({
        where: { menuId_roleId: { menuId: menu.id, roleId: role.id } },
        create: { menuId: menu.id, roleId: role.id },
        update: {},
      });
    }
  }
}

/** Sandi diambil dari SUPERADMIN_PASSWORD agar deployment nyata tak memakai sandi seed bersama. */
async function seedSuperAdmin() {
  const passwordHash = await bcrypt.hash(process.env.SUPERADMIN_PASSWORD ?? 'Nuha2026!', 12);
  const peran = await prisma.role.upsert({
    where: { key: 'superadmin' },
    create: { key: 'superadmin', name: 'Super Admin' },
    update: { name: 'Super Admin' },
  });
  const orang = await prisma.person.upsert({
    where: { email: 'superadmin@nuha.pesantren.web.id' },
    create: { fullName: 'Super Admin', gender: JenisKelamin.L, email: 'superadmin@nuha.pesantren.web.id', isActive: true },
    update: { isActive: true },
  });
  const user = await prisma.user.upsert({
    where: { personId: orang.id },
    create: { personId: orang.id, email: orang.email!, username: 'superadmin', passwordHash, unitScope: 'Semua unit', aktif: true },
    update: { username: 'superadmin', passwordHash, aktif: true },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: peran.id } },
    create: { userId: user.id, roleId: peran.id },
    update: {},
  });
  for (const menu of await prisma.menuItem.findMany()) {
    await prisma.menuRole.upsert({
      where: { menuId_roleId: { menuId: menu.id, roleId: peran.id } },
      create: { menuId: menu.id, roleId: peran.id },
      update: {},
    });
  }
}

async function main() {
  await seedPeranDanMenu();
  await Promise.all(UNIT_ROWS.map((row) => prisma.unit.upsert({ where: { key: row.key }, create: row, update: row })));
  await prisma.institutionProfile.upsert({
    where: { key: PROFIL_YAYASAN.key },
    create: PROFIL_YAYASAN,
    update: PROFIL_YAYASAN,
  });
  await tautkanKepalaUnit();
  await Promise.all(TAHUN_AJARAN_ROWS.map((row) => prisma.academicYear.upsert({
    where: { code_semester: { code: row.code, semester: row.semester } },
    create: row,
    update: { isActive: row.isActive },
  })));
  for (const row of source.waCases) {
    await prisma.waTemplate.upsert({
      where: { code: String(row.kode) },
      create: { code: String(row.kode), role: String(row.role), title: String(row.judul), trigger: String(row.pemicu), schedule: String(row.waktu), content: String(row.isi), isActive: Boolean(row.aktif) },
      update: { title: String(row.judul), content: String(row.isi) },
    });
  }
  await seedSuperAdmin();
  console.log('Seed dasar selesai: peran, menu, unit, tahun ajaran, template WA, superadmin.');
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
