/**
 * Isi bagian onboarding /docs: untuk orang yang baru pertama membuka proyek
 * ini — apa yang dikelola sistem, modul apa saja, dan bagaimana data mengalir.
 * Dipisah dari isi.ts supaya masing-masing tetap di bawah batas 400 baris.
 */

export const TENTANG = {
  ringkas:
    'SIMTERPADU adalah sistem informasi terpadu Pondok Pesantren Nurul Huda Mergosono, Malang. '
    + 'Satu aplikasi untuk seluruh urusan yayasan: kesiswaan, akademik dua sekolah formal, kegiatan '
    + 'kepesantrenan, kesehatan santri, keuangan & penggajian, PPDB, hingga komunikasi WhatsApp ke wali. '
    + 'Sebelumnya urusan-urusan itu tercecer di buku, spreadsheet, dan grup WA yang saling tidak nyambung.',
  unit: [
    { nama: 'SMP Nurul Huda Mergosono', peran: 'Sekolah formal jenjang menengah pertama.' },
    { nama: 'MA Nurul Huda Mergosono', peran: 'Sekolah formal jenjang aliyah.' },
    { nama: 'Pondok Pesantren', peran: 'Asrama, jamaah, hafalan, halaqah, madrasah diniyah, perizinan santri.' },
    { nama: 'Poskestren', peran: 'Pos kesehatan pesantren: pemeriksaan, rekam medis, stok obat, kader piket.' },
  ],
  identitas:
    'Kuncinya "satu identitas": satu orang dicatat sekali di tabel `orang`, lalu perannya menempel — '
    + 'sebagai santri (dengan NIS), pegawai, wali, atau pengguna aplikasi. Seorang santri MA yang mondok '
    + 'dan berobat di poskestren tetap satu baris orang yang sama; nilai rapor, hafalan, tagihan SPP, dan '
    + 'rekam medisnya bertemu di identitas itu. Guru pun sama: satu akun bisa mengajar di SMP dan MA '
    + 'sekaligus merangkap ustadz diniyah di pondok.',
};

export type PetaModul = { kelompok: string; modul: { menu: string; path: string; untuk: string }[] };

export const PETA_MODUL: PetaModul[] = [
  {
    kelompok: 'Data pokok',
    modul: [
      { menu: 'Dashboard', path: '/', untuk: 'Ringkasan lintas unit: KPI santri/pegawai, tren, komposisi, keuangan, agenda.' },
      { menu: 'Data Induk', path: '/induk', untuk: 'Buku induk santri: biodata, akademik, kepesantrenan, kesehatan, keuangan, dan data walinya — satu santri satu berkas utuh.' },
      { menu: 'Master Data', path: '/data', untuk: 'CRUD generik seluruh entitas untuk admin: menambah kelas, jadwal, tagihan, pengguna, dan lainnya tanpa menunggu fitur khusus.' },
    ],
  },
  {
    kelompok: 'Akademik sekolah',
    modul: [
      { menu: 'Akademik', path: '/akademik', untuk: 'Operasional harian kelas: daftar siswa, presensi, input nilai, rapor.' },
      { menu: 'Kurikulum', path: '/kurikulum', untuk: 'Struktur kurikulum, capaian pembelajaran, silabus & modul ajar, bank soal, dan "Kelas Saya" milik guru.' },
      { menu: 'Ujian', path: '/ujian', untuk: 'Gelombang UTS/UAS per unit: kepala unit mengatur statusnya, guru mengisi nilai per sesi. Nilai per sesi terpisah dari rekap rapor.' },
      { menu: 'LMS & Kompetensi', path: '/lms', untuk: 'Modul belajar digital, kompetensi, bukti karya, sertifikat, gamifikasi poin santri.' },
    ],
  },
  {
    kelompok: 'Kepesantrenan & kesehatan',
    modul: [
      { menu: 'Kepesantrenan', path: '/kepesantrenan', untuk: 'Kehidupan pondok: penempatan asrama/kamar, presensi jamaah, setoran hafalan, halaqah, tazir (pelanggaran), izin keluar-pulang.' },
      { menu: 'Poskestren', path: '/poskestren', untuk: 'Pemeriksaan santri sakit, rekam medis, stok obat, jadwal piket kader, laporan berkala.' },
    ],
  },
  {
    kelompok: 'Keuangan',
    modul: [
      { menu: 'Keuangan', path: '/keuangan', untuk: 'Tagihan & SPP santri, rekap pembayaran, daftar tunggakan, transaksi kas.' },
      { menu: 'Penggajian', path: '/penggajian', untuk: 'Payroll pegawai: slip diterbitkan → dibayar → bila perlu direvisi; tiap tahap meninggalkan jejak audit.' },
    ],
  },
  {
    kelompok: 'Relasi keluar',
    modul: [
      { menu: 'Notifikasi WA', path: '/notifikasi', untuk: 'Template pesan, pemicu otomatis (tagihan jatuh tempo, izin, gajian), log kiriman, dan pemasangan nomor WhatsApp lewat QR.' },
      { menu: 'Kunjungan Wali', path: '/kunjungan-wali', untuk: 'Pendaftaran dan pencatatan kunjungan wali ke pondok beserta aturannya.' },
      { menu: 'PPDB', path: '/ppdb-panitia', untuk: 'Meja panitia penerimaan: memeriksa pendaftar dari wizard publik, seleksi, penetapan kelulusan.' },
    ],
  },
  {
    kelompok: 'Pelaporan & kendali',
    modul: [
      { menu: 'Laporan', path: '/laporan', untuk: 'Rekap lintas modul yang siap diekspor untuk rapat yayasan.' },
      { menu: 'Pengaturan', path: '/pengaturan', untuk: 'Tahun ajaran, unit, pengguna, dan pemetaan peran → menu (RBAC).' },
    ],
  },
  {
    kelompok: 'Portal & publik',
    modul: [
      { menu: 'Portal Santri', path: '/portal/santri', untuk: 'Layar baca-saja untuk santri: pengumuman, jadwal, nilai, hafalan, tagihan, kartu santri.' },
      { menu: 'Portal Wali', path: '/portal/wali', untuk: 'Layar ponsel untuk orang tua: perkembangan anak, kesehatan, tagihan & pembayaran, ajukan kunjungan/izin.' },
      { menu: 'Halaman publik', path: '/', untuk: 'Tanpa login: profil pondok, PPDB online lima langkah, cek status pendaftaran.' },
    ],
  },
];

