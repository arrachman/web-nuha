/**
 * Isi dokumentasi dipisahkan dari penyajinya supaya halaman `/docs` tetap
 * ringkas dan teks bisa disunting tanpa menyentuh markup.
 */

export type Langkah = { judul: string; detail: string };
export type Bagian = {
  id: string;
  judul: string;
  ringkas: string;
  langkah?: Langkah[];
  /** Beberapa bagian menjelaskan lebih dari satu layar, jadi ini daftar. */
  gambar?: { file: string; caption: string }[];
  catatan?: string;
};

export const AKUN: { peran: string; login: string; menu: string; catatan: string }[] = [
  { peran: 'Super Admin', login: 'superadmin', menu: '18', catatan: 'Seluruh menu + pemilih peran untuk debugging.' },
  { peran: 'Ketua Yayasan', login: 'ketua@nuha.pesantren.web.id', menu: '16', catatan: 'Pengawasan lintas unit; termasuk mengelola gelombang ujian.' },
  { peran: 'Kepala SMP', login: 'kepsek.smp@nuha.pesantren.web.id', menu: '11', catatan: 'Terbatas unit SMP; mengelola gelombang ujian unitnya.' },
  { peran: 'Kepala MA', login: 'kepsek.ma@nuha.pesantren.web.id', menu: '11', catatan: 'Terbatas unit MA; mengelola gelombang ujian unitnya.' },
  { peran: 'Pengasuh', login: 'pengasuh@nuha.pesantren.web.id', menu: '9', catatan: 'Kepesantrenan, hafalan, tazir, izin.' },
  { peran: 'Guru / Wali Kelas', login: 'guru.1 … guru.10', menu: '10', catatan: 'Kelas Saya di Kurikulum + input nilai di modul Ujian.' },
  { peran: 'Bendahara', login: 'bendahara@nuha.pesantren.web.id', menu: '8', catatan: 'Tagihan, SPP, kas, penggajian.' },
  { peran: 'Poskestren', login: 'poskestren@nuha.pesantren.web.id', menu: '6', catatan: 'Periksa, rekam medis, stok obat.' },
  { peran: 'Musyrif Asrama', login: 'musyrif.b@nuha.pesantren.web.id', menu: '1', catatan: 'Belum diberi hak menu — atur lewat Pengaturan.' },
  { peran: 'Tata Usaha', login: 'tu.smp@nuha.pesantren.web.id', menu: '1', catatan: 'Akun nonaktif; belum diberi hak menu.' },
  { peran: 'Pengelola Sarpras', login: 'sarpras.yayasan · sarpras.smp · sarpras.ma', menu: '1', catatan: 'Menu Sarpras penuh; .smp/.ma dibatasi unitnya (UserUnit), .yayasan seluruh unit.' },
  { peran: 'Teknisi', login: 'teknisi.1', menu: '1', catatan: 'Sarpras: hanya tiket & pemeliharaan yang ditugaskan kepadanya.' },
  { peran: 'Pegawai / Staf', login: 'pegawai.1', menu: '1', catatan: 'Sarpras: Aset (ruang PIC/aset yang dipegang, tanpa harga), Peminjaman, Kerusakan.' },
  { peran: 'Admin SDM', login: 'sdm', menu: '1', catatan: 'Rekrutmen.' },
  { peran: 'Santri', login: 'santri.<NIS>', menu: '1', catatan: '16 akun; hanya Portal Santri, baca-saja.' },
  { peran: 'Wali Santri', login: 'wali.<NIS>', menu: '1', catatan: '16 akun; hanya Portal Wali.' },
];

