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
import { seedKeuanganPondok } from './seed-keuangan';

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
  {
    // 01-fondasi §4 (jawaban bawaan U4 di 06-pertanyaan-client.md): aset dan
    // lowongan milik yayasan (tanah, kendaraan, gedung bersama) butuh unit
    // sendiri, bukan menempel ke salah satu sekolah/pondok.
    key: 'YAYASAN',
    nama: 'Yayasan',
    namaResmi: 'Yayasan Pendidikan Islam Nurul Huda Mergosono',
    deskripsi: 'Unit administratif untuk aset dan lowongan milik yayasan langsung (tanah, gedung bersama, kendaraan), bukan salah satu unit sekolah/pondok.',
    jenjang: 'Yayasan',
    alamat: ALAMAT_PONDOK,
    telepon: '(0341) 361234',
    email: 'smpnuhamergosono@gmail.com',
    website: 'https://nuha.pesantren.web.id',
    kepalaNama: 'KH. Ahmad Zainuri, M.Ag.',
    kepalaJabatan: 'Ketua Yayasan',
  },
];

/**
 * Peran baru dari plan/2026-09-modul-inti/05-matriks-peran.md §2, dibutuhkan
 * modul presensi/sarpras/rekrutmen yang belum ada menunya di sini — menu
 * & grantnya menyusul saat schema Fase B/C/D dikerjakan. Ditambah di sini
 * (bukan cuma proto-data.json) karena inilah yang jalan di produksi.
 */
const PERAN_BARU = [
  { key: 'pegawai', nama: 'Pegawai / Staf' },
  { key: 'sdm', nama: 'Admin Kepegawaian (SDM)' },
  { key: 'sarpras', nama: 'Pengelola Sarpras' },
  { key: 'teknisi', nama: 'Petugas Teknis / Perawatan' },
  { key: 'musyrif', nama: 'Musyrif / Pengurus Asrama' },
];

/**
 * Menu untuk 3 modul baru (05-matriks-peran §3). Ditambah langsung di sini
 * (bukan proto-data.json, yang khusus data legacy prototype) karena inilah
 * yang jalan di produksi. `order` disambung dari 14 menu proto-data supaya
 * tidak tabrakan; `roles` mengikuti tabel "Menu per peran" persis.
 */