export type AlurInti = { judul: string; alur: string };

export const ALUR_INTI: AlurInti[] = [
  {
    judul: 'Santri baru',
    alur: 'Wali mengisi wizard PPDB publik → nomor registrasi terbit → panitia menyeleksi di /ppdb-panitia → lulus → data pendaftar menjadi baris orang + santri → masuk kelas & kamar → tagihan pertama dibuat → akun portal santri dan wali tercipta.',
  },
  {
    judul: 'Nilai',
    alur: 'Guru mengisi nilai harian di /akademik dan nilai sesi ujian di /ujian → rekap per periode menjadi rapor → santri dan wali membacanya di portal masing-masing. Gelombang ujian yang ditutup kepala unit mengunci nilainya.',
  },
  {
    judul: 'Uang masuk',
    alur: 'Tagihan dibuat (SPP/lainnya) → pembayaran dicatat bendahara → status Lunas/Cicil/Menunggak → tunggakan memicu pengingat WhatsApp ke wali → rekap masuk laporan keuangan.',
  },
  {
    judul: 'Santri sakit',
    alur: 'Kader/petugas memeriksa di poskestren → rekam medis bertambah, stok obat berkurang → bila perlu, wali dikabari lewat WhatsApp → riwayatnya terbaca di Data Induk dan portal wali.',
  },
  {
    judul: 'Pesan WhatsApp',
    alur: 'Nomor pondok ditautkan sekali lewat QR → template diisi peubah ({{nama}}, {{nominal}}) → pemicu otomatis atau kirim manual → setiap upaya tercatat di log + audit. Selama WA_DRY_RUN=true pesan hanya dicatat, tidak terkirim.',
  },
];

export const TEKNOLOGI: { judul: string; isi: string }[] = [
  { judul: 'Aplikasi', isi: 'Next.js (App Router, server components + server actions) dan TypeScript. Semua pemeriksaan hak berjalan di server — menu yang tersembunyi bukan pengaman.' },
  { judul: 'Data', isi: 'MySQL 8 lewat Prisma. Skema hidup di prisma/schema.prisma; perubahan selalu lewat berkas migrasi, dan seed idempoten mengisi data contoh yang deterministik.' },
  { judul: 'Akses', isi: 'RBAC dinamis: tabel menu, menu_peran, user_peran. Menambah hak cukup dari Pengaturan tanpa deploy ulang. Sesi JWT 8 jam di kuki httpOnly.' },
  { judul: 'WhatsApp', isi: 'Gateway Baileys (tidak resmi) berjalan sebagai container terpisah, hanya bisa dipanggil dari dalam jaringan compose. Kredensial nomor tersimpan di volume.' },
  { judul: 'Jejak', isi: 'Semua aksi yang mengubah keadaan dicatat ke audit_log dengan pelaku dan isi perubahan.' },
  { judul: 'Asal-usul', isi: 'Desain diport setia dari prototype statis di apps/marketing/sub/nuha — prototype itu tetap menjadi acuan tampilan.' },
];

export const GLOSARIUM: { istilah: string; arti: string }[] = [
  { istilah: 'Santri', arti: 'Peserta didik. Yang tinggal di asrama disebut mukim, yang pulang-pergi non-mukim.' },
  { istilah: 'Wali', arti: 'Orang tua/penanggung jawab santri; punya akun portal sendiri.' },
  { istilah: 'Ustadz / musyrif', arti: 'Pengajar diniyah / pendamping asrama di pondok.' },
  { istilah: 'Diniyah', arti: 'Madrasah keagamaan sore/malam milik pondok, di luar sekolah formal.' },
  { istilah: 'Halaqah', arti: 'Kelompok kecil mengaji dengan satu pembimbing.' },
  { istilah: 'Tazir', arti: 'Sanksi pembinaan atas pelanggaran tata tertib pondok.' },
  { istilah: 'Tahfidz / setoran', arti: 'Hafalan Al-Qur’an; setoran adalah menyetorkan hafalan ke pembimbing.' },
  { istilah: 'PPDB', arti: 'Penerimaan Peserta Didik Baru.' },
  { istilah: 'KKM', arti: 'Kriteria Ketuntasan Minimal — ambang nilai lulus per mata pelajaran.' },
  { istilah: 'JP', arti: 'Jam pelajaran (satuan beban mengajar per pekan).' },
  { istilah: 'Gelombang ujian', arti: 'Satu penyelenggaraan UTS/UAS pada satu unit dan periode; berisi banyak sesi (mapel × kelas).' },
];