export const BAGIAN: Bagian[] = [
  {
    id: 'masuk',
    judul: 'Masuk ke sistem',
    ringkas:
      'Satu pintu untuk semua peran. Staf memakai alamat surel, santri dan wali memakai nama pengguna berbasis NIS. Peran tidak dipilih saat masuk — sistem membacanya dari basis data.',
    langkah: [
      { judul: 'Buka halaman masuk', detail: 'Alamat /login. Segmented Staf / Wali / Santri hanya mengubah label dan contoh, bukan cara autentikasinya.' },
      { judul: 'Isi identitas dan kata sandi', detail: 'Identitas boleh surel maupun nama pengguna; keduanya diperiksa ke kolom yang sama.' },
      { judul: 'Sistem menyusun sesi', detail: 'Berhasil masuk menaruh JWT di kuki httpOnly berumur 8 jam, lalu mengarahkan ke beranda sesuai peran.' },
    ],
    gambar: [{ file: 'login.png', caption: 'Formulir masuk — satu jalur untuk staf, wali, dan santri.' }],
    catatan: 'Sandi seluruh akun contoh: Nuha2026! — ganti sebelum dipakai sungguhan.',
  },
  {
    id: 'peran',
    judul: 'Peran dan hak akses',
    ringkas:
      'Menu yang tampil bukan daftar tetap di dalam kode, melainkan hasil pemetaan peran → menu di basis data. Menambah hak akses cukup lewat Pengaturan, tanpa membangun ulang aplikasi.',
    langkah: [
      { judul: 'Pengguna memegang satu peran atau lebih', detail: 'Tabel user_peran menghubungkan akun dengan peran.' },
      { judul: 'Peran memegang menu', detail: 'Tabel menu_peran menentukan menu apa saja yang boleh dibuka.' },
      { judul: 'Setiap halaman memeriksa sendiri', detail: 'requirePage(<menu>) berjalan di server: tanpa sesi dilempar ke /login, tanpa hak dilempar ke beranda. Menyembunyikan menu saja tidak dianggap cukup.' },
    ],
    gambar: [{ file: 'dashboard-superadmin.png', caption: 'Dasbor super admin dengan seluruh 17 menu.' }],
  },
  {
    id: 'samaran',
    judul: 'Melihat aplikasi sebagai peran lain',
    ringkas:
      'Super admin dapat menyamar untuk menelusuri keluhan pengguna tanpa meminta kata sandi siapa pun. Peran asli disimpan terpisah sehingga penyamaran selalu bisa dibatalkan.',
    langkah: [
      { judul: 'Pilih peran di kanan atas', detail: 'Dropdown "Lihat sebagai" hanya muncul untuk super admin.' },
      { judul: 'Tekan Terapkan', detail: 'Sesi ditulis ulang: peran efektif berganti, peran asli disimpan di kolom terpisah, dan halaman kembali ke beranda karena menu ikut berubah.' },
      { judul: 'Kembali ke peran asli', detail: 'Pilih "Super admin (peran asli)". Selama menyamar, banner kuning selalu terlihat agar tidak ada yang salah membaca layar.' },
    ],
    gambar: [{ file: 'pemilih-peran.png', caption: 'Pemilih peran di bilah atas.' }],
    catatan:
      'Server menolak permintaan ganti peran dari siapa pun yang peran aslinya bukan super admin — dropdown yang tersembunyi bukan pengaman. Setiap pergantian tercatat di audit sebagai GANTI_PERAN.',
  },
  {
    id: 'induk',
    judul: 'Data induk santri',
    ringkas:
      'Data Induk menghubungkan daftar santri dengan satu profil lintas akademik, kepesantrenan, kesehatan, keuangan, dan wali. Penyaring serta santri yang dipilih tersimpan di alamat halaman sehingga tampilan dapat dibagikan atau dibuka kembali.',
    langkah: [
      { judul: 'Cari dan saring daftar', detail: 'Ketik nama, NIS, atau NISN lalu tekan Cari. Status, jenis kelamin, dan angkatan bisa dipilih melalui chip; pilihan yang aktif muncul sebagai chip bertanda × untuk dicopot satuan.' },
      { judul: 'Pilih lembaga lebih dulu', detail: 'Baris tab paling atas memisahkan SMP, MA, dan Madin karena ketiganya organisasi yang berbeda; angka di tiap tab adalah jumlah santri di lembaga itu. Pilihan lembaga bertahan saat berpindah tab profil, dan tab "Semua lembaga" mengembalikan tampilan lintas lembaga.' },
      { judul: 'Kenali lembaga tiap baris', detail: 'Pada tab "Semua lembaga", setiap baris hasil diberi penanda lembaganya. Santri yang terdaftar di dua lembaga — misalnya sekolah di SMP sekaligus mengaji di Madin — menampilkan kedua penanda. Penanda ini disembunyikan begitu satu lembaga dipilih, karena saat itu semua baris berlembaga sama.' },
      { judul: 'Telusuri tingkat dan kelas', detail: 'Panel Tingkat & kelas memuat jenjang di dalam lembaga yang sedang aktif, jadi pilih lembaga di tab atas lebih dulu. Panel ini dan tab lembaga saling tersinkron karena keduanya menulis penyaring yang sama.' },
      { judul: 'Buka profil santri', detail: 'Pilih satu nama untuk membuka profil dan tab detailnya. Daftar hasil memakai halaman agar tetap cepat ketika jumlah santri bertambah.' },
      { judul: 'Baca biodata lengkap', detail: 'Tab Biodata memuat isian buku induk: nama, tempat & tanggal lahir, jenis kelamin, NIK, No. KK, alamat, anak ke-berapa dari berapa saudara, hobi, cita-cita, no. HP, asal sekolah, dan tahun masuk. Kolom yang belum diisi operator ditampilkan sebagai tanda hubung.' },
      { judul: 'Lihat riwayat jenjang', detail: 'Kartu Riwayat pendidikan di kolom kanan mencatat kelas dan tahun ajaran sebelumnya, sehingga santri yang naik kelas atau pindah jenjang tetap punya jejak kelas lamanya.' },
      { judul: 'Gunakan dari layar kecil', detail: 'Di ponsel, setelah profil dipilih hanya detail yang ditampilkan agar tidak terjepit. Gunakan tautan “‹ Kembali ke daftar” di atas profil untuk kembali ke hasil pencarian.' },
    ],
  },
  {
    id: 'akademik',
    judul: 'Menjelajah data akademik',
    ringkas:
      'Modul Akademik menyatukan 87 santri dua lembaga di balik satu penjelajah bertingkat: Semua pesantren → SMP/MA/Pondok → tingkat → kelas. Penyaring yang dipilih berlaku untuk keempat tab sekaligus dan tersimpan di URL, jadi satu tautan cukup untuk membagikan tampilan yang persis sama.',
    langkah: [
      { judul: 'Pilih lembaga', detail: 'Chip Lembaga menampilkan SMP, MA, dan Pondok beserta cacah santrinya. Cacah itu sudah menghormati penyaring lain yang sedang aktif — angka di chip = jumlah yang benar-benar didapat kalau chip itu diklik.' },
      { judul: 'Turun ke tingkat lalu kelas', detail: 'Baris Tingkat muncul setelah lembaga dipilih, baris Kelas setelah tingkat dipilih. Tiap langkah hanya memperlihatkan pilihan yang relevan, bukan seluruh rombel sekaligus.' },
      { judul: 'Mundur lewat remah roti', detail: 'Jalur "Semua pesantren › SMP › Tingkat 7 › Kelas 7A" di atas chip bisa diklik untuk naik satu tingkat tanpa kehilangan penyaring lain.' },
      { judul: 'Penyaring lanjutan', detail: 'Pencarian nama/NIS/NISN, status, jenis kelamin, program, angkatan, asrama, dan urutan. Pilihan program, angkatan, dan asrama diambil dari data yang benar-benar ada, jadi tidak ada pilihan yang hasilnya nol.' },
      { judul: 'Copot penyaring satu per satu', detail: 'Tiap penyaring aktif tampil sebagai chip bertanda ×; ada pula "Bersihkan semua" beserta jumlah penyaring yang sedang menyala.' },
      { judul: 'Berlaku lintas tab', detail: 'Penjelajah yang sama dipakai tab Siswa, Presensi, Nilai, dan Rapor. Dropdown rombel di tab Nilai dan Rapor ikut menyempit mengikuti lembaga dan tingkat yang sedang dipilih.' },
    ],
    catatan:
      'Rombel bernama sama di tahun ajaran berbeda — data warisan punya dua "7A" — diberi keterangan tahun ajarannya agar dua chip tidak tampak kembar. Sembilan menu (Kurikulum, Poskestren, Keuangan, LMS, Penggajian, Ujian, Kunjungan Wali, PPDB, Laporan) untuk sementara disembunyikan dari sidebar atas permintaan client; hak aksesnya tidak dicabut, jadi peran yang berhak masih bisa membuka URL-nya langsung.',
  },
  {
    id: 'guru',
    judul: 'Alur guru',
    ringkas:
      'Guru melihat kelas yang benar-benar diampunya, dikelompokkan per unit — seorang guru lazim mengajar di SMP dan MA sekaligus, bahkan merangkap ustadz diniyah di pondok. Yang menentukan bukan jabatan di kepegawaian, melainkan kecocokan namanya pada jadwal pelajaran.',
    langkah: [
      { judul: 'Masuk sebagai guru', detail: 'Akun guru.1 sampai guru.10, satu untuk tiap pengajar di jadwal.' },
      { judul: 'Buka Kurikulum → Kelas Saya', detail: 'Kartu muncul per kombinasi kelas dan mata pelajaran, dikelompokkan per unit (SMP, MA, Pondok Pesantren).' },
      { judul: 'Badge peran', detail: 'Wali Kelas bila namanya terdaftar sebagai wali kelas itu; Ustadz Diniyah bila jam mengajarnya berada di unit pondok.' },
      { judul: 'Isi tiap kartu', detail: 'Jumlah siswa, JP per pekan, hari mengajar, KKM, kelengkapan input nilai beserta rerata, rincian presensi hari ini, dan sesi ujian terdekat yang belum selesai dinilai.' },
      { judul: 'Tombol aksi', detail: 'Input nilai dan Presensi menuju Akademik; Nilai ujian menuju modul Ujian.' },
    ],
    gambar: [{ file: 'guru-kelas-saya.png', caption: 'Kelas Saya untuk Bu Dwi Astuti — mengampu di MA, SMP, dan merangkap ustadzah diniyah di pondok.' }],
    catatan:
      'Kelas yang belum berisi santri ditandai jelas pada kartunya; presensi dan nilai baru bisa diisi setelah santri dimasukkan lewat Master Data.',
  },
  {
    id: 'ujian',
    judul: 'Manajemen ujian',
    ringkas:
      'Gelombang ujian (UTS/UAS) disusun per unit oleh kepala unit, sementara guru mengisi nilai sesi mata pelajaran yang diampunya. Nilai ujian per sesi disimpan terpisah dari rekap rapor.',
    langkah: [
      { judul: 'Gelombang Ujian', detail: 'Kepala unit dan ketua memindahkan status Draf → Berjalan → Selesai. Kemajuan penilaian dihitung dari nilai yang masuk dibanding jumlah peserta seluruh sesi.' },
      { judul: 'Kartu Ujian', detail: 'Seluruh sesi satu gelombang: tanggal, waktu, durasi, ruang, pengawas, dan jumlah yang sudah dinilai. Guru hanya melihat sesi mapel yang diampunya.' },
      { judul: 'Input Nilai', detail: 'Guru memilih sesi lalu mengisi nilai 0–100 per santri. Santri yang tidak hadir tetap tersimpan barisnya dengan nilai 0 — ketidakhadiran adalah fakta yang perlu tercatat.' },
      { judul: 'Penguncian', detail: 'Gelombang berstatus Selesai mengunci formulir nilainya karena angkanya sudah dipakai rapor. Membukanya kembali harus lewat kepala unit.' },
    ],
    gambar: [{ file: 'ujian-input-nilai.png', caption: 'Input nilai sesi ujian oleh guru pengampu.' }],
    catatan:
      'Setiap perubahan status gelombang dan penyimpanan nilai digerbangi menu ujian di server serta dicatat ke audit log (UBAH_STATUS_UJIAN, SIMPAN_NILAI_UJIAN).',
  },
  {
    id: 'cbt',
    judul: 'Ujian berbasis komputer (CBT)',
    ringkas:
      'Selain gelombang ujian di atas, sesi ujian dapat dikerjakan langsung di komputer. Bank soal, paket, sesi, pengawasan, dan kartu peserta berada pada satu modul; skor akhirnya tetap mengalir ke nilai ujian sehingga rapor memakai satu sumber angka.',
    langkah: [
      { judul: 'Bank Soal', detail: 'Butir soal enam tipe: pilihan ganda, pilihan ganda kompleks, benar–salah, menjodohkan, isian singkat, dan esai. Soal AKM memakai stimulus bersama. Guru hanya melihat butir mapel yang diampunya — kunci mapel lain tidak pernah dikirim ke layarnya.' },
      { judul: 'Sesi CBT', detail: 'Peserta diterbitkan dari anggota kelas (idempoten, aman dijalankan ulang). Token enam huruf tanpa vokal mirip angka, ditutup dari layar kecuali saat sesi berjalan, dan dapat diputar sewaktu-waktu tanpa mengganggu yang sudah masuk.' },
      { judul: 'Mengerjakan', detail: 'Peserta masuk dengan token. Urutan soal diacak sekali lalu disimpan, jadi refresh atau pindah perangkat tidak mengubah susunannya. Jawaban tersimpan otomatis setiap perubahan; butir boleh ditandai ragu-ragu.' },
      { judul: 'Proteksi anti-curang', detail: 'Server memeriksa token, jendela waktu, dan kunci zona jaringan (awalan IP). Pindah tab, keluar layar penuh, salin–tempel, dan layar terbagi terdeteksi lalu dilaporkan; server yang menghitung dan membekukan sesi setelah batas pelanggaran terlampaui.' },
      { judul: 'Pengawasan', detail: 'Pengawas melihat kemajuan, skor, theta, dan jejak pelanggaran tiap peserta, serta membuka kembali sesi yang dibekukan. Pembekuan tidak pernah dibatalkan otomatis — keputusan pengawas masuk audit.' },
      { judul: 'Penilaian esai', detail: 'Butir esai menunggu nilai guru; autosave peserta tidak pernah menimpanya dengan nol. Setiap esai yang dinilai memicu perhitungan ulang skor peserta.' },
      { judul: 'Analisis butir dan IRT', detail: 'Setelah sesi selesai, tingkat kesukaran (p) dan daya beda (D) dihitung dari kelompok 27% atas dan bawah, lalu dikalibrasi ke parameter IRT tiga parameter (a, b, c). Kemampuan peserta (theta) diduga dengan pencarian kemungkinan maksimum. Analisis menolak berjalan di bawah empat responden — lebih baik tanpa angka daripada angka yang tak bisa dipercaya.' },
      { judul: 'Kartu Ujian', detail: 'Kartu siap cetak satu per peserta, sengaja tanpa token: kartu dibagikan jauh-jauh hari, sedangkan token diumumkan pengawas saat sesi dibuka.' },
    ],
    catatan:
      'Identitas peserta selalu diambil dari sesi login, tidak pernah dari formulir — tanpa itu siapa pun bisa mengirim jawaban atau melaporkan pelanggaran atas nama orang lain. Aksi CBT dicatat ke audit log (MULAI_CBT, SELESAI_CBT, BEKUKAN_CBT, NILAI_ESAI_CBT, ANALISIS_BUTIR_CBT, PUTAR_TOKEN_CBT).',
  },
  {
    id: 'wa-perangkat',
    judul: 'Menautkan nomor WhatsApp',
    ringkas:
      'Pesan dikirim dari nomor WhatsApp sungguhan milik pondok. Nomor ditautkan sekali lewat pemindaian QR; kredensialnya disimpan gateway sehingga bertahan melewati mulai ulang.',
    langkah: [
      { judul: 'Buka Notifikasi WA → Perangkat', detail: 'Hanya peran yang memegang menu wa yang bisa membukanya.' },
      { judul: 'Daftarkan nomor', detail: 'Isi nama perangkat dan nomor, lalu tekan Daftarkan. Nomor dinormalkan ke format 62.' },
      { judul: 'Tampilkan QR dan pindai', detail: 'Di ponsel: WhatsApp → Perangkat Tertaut → Tautkan perangkat. QR hanya berlaku beberapa detik; muat ulang halaman bila kedaluwarsa.' },
      { judul: 'Status berubah jadi Terhubung', detail: 'Sejak itu pesan dikirim melalui nomor tersebut. Tombol Putuskan mengakhiri sesi tanpa menghapus perangkat.' },
    ],
    gambar: [{ file: 'wa-perangkat.png', caption: 'Tab Perangkat dengan satu nomor menunggu ditautkan.' }],
    catatan:
      'Selama WA_DRY_RUN bernilai true, pesan hanya dicatat ke log dan tidak benar-benar terkirim. Setel ke false hanya setelah nomor tertaut dan penerimanya sudah pasti benar.',
  },
  {
    id: 'wa-pesan',
    judul: 'Template dan pemicu pesan',
    ringkas:
      'Isi pesan tinggal di basis data, bukan di kode. Setiap template punya kode, kelompok penerima, dan peubah dalam kurung ganda yang diisi saat pengiriman.',
    langkah: [
      { judul: 'Template', detail: 'Aktif atau nonaktifkan per skenario tanpa menyentuh kode.' },
      { judul: 'Pemicu otomatis', detail: 'Baris pemicu dihitung dari keadaan nyata — tagihan jatuh tempo, izin, penggajian.' },
      { judul: 'Log pengiriman', detail: 'Setiap upaya tercatat lengkap dengan status, id pesan, dan alasan gagal, serta masuk audit log.' },
    ],
    gambar: [{ file: 'wa-template.png', caption: 'Daftar template beserta kelompok penerimanya.' }],
  },
  {
    id: 'keuangan',
    judul: 'Keuangan dan penggajian',
    ringkas:
      'Tagihan, pembayaran, dan kas berada di satu modul. Slip gaji yang sudah dibayar tidak dapat disunting diam-diam: revisinya menghasilkan jejak audit tersendiri.',
    langkah: [
      { judul: 'Tagihan dan SPP', detail: 'Status Lunas, Cicil, dan Menunggak dibedakan warna badge.' },
      { judul: 'Rekap dan tunggakan', detail: 'Agregat dihitung dari transaksi, bukan angka tetap.' },
      { judul: 'Penggajian', detail: 'Slip diterbitkan, dibayar, lalu bila perlu direvisi — tiap tahap tercatat.' },
    ],
    gambar: [{ file: 'keuangan-tagihan.png', caption: 'Modul keuangan dilihat oleh bendahara.' }],
  },
  {
    id: 'portal',
    judul: 'Portal santri dan wali',
    ringkas:
      'Dua portal terpisah dengan hak baca-saja yang ditegakkan di server. Santri tidak dapat mengubah nilai atau presensinya sendiri.',
    langkah: [
      { judul: 'Portal Wali', detail: 'Mobile-first: ringkasan, hafalan, kesehatan, tagihan, pembayaran, riwayat SPP, kunjungan, izin.' },
      { judul: 'Portal Santri', detail: 'Beranda, pengumuman, jadwal, diniyah, LMS, tugas, ujian CBT, hafalan, izin, pembayaran, kartu santri.' },
    ],
    gambar: [
      { file: 'portal-wali.png', caption: 'Portal wali pada lebar ponsel.' },
      { file: 'portal-santri.png', caption: 'Portal santri dengan dock navigasi di bawah.' },
    ],
    catatan:
      'Ke-76 santri kini punya baris relasi wali utama, sehingga tab Wali & Keluarga dan pemicu notifikasi selalu menemukan kontak. Tiga santri belum memiliki akun portal wali (73 dari 76) karena kontak walinya belum lengkap — dilengkapi lewat Master Data.',
  },
  {
    id: 'publik',
    judul: 'Halaman publik dan PPDB',
    ringkas:
      'Tamu tanpa sesi masuk ke halaman publik, bukan dinding masuk. Pendaftaran berjalan penuh di dalam aplikasi, tidak lagi menumpang formulir luar.',
    langkah: [
      { judul: 'Beranda dan profil pondok', detail: 'Angka pada beranda diambil dari agregat basis data.' },
      { judul: 'Wizard PPDB lima langkah', detail: 'Validasi NISN sepuluh digit, nomor ponsel, minimal satu unit, dan tiga berkas wajib.' },
      { judul: 'Nomor registrasi terbit', detail: 'Berformat PPDB-<tahun>-<urut>, berurutan, bukan acak.' },
      { judul: 'Cek status', detail: 'Nomor registrasi dilacak lewat linimasa empat tahap.' },
    ],
    gambar: [
      { file: 'publik-beranda.png', caption: 'Beranda publik dengan angka dari agregat basis data.' },
      { file: 'publik-ppdb.png', caption: 'Langkah pertama wizard PPDB.' },
      { file: 'publik-cek-status.png', caption: 'Cek status pendaftaran lewat nomor registrasi.' },
    ],
  },
  {
    id: 'kelola-data',
    judul: 'Master Data & relasi wali',
    ringkas:
      'CRUD data operasional per modul, dengan hak akses menu yang sama. Relasi wali↔santri tidak berhalaman sendiri: ditunjuk langsung dari bagian "Peran" pada form identitas orang, baik saat menambah maupun mengubah.',
    langkah: [
      { judul: 'Cari entitas dari kotak di /data', detail: 'Kotak pencarian di atas /data menyaring kartu persona dan modul berdasarkan labelnya begitu diketik, tanpa memuat ulang halaman. Kelompok yang tidak ada hasilnya ikut disembunyikan; kalau tidak ada satupun yang cocok, tampil pesan "Tidak ada data yang cocok".' },
      { judul: 'Pintasan per peran (santri, guru, staf, wali)', detail: 'Kelompok "Data per peran" di kepala halaman /data memberi satu halaman CRUD per persona: /data/santri-orang, /data/guru-orang, /data/staf-orang, /data/wali-orang. Keempatnya menulis ke tabel orang yang sama seperti Identitas orang — bedanya perannya sudah dikunci, jadi tidak ada lagi kotak centang peran yang perlu diisi, dan daftarnya hanya memuat orang yang memang berperan itu (santri = punya baris santri; guru = pegawai yang jabatannya memuat "Guru"; staf = pegawai selain itu; wali = punya relasi wali). Field peran ikut langsung di formnya: NIS dan daftar wali pada Santri, NIP/jabatan/tugas tambahan pada Guru dan Staf, daftar santri yang diwalikan pada Wali. Menambah lewat sini membuat identitas dan baris perannya sekaligus; menghapus menghapus identitas orangnya (baris peran ikut terhapus lewat cascade), jadi untuk sekadar menonaktifkan pakai toggle "Status keaktifan". Pada persona Wali, minimal satu santri wajib dipilih — status wali hanya ada sebagai relasi, jadi wali tanpa santri tidak akan muncul lagi di daftarnya sendiri. Halaman /data/santri (detail akademik) dan /data/pegawai (detail) tetap ada untuk kolom lanjutan seperti unit, kelas, kamar, rekening, dan jam mengajar.' },
      { judul: 'Identitas orang lebih dahulu', detail: 'Satu baris orang dipakai ulang oleh Santri, Kepegawaian, Wali, dan akun login — jangan digandakan per peran. Panel keterkaitan menunjukkan peran apa saja yang sudah melekat.' },
      { judul: 'Tentukan perannya saat menambah', detail: 'Bagian "Peran" pada form tambah identitas menentukan sekaligus modul tempat orang itu terdaftar: Santri (isi NIS & status), Guru atau Staf (NIP & jabatan — NIP dibuatkan otomatis bila dikosongkan), dan Wali murid. Pilihannya berupa kotak centang dan boleh lebih dari satu, karena satu orang memang bisa merangkap — santri yang sekaligus guru ngaji, atau guru yang juga wali dari santri lain; baris santri dan pegawai dibuat berdampingan untuk identitas yang sama. Tidak mencentang apa pun berarti identitasnya disimpan tanpa peran (dulu opsi "Belum ditentukan"). Guru dan Staf berbagi satu baris pegawai, jadi bila keduanya dicentang, jabatan Guru yang dipakai. Baris santri/pegawai/relasi wali dibuat otomatis dan dicatat ke audit (entitas orang_peran), jadi operator tidak perlu lagi menyalin ID Orang ke modul lain. Bagian ini juga muncul saat mengubah identitas: perannya terisi sesuai relasi yang sudah ada, dan mengubahnya memperbarui NIS/status atau NIP/jabatan pada baris yang ada — bukan membuat baris kedua. Peran lama tidak dicabut diam-diam saat pilihannya diganti, karena modul lain (nilai, presensi, penggajian) masih merujuknya; cabut lewat modul asalnya bila memang perlu.' },
      { judul: 'Jabatan vs tugas tambahan', detail: 'Untuk peran Guru/Staf ada dua isian yang sengaja dipisah. "Jabatan" menentukan kategori orang: filter Kategori pada /data/orang membaca siapa pun yang jabatannya memuat kata "Guru" sebagai guru, sisanya staf — jadi guru mapel tetap diisi "Guru Mapel". "Tugas tambahan / jabatan struktural" menampung jabatan dari SK (Waka Kurikulum, Wali Kelas 10, Kepala Perpustakaan, Plt. Kepala Madrasah). Keduanya metadata organisasi, bukan penentu hak akses menu — akses tetap diatur lewat peran RBAC. Menaruh jabatan struktural pada kolom "Jabatan" akan membuat guru yang bersangkutan terbaca sebagai staf.' },
      { judul: 'Relasi wali banyak-ke-banyak', detail: 'Saat memilih peran Santri, walinya bisa langsung ditunjuk — boleh lebih dari satu (ayah, ibu, wali lain), masing-masing dengan hubungannya. Sebaliknya saat memilih peran Wali murid, satu wali bisa sekaligus mewakili beberapa santri; daftar kandidatnya dibatasi ke orang yang memang sudah terdaftar sebagai santri. Pemilihnya bukan checkbox: klik pada kolomnya langsung memunculkan maksimal lima kandidat, mengetik menyaringnya, dan barisnya diklik untuk menambah. Wali pertama pada santri yang belum punya wali utama otomatis menjadi utama; wali utama yang sudah ada tidak diturunkan diam-diam. Saat mengubah, daftar wali/santri yang sudah tersimpan dimuat terisi; membuang satu barisnya benar-benar mencabut relasinya.' },
      { judul: 'Form dibuat ringkas', detail: 'Jenis kelamin dipilih lewat dua tombol ikon saja — biru untuk laki-laki, magenta untuk perempuan (namanya tetap terbaca pembaca layar dan tooltip). RT dan RW berbagi satu baris "RT / RW". Petunjuk di bawah input hanya disisakan pada field yang benar-benar rawan salah isi, dan panel "Terhubung ke modul lain" pindah ke bawah form supaya perhatian jatuh ke isian lebih dahulu.' },
      { judul: 'Tempat/tanggal lahir & pendidikan terakhir', detail: 'Grup "Identitas" memuat Tempat lahir dan Tanggal lahir (pemilih tanggal), keduanya opsional dan dipakai ulang oleh biodata santri. "Pendidikan terakhir" ada di grup "Data pribadi" — isian bebas (SD/SMP/SMA/S1), berguna untuk identitas guru, staf, maupun wali. Ketiganya melekat pada baris orang, jadi cukup diisi sekali dan terbaca oleh modul mana pun yang memakai identitas itu.' },
      { judul: 'Wali utama', detail: 'Penerima notifikasi WhatsApp dan pemegang akses portal wali. Wali pertama pada santri yang belum punya wali utama otomatis menjadi utama.' },
      { judul: 'Kelas menunjuk master datanya', detail: 'Di /data/kelas, Wali kelas dan Tahun pelajaran bukan lagi kolom ID yang diketik manual: keduanya dropdown yang menarik dari master datanya — wali kelas dari daftar pegawai (ditampilkan sebagai nama orangnya), tahun pelajaran dari tabel Tahun pelajaran (ditampilkan sebagai "2026/2027 Gasal", kode digabung semester). Tabelnya pun menampilkan nama, bukan angka ID, sama seperti kolom Unit. Kolom lama `wali_kelas` (teks bebas) tetap ada demi kompatibilitas, tapi sumber kebenarannya adalah relasi `wali_kelas_id`.' },
      { judul: 'Daftar santri: cari nama, saring, dan daftar kerja', detail: 'Halaman /data/santri dirombak agar terpakai tanpa hafal NIS. Kotak Cari sekarang ikut menyapu nama santri (sebelumnya hanya kolom milik tabel santri, sehingga mengetik nama selalu tidak ketemu), jadi "Hamdan" langsung menyaring daftarnya. Kolomnya kini Nama (dengan NIS sebagai baris kecil di bawahnya), JK, Unit, Kelas, Kamar, Status (badge hijau Aktif / netral Tidak aktif), dan Tahun masuk — kolom "ID Orang" dibuang karena itu nomor internal, dan NISN pindah ke form saja. Bilah filternya: Unit, Kelas, Kamar, Status, Jenis kelamin, dan Kelengkapan data. Status bawaannya Aktif, bukan "Semua", karena hampir semua pekerjaan menyangkut santri aktif; pilih "Semua" pada dropdown Status untuk memunculkan santri tidak aktif. Tombol Reset hanya muncul bila filternya menyimpang dari bawaan itu. Di atas bilah filter ada baris ringkasan yang setiap angkanya bisa diklik menjadi filter: Semua santri, Aktif, Tidak aktif, lalu tiga daftar kerja operator — Belum ada kelas, Belum ada kamar, dan Belum ada NIS. Kamar ditampilkan sebagai kode beserta nama asramanya. Field "ID Orang" hanya tampil saat menambah baris baru; saat mengubah, ia disembunyikan supaya tak ada risiko satu baris santri dipindah ke identitas orang lain.' },
      { judul: 'Profil kesehatan santri', detail: 'Master data kesehatan per santri di /data/profil-kesehatan (hak akses menu Poskestren): berat badan, tinggi badan, golongan darah, penyakit yang pernah diderita, alergi, kebutuhan khusus, dan catatan tambahan. Satu baris per santri — santrinya dipilih dari dropdown, bukan diketik ID-nya, dan tabel menolak profil kedua untuk santri yang sama. Sengaja dipisah dari Rekam medis: yang ini kondisi dasar yang jarang berubah, sedangkan rekam medis mencatat tiap kunjungan poskestren. Data hasil impor MA (BB/TB/riwayat/kebutuhan khusus) langsung tampil di sini.' },
    ],
  },
  {
    id: 'audit',
    judul: 'Jejak audit',
    ringkas:
      'Tindakan yang mengubah keadaan dicatat dengan pelaku, ringkasan, dan isi perubahannya — termasuk pergantian peran, pengiriman WhatsApp, dan perubahan perangkat.',
    langkah: [
      { judul: 'Apa yang dicatat', detail: 'Aksi, entitas, id entitas, ringkasan terbaca manusia, perubahan sebelum dan sesudah, pelaku, dan waktu.' },
      { judul: 'Di mana dilihat', detail: 'Menu Master Data untuk peran yang berwenang.' },
    ],
  },
  {
    id: 'rekrutmen',
    judul: 'Rekrutmen (lowongan kerja)',
    ringkas:
      'Pelamar mendaftar lewat halaman publik /karir tanpa perlu akun, mengunggah berkas asli (bukan simulasi), lalu bisa mengecek status seleksinya sendiri. Panel panitia untuk memproses lamaran menyusul di bagian berikutnya.',
    langkah: [
      { judul: 'Daftar lowongan', detail: '/karir menampilkan lowongan berstatus Open yang sedang dalam rentang tanggal buka–tutup, diambil langsung dari database.' },
      { judul: 'Detail & syarat', detail: '/karir/<kode> menampilkan deskripsi, persyaratan, fasilitas, dan daftar berkas yang perlu disiapkan sebelum melamar.' },
      { judul: 'Formulir lamaran', detail: '/karir/<kode>/daftar — wizard 4 langkah (Data Diri, Pendidikan & Pengalaman, Berkas, Pernyataan & Kirim). Berkas diunggah sungguhan dan divalidasi dari magic bytes (JPEG/PNG/PDF), disimpan lewat infrastruktur berkas bersama. Draf isian tersimpan di peramban pelamar supaya tidak hilang kalau tab tertutup.' },
      { judul: 'Nomor lamaran', detail: 'Format LMR-<tahun>-NNNN, berurutan per tahun. NIK yang sama tidak bisa melamar dua kali ke lowongan yang sama.' },
      { judul: 'Cek status', detail: '/karir/status menampilkan riwayat status lamaran (Terkirim, Diperiksa Berkas, dan seterusnya) berdasarkan nomor lamaran.' },
    ],
    catatan:
      'Anti-spam dasar pada formulir publik: kolom honeypot tersembunyi dan jebakan waktu (pengiriman kurang dari beberapa detik ditolak). Panel panitia ada di menu Rekrutmen (/rekrutmen): buat & setujui lowongan, verifikasi berkas, nilai per tahap, ubah status, dan konversi pelamar Hired jadi pegawai + akun. Sidebar menampilkan tautan cepat ke halaman karir publik di bawah menu Rekrutmen.',
  },
  {
    id: 'sarpras',
    judul: 'Sarana & Prasarana (aset)',
    ringkas:
      'Register aset tetap per unit pemilik dan lokasi, label QR, laporan kerusakan dari HP, peminjaman aset/ruang, pengadaan dan penghapusan berjenjang, pemeliharaan terjadwal, stock opname, penyusutan, serta laporan KIB/KIR/sumber dana. Tab yang tampil mengikuti izin: pegawai/guru hanya melihat Aset (ruang yang ia tanggung jawabi / aset yang ia pegang, tanpa harga), Peminjaman, dan Kerusakan.',
    langkah: [
      { judul: 'Lokasi', detail: 'Tab Lokasi menyusun pohon Kampus → Gedung → Lantai → Ruang/Area. Tombol "Bangkitkan dari data kelas & kamar asrama" membuat lokasi dari Kelas dan Room yang sudah ada. Tombol "KIR + QR" mencetak Kartu Inventaris Ruangan dengan QR pintu (/cetak/kir/<id>).' },
      { judul: 'Registrasi aset', detail: 'Tab Aset → "+ Registrasi aset". Kode inventaris NH/{UNIT}/{KATEGORI}/{TAHUN}/{URUT} dan token QR acak dibangkitkan otomatis (aman dari pendaftaran bersamaan). Aset lama bisa diimpor dari CSV (templat di tab Aset). Centang beberapa aset lalu "Cetak label QR" untuk label A4 24 per lembar.' },
      { judul: 'Lapor kerusakan', detail: 'Siapa pun yang login: menu Sarpras → "Lapor Kerusakan" di sidebar, atau pindai QR ruang (/r/<token>) / QR aset (/a/<token>) dari HP. Isi apa yang rusak, tingkat, foto. Tingkat Darurat memicu WA ke petugas sarpras (tunduk WA_DRY_RUN).' },
      { judul: 'Tangani tiket', detail: 'Tab Kerusakan: sarpras memverifikasi, menugaskan teknisi/vendor, dan menutup dengan biaya. Kondisi aset ikut berubah (Rusak Ringan/Berat → Dalam Perbaikan → kembali Baik & Aktif). Teknisi hanya bisa mengubah tiket yang ditugaskan kepadanya. Aset rusak ≥ 3 kali dalam 6 bulan ditandai kandidat penggantian.' },
      { judul: 'Peminjaman', detail: 'Tab Peminjaman: pilih aset yang bisa dipinjam dan/atau ruang (aula, lab, masjid, kelas), waktu mulai–selesai. Bentrok waktu ditolak di server. Sarpras menyetujui → menyerahkan → mencatat pengembalian beserta kondisi; bila rusak otomatis dibuat laporan kerusakan. Lewat batas → Terlambat (cron).' },
      { judul: 'Pengadaan', detail: 'Usulan → persetujuan berjenjang: kepala unit → bendahara, + ketua yayasan bila di atas ambang (bawaan Rp 5 jt, diatur di tab Master). Dana BOS/BOSP tidak lewat yayasan. Setelah dibeli & diterima, tiap barang otomatis jadi aset (per unit bila ≥ ambang kapitalisasi, kolektif bila di bawahnya).' },
      { judul: 'Pemeliharaan & opname', detail: 'Tab Pemeliharaan: jadwal berulang (servis AC, genset, APAR, pajak kendaraan, dll.) dengan pengingat H-N lewat cron; tugas terlewat merah. Tab Stock Opname: buka per unit/ruang, centang "Ada/Tidak ditemukan" per aset dari HP (tersimpan per baris), tutup → mutasi lokasi otomatis, kondisi diperbarui, yang tidak ditemukan ditandai Hilang.' },
      { judul: 'Penghapusan', detail: 'Usulan → verifikasi sarpras → kepala unit → ketua yayasan → dilaksanakan (status Dihapus, baris tidak dihapus). Aset wakaf/BOS wajib catatan + lampiran BA; aset wakaf ditandai "perlu keputusan nazhir".' },
      { judul: 'Laporan', detail: 'Tab Laporan: Buku Inventaris, KIB A–F, rekap sumber dana, rekap kondisi, kerusakan & biaya, nilai buku (penyusutan garis lurus), aset wakaf, data ruang, persediaan — semua CSV siap Excel.' },
    ],
    catatan:
      'Izin granular sarpras.* (17 izin) diberikan per peran sesuai 05-matriks-peran §6; cakupan unit ditegakkan di server (sarpras SMP tidak bisa mengubah aset MA walau form dimanipulasi). Ekspor dengan kolom persis templat Dapodik/EMIS menunggu berkas templat resmi — sementara pakai laporan "Data ruang". Harga & nilai buku hanya tampil bagi pemegang sarpras.view_value.',
  },
  {
    id: 'presensi',
    judul: 'Presensi harian',
    ringkas:
      'Presensi santri per sesi (sekolah, madin, jamaah Subuh, ngaji malam, apel kamar) diisi per rombel/asrama dengan default Hadir, presensi selfie guru & pegawai dengan GPS dan waktu server, izin/sakit pegawai, antrean tinjau atasan, dashboard, dan ekspor. Tab tampil sesuai izin: pegawai, bendahara, sarpras, teknisi hanya melihat "Presensi Saya".',
    langkah: [
      { judul: 'Input santri', detail: 'Tab "Input Siswa/Santri": pilih tanggal, sesi, rombel (atau asrama untuk sesi pondok). Semua otomatis Hadir; klik H/S/I/A/T hanya untuk pengecualian lalu Simpan — satu transaksi, satu entri audit per rombel. Guru hanya melihat rombel yang ia wali-kelasi, ajar hari itu, atau saat piket; musyrif hanya asrama yang ia pegang.' },
      { judul: 'Izin & Poskestren otomatis', detail: 'Santri dengan izin pondok disetujui (hingga tanggal kembali) otomatis Izin; rekam medis dengan tindak lanjut Istirahat/Rawat/Rujuk otomatis Sakit. Status ini tidak bisa ditimpa guru — hanya pemegang presensi.override (kepala unit, pengasuh, ketua, poskestren).' },
      { judul: 'Penguncian', detail: 'Presensi bisa diubah sampai 23.59 WIB hari itu. Setelahnya terkunci; kepala unit/pengasuh/ketua (presensi.lock) bisa mengubah dengan alasan wajib, dicatat sebelum/sesudah di audit.' },
      { judul: 'Presensi Saya (selfie)', detail: 'Menu Presensi → "Presensi Saya" di sidebar. Kamera depan terbuka langsung (tanpa unggah galeri), lokasi GPS dibaca, foto dikompres di HP lalu server menempel nama + waktu server + unit. Di luar radius (bawaan 150 m) tetap boleh dengan alasan dan masuk antrean tinjau. Terlambat = lewat jam masuk + toleransi (bawaan 07.00, 15 menit; pulang 14.00, Jumat 11.00). Tombol berubah jadi Check-out setelah check-in.' },
      { judul: 'Izin pegawai & tinjau', detail: 'Pegawai mengajukan Sakit/Izin/Cuti/Dinas luar (lampiran opsional). Tab "Perlu Ditinjau" (kepala unit untuk pegawai unitnya, SDM, ketua): setujui izin → hari-harinya otomatis terisi; tinjau presensi luar lokasi / GPS tidak akurat dengan foto selfie berdampingan foto profil dan tautan peta.' },
      { judul: 'Dashboard & laporan', detail: 'Tab Dashboard: siswa (% hadir, komposisi, tren 30 hari, rombel terendah, alpa terbanyak, rombel yang belum mengisi) dan pegawai (sudah/belum check-in, terlambat, tren tepat waktu, rata-rata menit terlambat per unit, galeri selfie). Tab Laporan: CSV rekap bulanan santri per rombel dan pegawai (bahan laporan, bukan potongan gaji otomatis).' },
      { judul: 'Portal', detail: 'Portal wali dan portal santri punya tab Presensi berupa kalender bulanan berwarna. Dashboard utama menampilkan kartu kehadiran santri hari ini, pegawai yang sudah check-in, dan kerusakan sarpras terbuka.' },
    ],
    catatan:
      'Cron (scripts/cron.ts): isi otomatis Izin/Sakit, tandai Alpa pegawai yang tidak check-in sampai jam pulang (kecuali libur, izin, atau guru yang hari itu tidak punya jadwal mengajar), WA ke wali bila santri Alpa di sesi sekolah (sekali per hari, batas terlambat + 60 menit, tunduk WA_DRY_RUN), hapus foto presensi > 90 hari (baris tetap). Foto presensi hanya bisa dibuka pemiliknya, kepala unit pegawai itu, SDM, dan ketua. Kamera & GPS butuh HTTPS di produksi. Pengaturan (sesi, jam kerja per unit, hari libur, titik & radius unit) di tab Pengaturan (presensi.setting: ketua, SDM).',
  },
  {
    id: 'izin-peran',
    judul: 'Izin per peran & reset sandi',
    ringkas:
      'Pengaturan → "Izin per peran" menampilkan matriks peran × izin per modul (presensi, sarpras, rekrutmen, dan modul lama). Pengaturan → "Pengguna & peran" kini punya tombol Reset sandi dan Aktifkan/Nonaktifkan.',
    langkah: [
      { judul: 'Ubah matriks', detail: 'Pilih modul, centang/hapus centang lalu "Simpan matriks". Berlaku pada request berikutnya pengguna terkait; daftar izin yang ditambah/dicabut dicatat di audit. Super admin tidak ditampilkan karena selalu lolos semua izin.' },
      { judul: 'Reset sandi', detail: 'Sandi sementara acak ditampilkan SEKALI di layar admin (tidak lewat URL/log), seluruh sesi lama pengguna dicabut, dan pengguna wajib mengganti sandi saat masuk.' },
      { judul: 'Nonaktifkan akun', detail: 'Menonaktifkan akun juga mencabut sesi yang sedang berjalan.' },
    ],
  },
];