const MENU_BARU = [
  {
    key: 'rekrutmen',
    label: 'Rekrutmen',
    icon: 'M4 7h16v13H4zM8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M2 12h20',
    roles: ['ketua', 'kepsmp', 'kepma', 'pengasuh', 'sdm'],
  },
  {
    key: 'sarpras',
    label: 'Sarpras',
    icon: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z',
    roles: ['ketua', 'kepsmp', 'kepma', 'pengasuh', 'guru', 'musyrif', 'pegawai', 'sarpras', 'teknisi', 'bendahara', 'poskestren'],
  },
  {
    key: 'presensi',
    label: 'Presensi',
    icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
    roles: ['ketua', 'kepsmp', 'kepma', 'pengasuh', 'guru', 'musyrif', 'pegawai', 'sdm', 'sarpras', 'teknisi', 'bendahara', 'poskestren'],
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
  // 05-matriks-peran.md §2 — peran baru untuk modul yang belum ada menunya.
  await Promise.all(PERAN_BARU.map((row) => prisma.role.upsert({
    where: { key: row.key },
    create: { key: row.key, name: row.nama },
    update: { name: row.nama },
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

  const semuaPeran = await prisma.role.findMany();
  const semuaPeranByKey = new Map(semuaPeran.map((r) => [r.key, r]));
  for (const [index, row] of MENU_BARU.entries()) {
    const menu = await prisma.menuItem.upsert({
      where: { key: row.key },
      create: { key: row.key, label: row.label, icon: row.icon, order: source.menuDefs.length + index },
      update: { label: row.label, icon: row.icon },
    });
    for (const key of row.roles) {
      const role = semuaPeranByKey.get(key);
      if (!role) continue;
      await prisma.menuRole.upsert({
        where: { menuId_roleId: { menuId: menu.id, roleId: role.id } },
        create: { menuId: menu.id, roleId: role.id },
        update: {},
      });
    }
  }
}

/**
 * 01-fondasi §3.3: "Seed awal memberi izin yang SAMA PERSIS dengan akses
 * sekarang ke peran lama, lalu dikurangi secara sadar." Untuk setiap menu,
 * buat izin `<menu>.view` dan `<menu>.update`, lalu berikan KEDUANYA ke
 * setiap peran yang sudah punya grant menu itu di `menu_roles` — inilah yang
 * membuat pengalihan CRUD generik ke authorizeRead/authorizeWrite di
 * app/api/crud/[entity]/route.ts tidak mengubah akses siapa pun. Mengurangi
 * izin (mis. guru kehilangan `mapel.update`) adalah langkah TERPISAH yang
 * butuh konfirmasi client (lihat 05 §7), belum dilakukan di sini.
 */
async function seedIzinTingkatAksi() {
  const menus = await prisma.menuItem.findMany({ include: { roles: true } });
  for (const menu of menus) {
    const view = await prisma.permission.upsert({
      where: { key: `${menu.key}.view` },
      create: { key: `${menu.key}.view`, label: `Lihat ${menu.label}`, menuKey: menu.key },
      update: { label: `Lihat ${menu.label}`, menuKey: menu.key },
    });
    const write = await prisma.permission.upsert({
      where: { key: `${menu.key}.update` },
      create: { key: `${menu.key}.update`, label: `Ubah ${menu.label}`, menuKey: menu.key },
      update: { label: `Ubah ${menu.label}`, menuKey: menu.key },
    });
    for (const grant of menu.roles) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: grant.roleId, permissionId: view.id } },
        create: { roleId: grant.roleId, permissionId: view.id },
        update: {},
      });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: grant.roleId, permissionId: write.id } },
        create: { roleId: grant.roleId, permissionId: write.id },
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

/**
 * Izin granular per modul (beda dari `seedIzinTingkatAksi()` yang cuma
 * meniru view/update generik dari grant menu). Dipakai untuk 03-rekrutmen
 * §7 dan menyusul 04-aset-sarpras §10 / 02-presensi §5. `label` singkat
 * karena ditampilkan di tab pengaturan?tab=izin (matriks peran x izin).
 */
async function seedIzinGranular(daftar: Array<{ key: string; label: string; menuKey: string; roles: string[] }>) {
  const semuaPeran = await prisma.role.findMany();
  const roleByKey = new Map(semuaPeran.map((r) => [r.key, r]));
  for (const izin of daftar) {
    const permission = await prisma.permission.upsert({
      where: { key: izin.key },
      create: { key: izin.key, label: izin.label, menuKey: izin.menuKey },
      update: { label: izin.label, menuKey: izin.menuKey },
    });
    for (const roleKey of izin.roles) {
      const role = roleByKey.get(roleKey);
      if (!role) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        create: { roleId: role.id, permissionId: permission.id },
        update: {},
      });
    }
    // seedIzinTingkatAksi() memberi `<menu>.view` ke SEMUA peran yang punya menu
    // itu; untuk izin granular modul baru, matriks 05 yang berlaku — cabut sisanya
    // (mis. pegawai punya menu presensi tetapi TIDAK boleh presensi.view).
    // superadmin tidak disentuh (lolos lewat isSuperAdmin, bukan RolePermission).
    const diizinkan = izin.roles.map((k) => roleByKey.get(k)?.id).filter((x): x is number => x != null);
    const superadmin = roleByKey.get('superadmin')?.id;
    await prisma.rolePermission.deleteMany({
      where: { permissionId: permission.id, roleId: { notIn: [...diizinkan, ...(superadmin ? [superadmin] : [])] } },
    });
  }
}