export const OPERASIONAL: { judul: string; isi: string }[] = [
  {
    judul: 'Menjalankan',
    isi: 'docker compose up -d --build dari apps/web-nuha. Layanan: nuha-mysql, wa-gateway, nuha-migrate (sekali jalan: migrasi + seed), dan nuha-app.',
  },
  {
    judul: 'Variabel wajib',
    isi: 'AUTH_SECRET minimal 32 karakter, dan WA_GATEWAY_ACCOUNT_TOKEN untuk mengelola perangkat WhatsApp — bangkitkan dengan openssl rand -hex 24. Tanpa keduanya, compose menolak berjalan.',
  },
  {
    judul: 'Variabel WhatsApp lain',
    isi: 'WA_DRY_RUN (bawaan true) menahan pengiriman sungguhan. WA_GATEWAY_TOKEN boleh dikosongkan: pengirim akan memakai perangkat pertama yang berstatus terhubung, sehingga menautkan nomor lewat QR langsung membuat pengiriman jalan tanpa mengubah env.',
  },
  {
    judul: 'Ketahanan data',
    isi: 'Kredensial WhatsApp tinggal di volume nuha_simterpadu_wa_data. Menghapus volume itu berarti semua nomor harus dipindai ulang.',
  },
  {
    judul: 'Jaringan',
    isi: 'Gateway tidak dipetakan ke port host — hanya aplikasi yang memanggilnya lewat jaringan compose, jadi tidak perlu aturan firewall baru.',
  },
];