/** 03-rekrutmen-lowongan-kerja.md §5/§7 — matriks izin persis dari dokumen. */
const IZIN_REKRUTMEN = [
  { key: 'rekrutmen.view', label: 'Lihat rekrutmen', roles: ['ketua', 'kepsmp', 'kepma', 'pengasuh', 'sdm'] },
  { key: 'rekrutmen.view_sensitive', label: 'Lihat data sensitif pelamar (KTP/KK)', roles: ['ketua', 'sdm'] },
  { key: 'rekrutmen.job_manage', label: 'Kelola lowongan', roles: ['ketua', 'kepsmp', 'kepma', 'pengasuh', 'sdm'] },
  { key: 'rekrutmen.approve', label: 'Setujui pembukaan lowongan', roles: ['ketua'] },
  { key: 'rekrutmen.screen', label: 'Verifikasi berkas & pindah tahap', roles: ['ketua', 'kepsmp', 'kepma', 'pengasuh', 'sdm'] },
  { key: 'rekrutmen.score', label: 'Beri nilai seleksi', roles: ['ketua', 'kepsmp', 'kepma', 'pengasuh', 'sdm'] },
  { key: 'rekrutmen.decide', label: 'Tetapkan hasil (Hired/Rejected)', roles: ['ketua', 'kepsmp', 'kepma', 'pengasuh'] },
  { key: 'rekrutmen.hire', label: 'Konversi pelamar jadi pegawai', roles: ['ketua', 'sdm'] },
  { key: 'rekrutmen.export', label: 'Ekspor data rekrutmen', roles: ['ketua', 'kepsmp', 'kepma', 'pengasuh', 'sdm'] },
].map((row) => ({ ...row, menuKey: 'rekrutmen' }));

/** Templat WA rekrutmen (03 §8) — selalu lewat WA_DRY_RUN, tidak pernah kirim sungguhan dari seed. */
const WA_TEMPLATE_REKRUTMEN = [
  { code: 'LMR_DITERIMA', role: 'Pelamar', title: 'Lamaran diterima sistem', trigger: 'Setelah pelamar submit formulir /karir', schedule: null, content: 'Assalamu\'alaikum {nama}, lamaran Anda untuk posisi {posisi} telah kami terima dengan nomor {nomor}. Cek status di {tautanStatus}.' },
  { code: 'LMR_PERBAIKAN_BERKAS', role: 'Pelamar', title: 'Permintaan perbaikan berkas', trigger: 'Panitia menandai dokumen perlu diperbaiki', schedule: null, content: 'Assalamu\'alaikum {nama}, berkas {namaBerkas} pada lamaran {nomor} perlu diperbaiki: {catatan}. Silakan unggah ulang lewat {tautanStatus}.' },
  { code: 'LMR_UNDANGAN_TES', role: 'Pelamar', title: 'Undangan tes/wawancara', trigger: 'Panitia menjadwalkan tahap seleksi', schedule: null, content: 'Assalamu\'alaikum {nama}, Anda diundang mengikuti {tahap} pada {jadwal} di {lokasi}. Mohon konfirmasi kehadiran.' },
  { code: 'LMR_HASIL_LOLOS', role: 'Pelamar', title: 'Hasil seleksi — lolos', trigger: 'Status lamaran diubah menjadi Offered/Hired', schedule: null, content: 'Assalamu\'alaikum {nama}, selamat! Anda dinyatakan lolos seleksi untuk posisi {posisi}. Tim SDM akan menghubungi Anda untuk langkah selanjutnya.' },
  { code: 'LMR_HASIL_TDK_LOLOS', role: 'Pelamar', title: 'Hasil seleksi — tidak lolos', trigger: 'Status lamaran diubah menjadi Rejected', schedule: null, content: 'Assalamu\'alaikum {nama}, terima kasih atas partisipasi Anda pada seleksi {posisi}. Untuk saat ini kami belum dapat melanjutkan proses Anda.' },
];


/** 04-aset-sarpras §10 + 05-matriks-peran §6. Cakupan "unitnya" ditegakkan lewat UserUnit, bukan izin terpisah. */
const SEMUA_PERAN_SARPRAS = ['ketua', 'kepsmp', 'kepma', 'pengasuh', 'guru', 'musyrif', 'pegawai', 'sarpras', 'teknisi', 'bendahara', 'poskestren'];
const KEPALA_UNIT = ['kepsmp', 'kepma', 'pengasuh'];
const IZIN_SARPRAS = [
  { key: 'sarpras.view', label: 'Lihat aset sarpras', roles: SEMUA_PERAN_SARPRAS },
  { key: 'sarpras.view_value', label: 'Lihat harga & nilai buku aset', roles: ['ketua', 'bendahara', ...KEPALA_UNIT, 'sarpras'] },
  { key: 'sarpras.asset_manage', label: 'Kelola register aset', roles: ['sarpras'] },
  { key: 'sarpras.location_manage', label: 'Kelola lokasi/ruang', roles: ['sarpras'] },
  { key: 'sarpras.master_manage', label: 'Kelola master sarpras (kategori, dana, vendor, ambang)', roles: ['ketua', 'sarpras'] },
  { key: 'sarpras.procure_request', label: 'Ajukan pengadaan', roles: [...KEPALA_UNIT, 'sarpras', 'poskestren'] },
  { key: 'sarpras.procure_approve', label: 'Setujui pengadaan', roles: ['ketua', 'bendahara', ...KEPALA_UNIT] },
  { key: 'sarpras.loan_request', label: 'Ajukan peminjaman aset/ruang', roles: SEMUA_PERAN_SARPRAS },
  { key: 'sarpras.loan_approve', label: 'Setujui peminjaman', roles: ['ketua', 'sarpras'] },
  { key: 'sarpras.damage_report', label: 'Laporkan kerusakan', roles: SEMUA_PERAN_SARPRAS },
  { key: 'sarpras.damage_handle', label: 'Tangani tiket kerusakan', roles: ['sarpras', 'teknisi'] },
  { key: 'sarpras.maintenance_manage', label: 'Kelola pemeliharaan terjadwal', roles: ['sarpras', 'teknisi'] },
  { key: 'sarpras.opname_run', label: 'Jalankan stock opname', roles: ['sarpras', 'teknisi'] },
  { key: 'sarpras.opname_close', label: 'Tutup stock opname', roles: [...KEPALA_UNIT, 'sarpras'] },
  { key: 'sarpras.dispose_request', label: 'Usulkan penghapusan aset', roles: [...KEPALA_UNIT, 'sarpras'] },
  { key: 'sarpras.dispose_approve', label: 'Setujui penghapusan aset', roles: ['ketua', ...KEPALA_UNIT] },
  { key: 'sarpras.export', label: 'Ekspor laporan sarpras', roles: ['ketua', 'bendahara', ...KEPALA_UNIT, 'sarpras'] },
].map((row) => ({ ...row, menuKey: 'sarpras' }));

/** Golongan KIB A–F + subkategori umum sekolah/pondok (04 §11 langkah 1). */
const KATEGORI_ASET = [
  { code: 'A.01', name: 'Tanah', kibGroup: 'A', usefulLifeYears: null },
  { code: 'B.01.01', name: 'Meja & kursi siswa', kibGroup: 'B', usefulLifeYears: 8 },
  { code: 'B.01.02', name: 'Lemari & rak', kibGroup: 'B', usefulLifeYears: 8 },
  { code: 'B.01.03', name: 'Kasur & ranjang asrama', kibGroup: 'B', usefulLifeYears: 5 },
  { code: 'B.02.01', name: 'Komputer & laptop', kibGroup: 'B', usefulLifeYears: 4 },
  { code: 'B.02.02', name: 'Printer & mesin fotokopi', kibGroup: 'B', usefulLifeYears: 4 },
  { code: 'B.02.03', name: 'Proyektor & layar', kibGroup: 'B', usefulLifeYears: 4 },
  { code: 'B.03.01', name: 'AC & kipas angin', kibGroup: 'B', usefulLifeYears: 8, needsMaintenance: true },
  { code: 'B.03.02', name: 'Sound system', kibGroup: 'B', usefulLifeYears: 5 },
  { code: 'B.03.03', name: 'Genset', kibGroup: 'B', usefulLifeYears: 10, needsMaintenance: true },
  { code: 'B.03.04', name: 'Pompa air & tandon', kibGroup: 'B', usefulLifeYears: 8, needsMaintenance: true },
  { code: 'B.03.05', name: 'APAR', kibGroup: 'B', usefulLifeYears: 5, needsMaintenance: true },
  { code: 'B.04.01', name: 'Kendaraan roda 4', kibGroup: 'B', usefulLifeYears: 8, needsMaintenance: true },
  { code: 'B.04.02', name: 'Kendaraan roda 2', kibGroup: 'B', usefulLifeYears: 8, needsMaintenance: true },
  { code: 'B.05.01', name: 'Alat laboratorium', kibGroup: 'B', usefulLifeYears: 5 },
  { code: 'B.05.02', name: 'Alat kesehatan', kibGroup: 'B', usefulLifeYears: 5 },
  { code: 'B.06.01', name: 'Peralatan dapur', kibGroup: 'B', usefulLifeYears: 5 },
  { code: 'B.07.01', name: 'Karpet & perlengkapan masjid', kibGroup: 'B', usefulLifeYears: 5 },
  { code: 'C.01', name: 'Gedung sekolah', kibGroup: 'C', usefulLifeYears: 20 },
  { code: 'C.02', name: 'Asrama', kibGroup: 'C', usefulLifeYears: 20 },
  { code: 'C.03', name: 'Masjid / musholla', kibGroup: 'C', usefulLifeYears: 20 },
  { code: 'D.01', name: 'Jaringan listrik, air & internet', kibGroup: 'D', usefulLifeYears: 10 },
  { code: 'E.01', name: 'Buku & kitab perpustakaan', kibGroup: 'E', usefulLifeYears: null },
  { code: 'F.01', name: 'Konstruksi dalam pengerjaan', kibGroup: 'F', usefulLifeYears: null },
  { code: 'H.01', name: 'ATK & bahan habis pakai', kibGroup: 'E', usefulLifeYears: null, isConsumable: true },
];

const SUMBER_DANA = [
  { code: 'YAYASAN', name: 'Kas Yayasan', restrictedDisposal: false },
  { code: 'BOS', name: 'Dana BOS (SMP)', restrictedDisposal: true },
  { code: 'BOSP_MADRASAH', name: 'BOS Madrasah (MA)', restrictedDisposal: true },
  { code: 'WAKAF', name: 'Wakaf', restrictedDisposal: true },
  { code: 'HIBAH_PEMERINTAH', name: 'Hibah Pemerintah', restrictedDisposal: false },
  { code: 'DONASI', name: 'Donasi wali/alumni', restrictedDisposal: false },
  { code: 'SWADAYA_WALI', name: 'Swadaya wali santri', restrictedDisposal: false },
  { code: 'KOPERASI', name: 'Koperasi / Nuhamart', restrictedDisposal: false },
];

async function seedMasterSarpras() {
  for (const k of KATEGORI_ASET) {
    const data = { name: k.name, kibGroup: k.kibGroup, usefulLifeYears: k.usefulLifeYears, needsMaintenance: k.needsMaintenance ?? false, isConsumable: k.isConsumable ?? false };
    await prisma.assetCategory.upsert({ where: { code: k.code }, create: { code: k.code, ...data }, update: data });
  }
  for (const d of SUMBER_DANA) {
    await prisma.fundingSource.upsert({ where: { code: d.code }, create: d, update: { name: d.name, restrictedDisposal: d.restrictedDisposal } });
  }
  // Ambang disimpan di pengaturan (04 §5), bukan konstanta — create saja, jangan timpa ubahan admin.
  for (const [key, value] of [['sarpras.ambang_pengadaan_yayasan', '5000000'], ['sarpras.ambang_kapitalisasi', '1000000']]) {
    await prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: {} });
  }
}

/** 02 §5 + 05-matriks-peran §4. Cakupan "unitnya/rombel sendiri/asramanya" ditegakkan di server, bukan izin terpisah. */
const SEMUA_PERAN_PRESENSI = ['ketua', 'kepsmp', 'kepma', 'pengasuh', 'guru', 'musyrif', 'pegawai', 'sdm', 'sarpras', 'teknisi', 'bendahara', 'poskestren'];
const IZIN_PRESENSI = [
  { key: 'presensi.self', label: 'Presensi diri (check-in selfie)', roles: SEMUA_PERAN_PRESENSI },
  { key: 'presensi.view', label: 'Lihat dashboard presensi', roles: ['ketua', ...KEPALA_UNIT, 'guru', 'musyrif', 'sdm'] },
  { key: 'presensi.input', label: 'Input presensi siswa/santri', roles: [...KEPALA_UNIT, 'guru', 'musyrif'] },
  { key: 'presensi.lock', label: 'Ubah presensi yang sudah terkunci', roles: ['ketua', ...KEPALA_UNIT] },
  { key: 'presensi.override', label: 'Timpa presensi IZIN/POSKESTREN', roles: ['ketua', ...KEPALA_UNIT, 'poskestren'] },
  { key: 'presensi.review', label: 'Tinjau presensi pegawai (foto, luar lokasi, izin)', roles: ['ketua', ...KEPALA_UNIT, 'sdm'] },
  { key: 'presensi.export', label: 'Ekspor rekap presensi', roles: ['ketua', ...KEPALA_UNIT, 'guru', 'sdm'] },
  { key: 'presensi.setting', label: 'Pengaturan presensi (sesi, jam kerja, libur, radius)', roles: ['ketua', 'sdm'] },
].map((row) => ({ ...row, menuKey: 'presensi' }));

/** 02 §2.1 + default 06 P1. Senin–Sabtu = 63; Senin–Kamis+Sabtu (tanpa Jumat) = 47; setiap hari = 127. */
const SESI_PRESENSI = [
  { code: 'SEKOLAH', name: 'Harian sekolah', unit: null, grouping: 'KELAS', jamMulai: '07:00', batasTerlambat: '07:15', hariAktif: 63, order: 1 },
  { code: 'MADIN', name: 'Madrasah Diniyah', unit: 'Pondok', grouping: 'KELAS', jamMulai: '14:00', batasTerlambat: '14:15', hariAktif: 47, order: 2 },
  { code: 'JAMAAH_SUBUH', name: 'Jamaah Subuh', unit: 'Pondok', grouping: 'ASRAMA', jamMulai: '04:30', batasTerlambat: '04:40', hariAktif: 127, order: 3 },
  { code: 'NGAJI_MALAM', name: 'Ngaji malam / halaqah', unit: 'Pondok', grouping: 'ASRAMA', jamMulai: '19:30', batasTerlambat: '19:45', hariAktif: 127, order: 4 },
  { code: 'APEL_MALAM', name: 'Apel / absen kamar', unit: 'Pondok', grouping: 'ASRAMA', jamMulai: '21:30', batasTerlambat: '21:40', hariAktif: 127, order: 5 },
];

const WA_TEMPLATE_PRESENSI = [
  { code: 'PRESENSI_ALPA', role: 'Wali Santri', title: 'Anak tidak hadir (alpa)', trigger: 'Santri berstatus Alpa di sesi sekolah', schedule: 'Sekali per hari, batas terlambat + 60 menit', content: 'Assalamu\'alaikum Bapak/Ibu {wali}, ananda {nama} tercatat TIDAK HADIR tanpa keterangan pada {tanggal} ({sesi}). Mohon konfirmasi ke wali kelas bila ada keterangan.' },
];

async function seedMasterPresensi() {
  const units = new Map((await prisma.unit.findMany()).map((u) => [u.key, u.id]));
  for (const sesi of SESI_PRESENSI) {
    const data = { name: sesi.name, unitId: sesi.unit ? units.get(sesi.unit) ?? null : null, grouping: sesi.grouping, jamMulai: sesi.jamMulai, batasTerlambat: sesi.batasTerlambat, hariAktif: sesi.hariAktif, order: sesi.order };
    // create saja untuk jam/hari (bisa diubah admin di Pengaturan), update hanya nama & urutan.
    await prisma.attendanceSession.upsert({ where: { code: sesi.code }, create: { code: sesi.code, ...data }, update: { name: data.name, order: data.order, grouping: data.grouping } });
  }
  // 06 P3: 07.00–14.00 toleransi 15 menit, Jumat 07.00–11.00, Senin–Sabtu. Dibuat sekali; ubahan admin tidak ditimpa.
  for (const [key, unitId] of units) {
    if (key === 'Poskestren') continue;
    const ada = await prisma.workSchedule.count({ where: { unitId, staffId: null } });
    if (ada) continue;
    await prisma.workSchedule.createMany({
      data: [1, 2, 3, 4, 5, 6].map((hari) => ({ unitId, hari, jamMasuk: '07:00', jamPulang: hari === 5 ? '11:00' : '14:00', toleransiMenit: 15 })),
    });
  }
  for (const row of WA_TEMPLATE_PRESENSI) {
    await prisma.waTemplate.upsert({ where: { code: row.code }, create: row, update: { title: row.title, content: row.content } });
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
  for (const row of WA_TEMPLATE_REKRUTMEN) {
    await prisma.waTemplate.upsert({ where: { code: row.code }, create: row, update: { title: row.title, content: row.content } });
  }
  await seedSuperAdmin();
  await seedIzinTingkatAksi();
  await seedIzinGranular(IZIN_REKRUTMEN);
  await seedIzinGranular(IZIN_SARPRAS);
  await seedMasterSarpras();
  await seedIzinGranular(IZIN_PRESENSI);
  await seedMasterPresensi();
  await seedKeuanganPondok(prisma);
  console.log('Seed dasar selesai: peran, menu, unit, tahun ajaran, template WA, superadmin, izin tingkat aksi.');
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
