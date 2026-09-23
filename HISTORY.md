# Riwayat Perubahan — web-nuha

## 2026-09-23 — Navigasi publik: tautan Karir

- `app/(publik)/layout.tsx`: menu atas & mobile menambah "Karir" (/karir);
  footer Layanan menambah "Lowongan Kerja (Karir)" dan "Cek Status Lamaran".
  Sebelumnya halaman karir publik hanya bisa dicapai lewat URL langsung.

## 2026-09-23 — Fase A sisa: matriks izin per peran + reset sandi oleh admin

- `/pengaturan?tab=izin`: matriks peran × izin per modul (checkbox), simpan =
  sinkron `RolePermission` untuk modul itu; super admin tidak ditampilkan.
  Diff (ditambah/dicabut) dicatat di audit `IZIN_MATRIKS_UBAH`.
- `/pengaturan?tab=pengguna`: tombol **Reset sandi** (sandi sementara acak
  ditampilkan sekali lewat hasil Server Action — tidak lewat URL/log;
  `mustChangePassword=true`, `sessionVersion` naik → semua sesi lama dicabut)
  dan **Aktifkan/Nonaktifkan** (juga mencabut sesi).
- Verifikasi: `tests/e2e/pengaturan.spec.ts` (sesi lama sdm tercabut setelah
  reset, sandi sementara memaksa ke /akun/sandi; matriks diubah lalu
  dikembalikan, dicek ke DB & audit).

## 2026-09-23 — Modul Presensi (C + C2): input santri, selfie pegawai, tinjau, dashboard

Mengimplementasikan plan `02-presensi-harian-dashboard.md` dan melepas menu
`presensi` dari `MENU_DISEMBUNYIKAN` — tampil untuk 12 peran, dengan tautan
cepat "Presensi Saya" di sidebar.

- Skema (migrasi `20260923140000_presensi`): `AttendanceSession` (master
  sesi, bitmask hari), `WorkSchedule`, `Holiday`, `StaffLeave`; kolom baru
  `Attendance.source/recordedBy`, `StaffAttendance` (checkInAt/Out waktu
  server, foto, lat/lng/akurasi/jarak, unit, luar lokasi + alasan, GPS tidak
  akurat, pulang cepat, menit terlambat, tinjauan), `Unit.radiusPresensiM`,
  `LeavePermit.expectedReturnAt`, `MedicalRecord.followUpStatus`,
  `Dormitory.supervisorStaffId`; indeks tanggal.
- Seed: 8 izin `presensi.*` sesuai 05 §4, 5 sesi bawaan (02 §2.1), jam kerja
  bawaan 06 P3, templat WA `PRESENSI_ALPA`; `prisma/seed-presensi.ts` (demo:
  koordinat unit, guru.1–3 ditautkan ke data pegawai, rombel 7A/10A + 16
  santri, asrama Al-Fatih dipegang musyrif.1).
- **Perbaikan penting seed izin**: `seedIzinTingkatAksi` memberi `<menu>.view`
  ke semua peran pemilik menu → pegawai sempat punya `presensi.view`.
  `seedIzinGranular` kini menyinkronkan (mencabut peran di luar matriks 05).
- `/presensi`: tab Dashboard, Input Siswa/Santri, Presensi Saya (kamera
  getUserMedia tanpa unggah galeri + GPS; overlay nama/waktu server/unit via
  sharp), Perlu Ditinjau, Laporan (CSV bulanan), Pengaturan (sesi, jam kerja,
  libur, titik & radius). Penguncian H+1 (`presensi.lock` + alasan, audit
  sebelum/sesudah); IZIN/POSKESTREN terlindung (`presensi.override`).
- Privasi: `/berkas/[id]` domain presensi hanya untuk pemilik, atau pemegang
  `presensi.review` yang unitnya mencakup pegawai tersebut.
- Cron `sapuPresensi()`: isi otomatis Izin/Sakit, Alpa pegawai setelah jam
  pulang (kecuali libur/izin/guru tanpa jadwal hari itu), WA alpa ke wali via
  `NotificationQueue` (sekali/hari, WA_DRY_RUN), retensi foto 90 hari.
- Portal wali & santri: tab Presensi (kalender bulanan berwarna). Dashboard
  utama: kartu kehadiran santri hari ini, pegawai check-in, kerusakan terbuka.
- UI umum: `.btn-sekunder` kini tombol utuh tanpa perlu `.btn`;
  `FormKeputusan` dipindah ke `components/molecules`; `angka()` tidak lagi
  membuang titik desimal (koordinat/luas m² sempat terbaca salah).
- Verifikasi: `tests/presensi.test.ts` (WIB, bitmask sesi, geofence,
  terlambat/pulang cepat, penguncian — 9 lulus); `tests/e2e/presensi.spec.ts`
  7 skenario dengan kamera & GPS palsu (dalam radius, luar radius + alasan +
  tinjau SDM, izin lokasi ditolak, foto pegawai lain → 403, rombel bukan
  miliknya → ditolak, ubah presensi terkunci → ditolak, izin pegawai →
  presensi terisi, ekspor dibatasi peran). Seluruh suite Playwright 19/19.
- Belum: sumber RFID (plan terpisah), input `followUpStatus` di form
  Poskestren & `expectedReturnAt` di form izin pondok (menu masih disembunyikan).

## 2026-09-23 — Modul Sarpras (C + C2): aset, QR, kerusakan, peminjaman, pengadaan, opname, penghapusan

Mengimplementasikan plan `04-aset-sarpras.md` dan melepas menu `sarpras` dari
`MENU_DISEMBUNYIKAN` — menu kini tampil di sidebar untuk 11 peran, dengan
tautan cepat "Lapor Kerusakan" dan "Pinjam Aset / Ruang" di bawahnya.

- Skema (migrasi `20260923090000_sarpras`): `AssetLocation` (pohon lokasi +
  `qrToken`), `AssetCategory` (golongan KIB A–F), `FundingSource`, `Vendor`,
  `Asset`, `AssetFile`, `AssetMovement`, `AssetLoan(+Item)`, `DamageReport`,
  `MaintenanceTask`, `StockOpname(+Line)`, `AssetDisposal(+Item)`,
  `ApprovalStep` (persetujuan berjenjang polimorfik), `Procurement(+Item)`,
  `ConsumableItem/Movement` (barang habis pakai), dan `AppSetting`
  (key-value; ambang pengadaan & kapitalisasi disimpan di sini, bukan konstanta).
- Seed: 17 izin `sarpras.*` sesuai 05 §6, 25 kategori, 8 sumber dana, ambang
  bawaan; `prisma/seed-sarpras.ts` (idempoten) menambah akun uji peran baru
  (`sdm`, `sarpras.yayasan`, `sarpras.smp`, `sarpras.ma`, `teknisi.1`,
  `musyrif.1`, `pegawai.1` — sandi `Nuha2026!`, wajib ganti di login pertama)
  + data demo lokasi, 13 aset, tugas pemeliharaan, 1 laporan darurat.
- `/sarpras` 11 tab (Dashboard, Aset, Lokasi, Pengadaan, Peminjaman,
  Kerusakan, Pemeliharaan, Stock Opname, Penghapusan, Laporan, Master), tab
  tampil sesuai izin. Halaman tambahan: `/sarpras/aset/baru`,
  `/sarpras/aset/[id]` (QR, nilai buku, mutasi, riwayat, berkas),
  `/sarpras/opname/[id]` (ramah HP, simpan per baris), `/lapor-kerusakan`,
  publik `/a/[token]` & `/r/[token]` (hasil pindai QR), cetak
  `/cetak/label-aset` (A4 24 label) & `/cetak/kir/[id]`, ekspor CSV
  `/sarpras/laporan/[jenis]`.
- `lib/aset/`: `susut.ts` (garis lurus, dihitung saat dibaca; tanah & KDP
  tidak disusutkan), `kode.ts` (kode inventaris + retry-on-P2002),
  `persetujuan.ts` (jenjang pengadaan/penghapusan), `akses.ts` (filter aset
  per peran: pengelola vs PIC ruang/pemegang), `qr.ts`. `lib/aksi-form.ts`:
  pola Server Action → redirect `?pesan=`/`?galat=` + `PesanAksi`.
- Cron `sapuSarpras()`: peminjaman lewat batas → Terlambat, pemeliharaan
  lewat tempo → Terlewat, pengingat H-N (WA ke petugas, tunduk WA_DRY_RUN).
- Perbaikan ikutan: `/berkas/[id]` memetakan domain `aset` ke izin
  `sarpras.view`; `/login?next=` (hanya path internal) untuk alur pindai QR;
  prefiks middleware `/a/`,`/r/` diperbaiki (sebelumnya tidak pernah cocok);
  sidebar menyorot menu induk untuk sub-halaman (`/sarpras/aset/1`,
  `/rekrutmen/pelamar/1`); kelas `.alert-sukses` ditambahkan.
- Pelajaran: tombol ganda `name="keputusan" value=…` pada satu form Server
  Action TIDAK andal (klik "Setujui" tercatat Tolak) — pakai dua form dengan
  hidden input (`FormKeputusan`).
- Verifikasi: `tests/aset.test.ts` (penyusutan + kode paralel, 7 lulus),
  `tests/e2e/sarpras.spec.ts` 6 skenario (alur QR→lapor→tangani sampai Baik
  dari viewport HP; kolom harga tersembunyi bagi guru; form unit
  dimanipulasi ditolak; bentrok peminjaman ditolak; penghapusan wakaf tanpa BA
  ditolak; pengadaan berjenjang → aset → opname → penghapusan → ekspor), tiap
  langkah dicek barisnya di DB & audit. Seluruh suite Playwright 10/10 lulus.
- Belum: ekspor kolom persis templat Dapodik/EMIS (menunggu templat resmi),
  penandaan jadwal pelajaran pada pemesanan ruang, tautan `CashTransaction`.

## 2026-09-22 — Rekrutmen bagian 2: panel panitia (`/rekrutmen`) + konversi jadi pegawai

Melengkapi sisi panitia untuk modul yang publiknya selesai di bagian 1.
Dengan ini alur Rekrutmen sudah lengkap ujung-ke-ujung: pelamar publik →
verifikasi berkas → penilaian → keputusan → konversi jadi pegawai.

- `app/(staf)/rekrutmen/page.tsx` + `TabLowongan.tsx` + `TabPelamar.tsx`:
  dashboard ringkas (lowongan dibuka, lamaran dalam proses, dst), tab
  Lowongan (buat Draf → Ajukan → Setujui & Buka → Tutup, digerbangi izin
  `rekrutmen.job_manage`/`rekrutmen.approve`), dan tab Pelamar (cari/filter
  per lowongan & status, tautan ke detail).
- `app/(staf)/rekrutmen/pelamar/[id]/page.tsx`: detail satu lamaran — data
  diri (NIK digerbangi `rekrutmen.view_sensitive`), daftar berkas dengan
  tautan lihat lewat rute bergerbang `/berkas/[id]` + tombol
  verifikasi/tandai-perlu-perbaikan (`rekrutmen.screen`), form beri nilai per
  tahap seleksi (`rekrutmen.score`, skor tertimbang dihitung dari rata-rata
  seluruh evaluator dikali bobot tahap), timeline status dari
  `ApplicationEvent`, dan form ubah status (`rekrutmen.screen` untuk
  Screening/Shortlisted/Test/Interview, `rekrutmen.decide` untuk
  Offered/Hired/Rejected).
- `konversiJadiPegawai()` — untuk lamaran berstatus Hired: bikin `Person` +
  `Staff` (nomor pegawai `PEG-<tahun>-NNNN`) + `User` (username dari nama,
  disambiguasi kalau bentrok, sandi sementara `Nuha2026!` dengan
  `mustChangePassword=true` — pegawai baru wajib ganti sandi di login
  pertama, sama seperti akun lain), lalu menautkan `JobApplication.personId`
  supaya tidak bisa dikonversi dua kali.
- Semua aksi (buat/ajukan/setujui/tutup lowongan, verifikasi berkas, ubah
  status, beri nilai, konversi) dicatat `recordAudit()`.
- `tests/e2e/rekrutmen-panitia.spec.ts` (baru): login superadmin (sementara
  `mustChangePassword` dimatikan di `beforeAll`/dikembalikan di `afterAll`
  supaya tidak mengubah perilaku default akun itu di test lain) → buat
  lowongan → ajukan → setujui & buka → cari lamaran → ubah status ke
  Screening lalu Hired → konversi jadi pegawai → verifikasi pesan sukses
  tampil dan tidak ada `pageerror`.
- Verifikasi: `tsc --noEmit` bersih, `npx playwright test` 4/4 lulus (1 baru
  + 3 sebelumnya). Data uji (lamaran, lowongan, pegawai hasil konversi)
  dibersihkan dari DB setelah verifikasi manual.
- Belum di bagian ini (menyusul): pengiriman WA sungguhan saat status
  berubah (templat sudah ada, `WA_DRY_RUN`), cron auto-close lowongan lewat
  `closeAt`, ekspor data rekrutmen (`rekrutmen.export`), dan akun demo
  ketua/kepala-unit/SDM di seed sandbox ini (baru ada superadmin +
  guru.1–10) — tidak memblokir modul, tapi berarti uji panitia sejauh ini
  memakai superadmin.

## 2026-09-22 — Rekrutmen bagian 1: skema + alur publik pelamar (`/karir`)

Modul Rekrutmen (03-rekrutmen-lowongan-kerja.md), diprioritaskan pertama dari
tiga modul tersisa (Rekrutmen → Sarpras → Presensi) karena paling independen.
Bagian ini menuntaskan sisi publik; panel panitia & konversi jadi pegawai
menyusul di commit berikutnya.

- Skema baru (lihat juga commit skema/seed/navigasi sebelumnya): `JobPosting`,
  `JobRequiredDocument`, `JobStage`, `JobApplication`, `ApplicationDocument`,
  `ApplicationEducation`, `ApplicationExperience`, `ApplicationScore`,
  `ApplicationEvent`, `ApplicationEvaluator`.
- `app/karir/page.tsx` — daftar lowongan berstatus Open & sedang dalam
  rentang buka/tutup, dibaca langsung dari DB (`force-dynamic`).
- `app/karir/[code]/page.tsx` — detail lowongan: deskripsi, syarat, fasilitas,
  daftar berkas yang perlu disiapkan; tombol "Lamar Sekarang" nonaktif kalau
  lowongan sedang tidak menerima lamaran.
- `app/karir/[code]/daftar/{page,Wizard}.tsx` — wizard 4 langkah (Data Diri →
  Pendidikan & Pengalaman → Berkas → Pernyataan & Kirim), pola diadaptasi dari
  `app/ppdb/Wizard.tsx`. Beda dari PPDB: unggah berkas di sini **nyata**
  (bukan simulasi checkbox), lewat `<input type=file>` yang dikirim sebagai
  `FormData` ke Server Action, disimpan lewat `lib/berkas.ts` (domain
  `rekrutmen`, magic-byte + limit 2 MB). Draf isian (bukan berkas) disimpan ke
  `localStorage` per lowongan (03 §4.3) supaya tidak hilang kalau tab
  tertutup tidak sengaja.
- `app/karir/actions.ts` — `kirimLamaran(FormData)`: validasi server penuh,
  nomor lamaran berurutan `LMR-<tahun>-NNNN` (pola retry-on-P2002 sama seperti
  `daftarPpdb`), `statusToken` acak 24 byte, tolak NIK dobel untuk lowongan
  yang sama (`@@unique([jobId, nik])`), simpan tiap dokumen wajib/opsional
  yang diunggah, catat `ApplicationEvent` awal (`Submitted`). Anti-spam dasar
  (03 §4): honeypot field tersembunyi + jebakan waktu (tolak kalau kirim
  < 2.5 detik sejak formulir dibuka) — belum ada rate-limit per-IP seperti
  login (bisa menyusul kalau terbukti perlu di produksi).
- `app/karir/status/page.tsx` — cek status publik by nomor lamaran (+ opsional
  token di URL untuk tautan WA nanti), menampilkan timeline dari
  `ApplicationEvent` sungguhan (bukan status tetap seperti cek-status PPDB).
- Seed: `prisma/seed-dasar.ts` menambah 5 templat WA rekrutmen
  (`LMR_DITERIMA`, `LMR_PERBAIKAN_BERKAS`, `LMR_UNDANGAN_TES`,
  `LMR_HASIL_LOLOS`, `LMR_HASIL_TDK_LOLOS`) — selalu lewat `WA_DRY_RUN`, belum
  dipicu di mana pun (menyusul saat panel panitia mengubah status). Seed demo
  (`prisma/seed.ts`): satu lowongan contoh `LOW-2026-0001` (Guru Matematika
  SMP, status Open) + 5 berkas wajib/opsional + 3 tahap seleksi, dipakai
  Playwright dan untuk demo manual.
- `tests/e2e/rekrutmen.spec.ts` (baru) — Playwright: (1) pelamar mengisi
  wizard lengkap dengan berkas PDF asli, kirim, dapat nomor `LMR-YYYY-NNNN`,
  lalu cek status dan melihat namanya + status "Terkirim"; (2) NIK yang sama
  ditolak melamar dua kali ke lowongan yang sama, pesan errornya muncul di
  langkah yang benar (perbaikan: `Wizard.tsx` sekarang memindahkan langkah
  aktif ke tempat field error server berada, karena validasi klien di langkah
  sebelumnya bisa lolos padahal server menolak, mis. NIK dobel).
- Verifikasi: `tsc --noEmit` bersih, `npx playwright test` 3/3 lulus (2 baru +
  smoke lama), `curl` manual ke keempat halaman publik 200.
- Belum di bagian ini (menyusul): panel panitia (`app/(staf)/rekrutmen`),
  konversi pelamar Hired → `Person`+`Staff`+`User`, pengiriman WA sungguhan
  di titik status berubah, cron auto-close lowongan lewat `closeAt`, menu
  sidebar `rekrutmen` masih perlu dilepas dari `MENU_DISEMBUNYIKAN`... —
  catatan: menu itu SUDAH tidak disembunyikan sejak commit skema (tidak ada di
  `MENU_DISEMBUNYIKAN`), jadi panitia ber-role terkait sudah melihatnya di
  sidebar walau halamannya belum ada (404 sementara) — akan diisi di commit
  berikutnya.

## 2026-09-22 — Fase A (fondasi) bagian 3: infrastruktur unggah berkas

Lanjutan Fase A (01-fondasi §5) — belum dipakai modul manapun, disiapkan
lebih dulu karena presensi selfie (02), lamaran rekrutmen (03), dan dokumen
aset (04) semua membutuhkannya.

- `lib/berkas.ts` (baru): `simpanBerkas()` — validasi tipe dari MAGIC BYTES
  (bukan ekstensi/Content-Type klien): JPEG, PNG, WebP, PDF; PDF ber-JavaScript
  ditolak; batas ukuran per domain (presensi 500 KB, rekrutmen 2 MB, aset 5 MB);
  simpan ke `storage/<domain>/<yyyy>/<mm>/<sha256>.<ext>` (nama disk dari hash,
  bukan nama asli) + catat baris `FileObject`. Juga `hapusBerkasLunak()` dan
  `hapusFisikKedaluwarsa()` (retensi, belum dipanggil cron manapun — menyusul
  saat domain nyata mulai memakainya).
- `app/berkas/[id]/route.ts` (baru): route bergerbang tunggal untuk SEMUA
  berkas, menggantikan pola per-modul lama (`kepegawaian/berkas/[nama]`,
  `docs/tangkapan`). Cek sesi + izin `<domain>.view` lewat `can()`; header
  `Content-Disposition: inline`, `X-Content-Type-Options: nosniff`,
  `Cache-Control: private`. Akses domain `presensi`/`rekrutmen` (data pribadi)
  diaudit tiap dibuka.
- `next.config.mjs`: `experimental.serverActions.bodySizeLimit` dinaikkan ke
  6 MB (default 1 MB tidak cukup untuk foto/dokumen).
- `docker-compose.yml`: volume `nuha_storage` dipasang ke `nuha-app` di
  `/app/storage` (`STORAGE_DIR`); `.gitignore`/`.dockerignore` menambah
  `storage/` — berkas asli tidak pernah masuk git maupun image build context.
- Diverifikasi manual: simpan PNG uji → tersimpan + baris `FileObject` →
  diambil lewat `/berkas/<id>` dengan sesi (200) → ditolak tanpa sesi (401).
  Data uji dibersihkan setelahnya. tsc bersih, vitest tanpa regresi baru.
- **Fase A sekarang inti-selesai** kecuali: reset sandi oleh admin (dari
  `pengaturan`) dan tab `pengaturan?tab=izin` (UI matriks peran×izin — DB-nya
  sudah ada dari bagian 2, tinggal UI-nya). Keduanya cukup penting tapi tidak
  memblokir B/C/D, jadi ditunda untuk memprioritaskan schema Fase B/C/D
  (presensi, sarpras, rekrutmen) yang justru jadi urutan berikutnya.

## 2026-09-22 — Fase A (fondasi) bagian 2: CRUD generik pakai izin tingkat aksi + peran/unit baru

Lanjutan bagian 1 (auth). Mengikuti plan §3.3: "seed awal meniru akses lama
persis, dikurangi secara sadar belakangan" — jadi perubahan ini **tidak
mengubah akses siapa pun**, diverifikasi manual di bawah.

- `app/api/crud/[entity]/route.ts`: `authorize()` lama (cuma cek `menu_roles`)
  dipecah jadi `authorizeRead`/`authorizeWrite`, keduanya tetap mengecek grant
  menu **dan** sekarang juga izin `Permission` lewat `can()` dari `lib/access.ts`.
  Entitas bisa override lewat `perm: { view, write }` di registry (belum ada
  yang pakai — defaultnya `${menu}.view`/`${menu}.update`).
- `prisma/seed-dasar.ts`: `seedIzinTingkatAksi()` baru — untuk setiap
  `MenuItem` membuat izin `<menu>.view` dan `<menu>.update`, lalu memberi
  KEDUANYA ke setiap peran yang sudah punya grant menu itu (mirroring 1:1 dari
  `menu_roles`, bukan pengurangan). Hasil di DB dev: 36 izin, 182 baris
  `role_permissions`.
- Peran baru dari `05-matriks-peran.md` §2 ditambahkan ke `seed-dasar.ts`
  (bukan cuma `proto-data.json`): `pegawai`, `sdm`, `sarpras`, `teknisi`,
  `musyrif`. Belum punya grant menu (menunya belum ada — menyusul Fase B/C/D).
- Unit `YAYASAN` ditambahkan (01 §4 / jawaban bawaan U4) untuk aset dan
  lowongan milik yayasan langsung, bukan salah satu sekolah/pondok.
- Diverifikasi manual: superadmin tetap bisa CRUD (lolos lewat `isSuperAdmin`);
  akun peran `ketua` (dites dengan user sementara, dihapus setelah tes) tetap
  bisa baca `unit` dan `mapel` lewat jalur izin baru — akses sebelum/sesudah
  identik. tsc bersih, vitest tanpa regresi baru dari baseline.
- **Belum dikerjakan**: reset sandi oleh admin, tab `pengaturan?tab=izin`
  (UI matriks peran×izin), `lib/berkas.ts` + route penyajian, lalu schema
  Fase B/C/D (presensi, sarpras, rekrutmen).

## 2026-09-22 — Fase A (fondasi) bagian 1: auth — batas percobaan, ganti sandi wajib, pencabutan sesi

Bagian pertama dari `plan/2026-09-modul-inti/01-fondasi-auth-rbac-crud.md`
(prasyarat modul presensi, sarpras, rekrutmen). Mengikuti default jawaban di
`06-pertanyaan-client.md` karena belum ada respons client — dicatat di sini
sesuai instruksi plan.

- **Migrasi** `20260922110000_fase_a_rbac_aksi_unitscope_berkas`: tabel baru
  `permissions`, `role_permissions` (RBAC tingkat aksi, dipakai `requireAction()`
  di `lib/access.ts`), `login_attempts`, `file_objects` (infrastruktur unggah
  berkas, belum dipakai modul manapun), `user_units` (cakupan unit banyak-ke-banyak,
  menggantikan `User.unitScope` yang dipertahankan untuk kompatibilitas); kolom
  baru di `user`: `must_change_password` (default true), `password_changed_at`,
  `session_version`. Migrasi juga membawa beberapa reconciliation drift lama
  (rename index `wa_templates`/`notification_queue`, default kolom) yang sudah
  ada di schema tapi belum tersinkron ke migration history.
- **Batas percobaan login**: 5 gagal per identifier atau 20 gagal per IP dalam
  15 menit → 429. Baris `login_attempts` dibersihkan tiap jam oleh `nuha-cron`
  yang sudah ada (> 24 jam).
- **Ganti sandi wajib**: `/akun/sandi` + `POST /api/auth/ganti-sandi`. Middleware
  baru (`middleware.ts`, dibaca dari `mustChangePassword` di payload JWT — tanpa
  query DB tambahan) memaksa ke halaman ini selama flag itu true. Validasi:
  minimal 8 karakter, bukan sandi bawaan `Nuha2026!`, bukan sama dengan username.
- **Pencabutan sesi dini**: `User.sessionVersion` ikut di payload JWT;
  `readSession()` di `lib/auth.ts` membandingkannya ke DB (di-cache per request
  via `React.cache`) dan menolak token yang versinya sudah tidak cocok (akun
  dinonaktifkan / sandi diganti). Token lama tanpa field ini tetap dianggap
  valid supaya tidak logout massal saat deploy.
- **`lib/access.ts`**: tambah `requireAction(permKey)` dan `can(session, permKey)`
  di atas `requirePage()` yang sudah ada — superadmin lolos semua, izin peran
  dimuat sekali per request. Belum ada Server Action yang memanggilnya (menyusul
  saat entitas per modul dikerjakan).
- **`lib/unit-scope.ts`** (baru): `whereUnit()`, `assertUnit()`,
  `readAndAssertUnitId()` — belum diterapkan ke query modul manapun, menyusul.
- Diverifikasi manual (curl, bukan Playwright — publik `202.59.200.26:3226`
  belum di-deploy dari sesi ini): login → dipaksa `/akun/sandi` → ganti sandi
  → redirect berhenti; 6× sandi salah → percobaan ke-6 menerima 429.
- **Belum dikerjakan** (menyusul di komit berikutnya): reset sandi oleh admin,
  `authorizeRead`/`authorizeWrite` di CRUD generik, seed izin/peran baru, tab
  `pengaturan?tab=izin`, `lib/berkas.ts` + route penyajian, schema Fase B/C/D
  (presensi, sarpras, rekrutmen).

## 2026-09-22 — push ke repository publik arrachman/web-nuha (a89943f)

Repo `https://github.com/arrachman/web-nuha` (publik, default branch `main`) sekarang
menerima push dari local `main`. Remote sebelumnya `jiramv25-ui/test-codex`
diganti; branch `main` di-set tracking ke `origin/main`. Branch lokal tidak
dihapus — tetap ada di `/opt/web-nuha` untuk iterasi lanjutan (`npm run dev` port
3226). `.env` tetap di-ignore, yang di-track hanya `.env.example` berisi placeholder
(`change_me`, `dev-secret-change-me-in-production-32b`) — tidak ada rahasia asli
yang ter-commit.

## 2026-09-21 — beranda: section Kata Alumni + agenda mendatang (87c110e)

Tabel `testimoni` baru ditambahkan ke schema Prisma (kolom: nama, inisial, ket, kata)
bersama migration `20260921000000_add_testimoni`. Seed idempoten di `prisma/seed.ts`
memasukkan 3 testimoni alumni sesuai prototype (MF/MA 2016, NA/SMP 2014, AH/Pondok
2011). 5 agenda mendatang (25 Sep–20 Okt 2026) disuntik manual ke DB; sebelumnya
beranda hanya menampilkan agenda masa lalu yang filtrasi `gte: now` mengosongkan
daftar.

Halaman `/beranda` merender dua kolom berdampingan: marquee infinite Kata Alumni
di kiri dan daftar Agenda terdekat di kanan. Perbaikan lebar marquee (01fc335)
mengatasi class `.mq` bawaan yang membatasi `max-width: 520px` — sebelumnya
mengikuti class selector dan memotong kartu testimoni. Fade mask kedua sisi
ditambahkan (5f33a10) agar transisi masuk/keluar kartu halus seperti prototype.

## 2026-09-21 — perbaiki UI Alur Pendaftaran (d2253af)

Kartr alur pendaftaran di beranda sekarang sesuai prototype: tiap kartu punya ikon berwarna (formulir/biru, verifikasi/oranye, seleksi/ungu, daftar ulang/hijau) dan garis konektor dash horizontal di dalam kartu. Teks langkah 1 & 2 disamakan dengan prototype ("15 menit", "2 hari kerja").

## 2026-09-07 — Pisahkan keaktifan santri dan kelulusan per lembaga (`belum-commit`)

Status global santri kini hanya `Aktif` atau `TidakAktif`; istilah `Mukim`, `Alumni`, dan `Keluar` dihapus dari status siswa. Riwayat pendidikan memakai enum terpisah `Aktif`, `Lulus`, atau `TidakAktif`, sehingga seseorang dapat tercatat lulus SMP tetapi tetap aktif di MA atau Madin. Migrasi memetakan data lama `Mukim→Aktif`, `Alumni→Lulus`, dan `Keluar→TidakAktif` tanpa menghapus baris.

Dampak operator: filter, badge, ringkasan, dan detail Data Induk menampilkan status keaktifan saja. Cabang `Lulusan` pada setiap unit tetap membaca riwayat pendidikan unit tersebut. Navigator Semua lembaga/SMP/MA/Madin kini mereset pencarian dan seluruh penyaring saat berpindah tab agar filter unit sebelumnya tidak menghasilkan layar kosong. Migrasi `20260907081500_separate_student_activity_status` sudah diterapkan ke database aktif.

## 2026-09-03 — Import wilayah Indonesia dan pengaman alamat (`84db1d93`)

Dataset administratif Indonesia 2025 telah diimpor ke `regions`: 38 provinsi, 514 kabupaten/kota, 7.285 kecamatan, dan 83.762 desa/kelurahan. Migrasi `20260903080000_fix_region_column_names` juga menyelaraskan dua kolom teknis lama (`kode` dan `populasi`) dengan Prisma tanpa membuat ulang data. Pembaruan orang dengan alamat domestik kini ditolak bila masih memiliki alamat luar negeri aktif; skrip `npm run report:alamat-wilayah -- --file <path.json>` hanya membuat daftar telaah manual dan tidak pernah mengisi `regionId` secara otomatis.

Dampak operator: pemilih wilayah PPDB kini menggunakan data desa/kelurahan nyata. Jalankan migrasi Prisma sebelum memakai versi ini; pemeriksaan alamat lama aman karena tidak menebak wilayah dari teks alamat bebas.

## 2026-09-03 — Simpan wilayah domisili pendaftar PPDB (`ef8b20d7`)

Pendaftar PPDB kini dapat menyimpan referensi opsional ke desa atau kelurahan aktif melalui relasi `Applicant.regionId`. Form publik dan API PPDB memvalidasi ID wilayah di server sebelum menyimpan, dan lookup desa dibatasi pada data wilayah aktif.

Dampak operator: pendaftar lama tetap valid tanpa wilayah. Setelah dataset wilayah diimpor, calon pendaftar dapat memilih desa/kelurahan dari formulir PPDB; alamat teks bebas tetap tersedia sebagai keterangan alamat.

## 2026-09-03 — Rename teknis kegiatan harian ke Inggris (`3558c31e`)

Model Prisma `KegiatanHarian` kini menjadi `DailyActivity`; tabel dan kolom fisiknya ikut berubah in-place dari `kegiatan_harian` menjadi `daily_activities`, serta dari `jam`/`nama`/`ket`/`urutan` menjadi `time`/`name`/`note`/`order`.

Dampak operator: jadwal kegiatan di portal Santri tetap memakai label dan isi berbahasa Indonesia yang sama. Database yang menjalankan aplikasi harus menerapkan migrasi Prisma `20260903060000_rename_daily_activity_to_english` sebelum memakai versi commit tersebut.

## 2026-09-03 — Perbaikan filter persona setelah rename Staff (`0120ee48`)

Filter dinamis pada daftar Guru, Staf, dan kategori peran orang kini memakai relasi Prisma `staff` serta field `position`, menggantikan identifier teknis lama `pegawai` dan `jabatan` yang sudah tidak tersedia setelah rename skema Staff.

Dampak operator: halaman `/data/guru-orang` dan `/data/staf-orang` kembali dapat dibuka tanpa galat validasi Prisma. Label, opsi filter, URL, dan istilah operasional berbahasa Indonesia tidak berubah.

## 2026-09-03 — Rename teknis profil lembaga ke Inggris (`40dfca9b`)

Model Prisma `ProfilLembaga` dan delegate `profilLembaga` kini menjadi `InstitutionProfile` dan `institutionProfile`; tabel fisik `profil_lembaga` menjadi `institution_profiles`. Migrasi `20260903050000_rename_institution_profile_to_english` melakukan rename in-place untuk tabel, indeks, dan foreign key lokasi ke `regions`.

Dampak operator: URL CRUD `profil-lembaga`, label Indonesia, dan struktur formulir tetap sama. Database yang sudah menjalankan aplikasi harus menjalankan migrasi Prisma ini sebelum memakai versi commit tersebut.

## 2026-09-03 — Rename teknis relasi wali ke Inggris (`a7d80621`)

Model Prisma `RelasiWali` kini menjadi `GuardianRelation`, delegate Prisma menjadi `guardianRelation`, dan tabel fisik `relasi_wali` menjadi `guardian_relations`. Migrasi `20260903040000_rename_guardian_relation_to_english` mengganti tabel, indeks unik, dan foreign key secara in-place sehingga data serta relasi ke `people` tetap terjaga.

Dampak operator: label, istilah wali/ayah/ibu, kunci CRUD, parameter impor, dan nilai audit berbahasa Indonesia tetap dipertahankan. Database yang sudah menjalankan aplikasi harus menjalankan migrasi Prisma ini sebelum memakai versi commit tersebut.

Catatan perubahan yang di-commit, terbaru di atas. Setiap entri: tanggal,
hash commit, ringkasan, dan dampak operasional bila ada. Diperbarui setiap
kali ada perubahan yang di-commit (lihat CLAUDE.md §Dokumentasi & riwayat).

## 2026-09-03 — Rename teknis domain kepegawaian dan penggajian ke Inggris (`4e029031`)

Model Prisma dan struktur MySQL untuk pegawai/penggajian kini memakai istilah Inggris: `Staff`, `StaffUnit`, `StructuralPosition`, `PaySlip`, `StaffAttendance`, `TeachingLoad`, dan `DecreeArchive`, termasuk field, indeks, serta foreign key terkait. Migrasi `20260903030000_rename_staff_payroll_to_english` menggunakan rename in-place sehingga tidak membuat ulang atau menghapus data.

Dampak operator: tidak ada perubahan label UI, URL CRUD (`pegawai`), parameter/form data, atau istilah operasional berbahasa Indonesia. Database yang sudah menjalankan aplikasi harus menjalankan migrasi Prisma ini sebelum memakai versi commit tersebut.

## 2026-09-03 — Rename teknis domain kesehatan/poskestren (profil kesehatan/rekam medis/obat) ke Inggris

Model Prisma `ProfilKesehatan→HealthProfile`, `RekamMedis→MedicalRecord`,
`Obat→Medicine` beserta seluruh field-nya diterjemahkan ke Inggris
(`beratKg→weightKg`, `tinggiCm→heightCm`, `golDarah→bloodType`,
`riwayatPenyakit→medicalHistory`, `alergi→allergies`,
`kebutuhanKhusus→specialNeeds`, `catatan→notes`; `tgl→date`, `jam→time`,
`keluhan→complaint`, `terapi→treatment`, `tindakLanjut→followUp`,
`petugas→officer`; `nama→name`, `satuan→unit`, `kategori→category`,
`stok→stock`, `stokMin→minStock`, `kadaluarsa→expiry`).

Konsumen yang diperbaiki: `app/(staf)/poskestren/*` (Dashboard, Periksa/
`actions.ts`, Rekam, Obat, Lapor), `app/(staf)/induk/TabKesehatan.tsx` &
`TabBiodata.tsx`, kedua portal (`app/portal/santri/tabs/TabHafalan.tsx`,
`app/portal/wali/tabs/TabRingkasan.tsx` & `TabKesehatan.tsx`), `prisma/seed.ts`,
dan ketiga importir siswa MA (`import-siswa-ma.ts`, `-ma-2025.ts`,
`-ma-2026.ts`). `lib/crud/registry.ts` sudah lebih dulu diperbarui (`model:
'medicine'`/`'healthProfile'`) pada rename sebelumnya; kunci entitas CRUD
(`obat`, `profil-kesehatan`) dan seluruh label/copy UI tetap Indonesia — hanya
identifier Prisma/kolom fisik yang berubah.

Migrasi `20260903020000_rename_health_to_english` memakai `RENAME TABLE`
(`profil_kesehatan→health_profiles`, `rekam_medis→medical_records`,
`obat→medicines`), `CHANGE COLUMN` per kolom, drop/rebuild FK ke `santri`,
dan `RENAME INDEX` — non-destruktif, tidak ada drop+recreate tabel. DB dev
(`127.0.0.1:3227`) saat ini masih 0 baris di ketiga tabel ini (konsisten
dengan batch kepesantrenan sebelumnya — dev DB belum diisi data domain ini),
jadi tidak ada konversi data yang perlu diverifikasi isinya; diverifikasi
lewat Prisma Client setelah `prisma generate` + `prisma migrate deploy`
bahwa `prisma.healthProfile`/`medicalRecord`/`medicine` bisa diakses tanpa
error. Browser pass Playwright di `http://202.59.200.26:3226` memakai login
`superadmin` berhasil merender seluruh tab Poskestren (Dashboard, Periksa,
Rekam, Obat, Lapor) tanpa `pageerror` maupun HTTP 500 (hanya warning
WebSocket HMR reverse-proxy, tidak memengaruhi aplikasi). Tab
`/induk?tab=kesehatan` dan login peran Poskestren non-superadmin tidak bisa
diverifikasi lewat browser karena dev DB tidak memiliki baris santri maupun
akun user untuk peran tersebut (akun `poskestren@nuha.pesantren.web.id` ada
di `prisma/proto-data.json` tapi belum pernah di-seed ke tabel `user`) —
bukan regresi dari rename ini. `npx tsc --noEmit` bersih.

## 2026-09-03 — Rename teknis domain kepesantrenan (asrama/kamar/halaqah/hafalan/tazir/izin/presensi) ke Inggris

Model Prisma `Asrama→Dormitory`, `Kamar→Room`, `Halaqah→StudyCircle`,
`Hafalan→Memorization`, `Tazir→Discipline`, `Izin→LeavePermit`,
`Presensi→Attendance`, beserta seluruh field-nya, diterjemahkan ke Inggris.
Enum `StatusIzin→LeavePermitStatus` (Menunggu/Disetujui/Ditolak/Selesai→
Pending/Approved/Rejected/Completed) dan `StatusHadir→AttendanceStatus`
(Hadir/Sakit/Izin/Alpa/Terlambat/PulangCepat→Present/Sick/Excused/Absent/
Late/EarlyDeparture) — nilai enum lama di `presensi_pegawai.status` (model
`PresensiPegawai`, di luar cakupan model-nya tapi memakai ulang enum yang
sama) ikut diterjemahkan agar tidak ada dua bahasa dalam satu kolom enum.
Field skalar `Santri.kamarId` (yang di batch sebelumnya sempat tertinggal
karena relasinya sudah berganti nama jadi `room` tapi kolomnya sendiri belum)
sekarang konsisten menjadi `Santri.roomId` (`room_id`).

Konsumen yang diperbaiki mengikuti rename ini: seluruh tab & aksi di
`app/(staf)/kepesantrenan/*`, `app/(staf)/induk/TabKepesantrenan.tsx`,
`app/(staf)/akademik/*` (filter kamar/asrama), `app/(staf)/data/ringkasan-santri.tsx`,
`app/(staf)/laporan/data.ts`, `app/(staf)/notifikasi/TabPemicu.tsx`,
`app/(staf)/poskestren/*`, kedua portal (`app/portal/santri/*`,
`app/portal/wali/*`), `prisma/seed.ts`, `prisma/import/gabung-santri-madin-duplikat.ts`,
dan bug CRUD registry compiler-invisible di `lib/crud/registry.ts` (entitas
`asrama`/`halaqah` masih menunjuk `model: 'asrama'`/`model: 'halaqah'` yang
sudah tidak ada, plus `ref` kamar di entitas `santri` masih menunjuk `model:
'kamar'` — kalau tidak diperbaiki, membuka menu Asrama/Halaqah di CRUD staf
akan error runtime "Model tidak dikenal" walau `tsc` bersih) dan
`lib/crud/santri-filter.ts` (`kamarId→roomId`). Kunci rute CRUD (`asrama`,
`halaqah`), `menuKey`, dan seluruh label/copy UI tetap Indonesia — hanya
identifier Prisma/kolom fisik yang berubah.

Migrasi `20260903010000_rename_boarding_to_english` memakai `RENAME TABLE`
(`asrama→dormitories`, `kamar→rooms`, `halaqah→study_circles`,
`hafalan→memorization_records`, `tazir→discipline_records`, `izin→leave_permits`,
`presensi→attendance_records`), `CHANGE COLUMN` per kolom, drop/rebuild FK
serta index unik, dan konversi nilai enum lama→baru lewat `UPDATE ... CASE`
sebelum mempersempit definisi enum ke nilai Inggris saja — non-destruktif,
tidak ada drop+recreate tabel. DB dev (`127.0.0.1:3227`) saat ini masih 0
baris di ketujuh tabel ini, jadi belum ada data nyata yang perlu diverifikasi
konversi enum-nya; diverifikasi lewat Prisma Client (`prisma.dormitory.count()`
dkk.) bahwa seluruh delegate baru bisa diakses tanpa error setelah
`prisma generate` + `prisma migrate deploy`. Browser pass Playwright di
`http://202.59.200.26:3226` memakai login `superadmin` berhasil merender
seluruh tab Kepesantrenan (Asrama, Jamaah, Hafalan, Halaqah, Tazir, Izin)
tanpa `pageerror` maupun HTTP 500. Pass ini juga menangkap dua pemetaan fisik
yang sempat terlewat di `StudyCircle`: `educationLevel→education_level` dan
`memberCount→member_count`; keduanya diperbaiki lewat `@map` sebelum verifikasi
ulang. Warning WebSocket HMR dari reverse proxy tetap muncul di browser tetapi
tidak memengaruhi render aplikasi. `npx tsc --noEmit` bersih.

## 2026-09-03 — Perbaikan registry CRUD `orang`/persona pasca rename ke Person

Menutup catatan yang di-flag di entri sebelumnya: entitas CRUD `orang` dan
keempat persona (Santri/Guru/Staf/Wali) di `lib/crud/registry.ts` dan
`lib/crud/persona.ts` masih memakai nama Prisma lama (`model: 'orang'`,
`include: { orang: true }`, `'orang.nama'`, field `nama`/`jk`/`hp`/`aktif`)
padahal modelnya sudah `Person` sejak Fase 2 — regresi yang **tidak terdeteksi
`npx tsc --noEmit`** karena `Entity`/`Field` di `lib/crud/types.ts` menyimpan
nama model/field sebagai `string` polos tanpa keterkaitan tipe ke Prisma
Client. Dampaknya sebelum perbaikan: setiap create/update lewat CRUD generic
untuk `orang` dan keempat persona akan gagal total (`delegateFor` melempar
"Model tidak dikenal").

Diperbaiki: `lib/crud/orang-fields.ts` (semua nama field diterjemahkan ke
Prisma `Person` yang sebenarnya — `nama→fullName`, `jk→gender`, `hp→phone`,
`alamat→addressLine`, `desaId→regionId`, `aktif→isActive`, dst.),
`lib/crud/persona.ts`, `lib/crud/registry.ts`, `lib/crud/santri-filter.ts`
(`orang.jk→person.gender`), serta komentar di `lib/crud/engine.ts`,
`lib/crud/types.ts`, `lib/crud/keterkaitan.ts`, `lib/crud/peran-orang.ts`.

Ditemukan bug kedua yang sama sekali tidak ter-flag sebelumnya, di
`lib/crud/keterkaitan.ts`: guard `if (entity.model !== 'orang') return rows;`
pada `lampirkanKeterkaitan()` diam-diam mematikan seluruh panel "Terhubung ke
modul lain" untuk semua entitas (tidak ada lagi `entity.model` bernilai
`'orang'`) — diperbaiki jadi `!== 'person'`.

Bug ketiga: `app/api/crud/[entity]/route.ts` men-hardcode nama field wilayah
sebagai `parsed.data.desaId` di POST dan PATCH — begitu `orang-fields.ts`
berganti nama field jadi `regionId`, validasi desa aktif untuk entitas
`orang`/persona diam-diam terlewati (data tersimpan tanpa pengecekan),
sementara entitas `unit`/`profil-lembaga` yang masih memakai `desaId` tetap
tervalidasi. Diperbaiki dengan helper `regionValue()` yang membaca field
`type: 'wilayah'` milik entitas secara dinamis, bukan nama kolom tetap —
berlaku benar untuk kedua skema penamaan sekaligus.

Bug keempat (kosmetik/UX, bukan fungsional): `components/CrudPanel.tsx` baris
subjudul modal ubah hardcode `editing.nama` — untuk baris `Person` yang kini
tidak lagi punya kolom `nama`, subjudul jatuh ke `ID {id}` alih-alih nama
orang. Diperbaiki dengan fallback `editing.fullName ?? editing.nama ?? ...`.

**Pelajaran untuk rename berikutnya**: string literal nama model/field di
`lib/crud/registry.ts`, `persona.ts`, `*-fields.ts`, `*-filter.ts`,
`keterkaitan.ts`, dan `app/api/crud/[entity]/route.ts` harus di-grep manual
setiap kali ada rename Prisma — `tsc --noEmit` tidak akan pernah menangkapnya.

Verifikasi Playwright di `http://202.59.200.26:3226` (superadmin): create
baris uji lewat `/data/orang` (form fullName + gender tersimpan benar di
kolom `fullName`/`gender` tabel `people`, tanpa `pageerror`), subjudul modal
ubah menampilkan nama, baris dihapus setelah verifikasi. Halaman
`/data/orang`, `/data/santri-orang`, `/data/guru-orang`, `/data/staf-orang`,
`/data/wali-orang`, `/data/santri` seluruhnya merender tanpa `pageerror`.
Catatan: DB dev saat ini belum punya baris `santri`/`pegawai` (0 baris),
jadi panel "Terhubung ke modul lain" belum bisa diverifikasi visual dengan
data nyata — perlu diverifikasi ulang begitu data santri/pegawai tersedia.
`npx tsc --noEmit` bersih.

## 2026-09-03 — Rename teknis TahunAjaran ke AcademicYear

Model Prisma `TahunAjaran` dan tabel fisik `tahun_ajaran` kini menjadi
`AcademicYear`/`academic_years`. Kolom teknis diterjemahkan: `kode→code`,
`aktif→isActive`. Kolom FK yang menunjuk ke model ini juga diterjemahkan:
`Kelas.tahunAjaranId→academicYearId`, `RiwayatPendidikan.tahunAjaranId→
academicYearId`, `BebanJam.tahunAjaranId→academicYearId`, beserta kunci unik
gabungannya (`kode_semester→code_semester`, `unitId_nama_tahunAjaranId→
unitId_nama_academicYearId`, `personId_unitId_tahunAjaranId→
personId_unitId_academicYearId`). Field skalar `Ujian.tahunAjaran` (VARCHAR
bebas, model berbeda, bukan relasi ke tabel ini) sengaja **tidak** disentuh —
di luar cakupan batch ini. Kunci rute CRUD (`tahun-ajaran`) dan label UI tetap
berbahasa Indonesia sebagai kontrak presentasi.

Migrasi `20260903000000_rename_academic_year_to_english` memakai `RENAME
TABLE`, `CHANGE COLUMN`, drop/rebuild index unik, dan drop/rebuild tiga
foreign key (`kelas`, `riwayat_pendidikan`, `beban_jam` → `academic_years`)
secara non-destruktif — termasuk menambah indeks pendukung
`riwayat_pendidikan_person_id_idx` karena FK `person_id` ternyata bergantung
pada indeks unik gabungan yang di-drop. Konsumen yang diperbarui:
`prisma/tahun-ajaran.ts`, `prisma/seed.ts`, `prisma/seed-dasar.ts`,
`lib/crud/registry.ts`, `app/(staf)/akademik/pohon.ts`,
`app/(staf)/induk/{TabBiodata.tsx,pohon.ts}`,
`app/(staf)/kepegawaian/TabBebanJam.tsx`, dan 13 skrip di `prisma/import/`.
`npx tsc --noEmit` dan `prisma migrate status` bersih; verifikasi Playwright
di `http://202.59.200.26:3226` (login superadmin dan guru.1) mengonfirmasi
`/pengaturan?tab=tahun-ajaran`, `/kurikulum`, `/induk`, dan
`/kepegawaian?tab=beban-jam` merender tanpa `pageerror`, dan guru tetap
diarahkan keluar dari halaman pengaturan.

Catatan tersendiri (belum diperbaiki, di-flag untuk batch Fase 4): entitas
CRUD `orang` di `lib/crud/registry.ts` (baris ~14-31) masih memakai
`model: 'orang'`/`include: { orang: true }`/`'orang.nama'`, padahal model
Prisma sudah `Person` sejak Fase 2 — kemungkinan bug laten pada resolusi
delegate dinamis, perlu diverifikasi dan diperbaiki terpisah.

## 2026-09-02 — Rename teknis notifikasi WhatsApp ke Bahasa Inggris

Model Prisma `TemplateWa`, `LogWa`, `JadwalNotifikasi`, `AntreanNotifikasi` kini
menjadi `WaTemplate`/`wa_templates`, `WaLog`/`wa_logs`,
`NotificationSchedule`/`notification_schedules`,
`NotificationQueue`/`notification_queue`. Kolom teknis diterjemahkan: `kode→code`,
`judul→title`, `pemicu→trigger`, `waktu→schedule`, `isi→content`, `aktif→isActive`
(template); `tujuan→recipient`, `nomor→phone`, `isi→content`, `waktu→sentAt`
(log); `kodeTemplate→templateCode`, `aktif→isActive`, `terakhirJalan→lastRunAt`
(jadwal); `kodeTemplate→templateCode`, `tujuanId→recipientId`,
`tanggalJadwal→scheduledDate`, `logWaId→waLogId` (antrean). Kunci rute CRUD
(`template-wa`), form uji kirim, payload `FormData`/`/api/wa/kirim`
(`templateKode`, `nomor`, `tujuan`, `isi`), dan label UI tetap berbahasa
Indonesia sebagai kontrak presentasi.

Migrasi `20260902220000_rename_wa_notification_to_english` memakai
`CHANGE COLUMN`, `RENAME TABLE`, `RENAME INDEX`, dan drop/rebuild foreign key
`wa_logs.template_id → wa_templates.id` secara non-destruktif. Konsumen yang
diperbarui: `TabLog.tsx`, `TabTemplate.tsx`, `actions.ts`, halaman notifikasi,
`/api/wa/kirim/route.ts`, `lib/wa.ts`, `lib/penjadwal/jalankan.ts`,
`lib/crud/registry.ts`, `prisma/seed-dasar.ts`, `prisma/seed.ts`. `npx tsc
--noEmit` dan `prisma migrate status` bersih.

## 2026-09-02 — Rename teknis Pengumuman/Agenda ke Bahasa Inggris

Model Prisma `Pengumuman` dan tabel fisik `pengumuman` kini menjadi
`Announcement`/`announcements`. Kolom teknis kedua model diterjemahkan:
`tgl→date`, `judul→title`, `isi→content` (Pengumuman), serta `tgl→date`,
`jam→time`, `judul→title` (Agenda, model & tabel `agenda` tetap sama karena
sudah Inggris). Kunci rute CRUD (`pengumuman`, `agenda`), label UI, dan
sumber data prototipe (`row.tgl`, `row.judul`, `row.isi`) tetap berbahasa
Indonesia sebagai kontrak presentasi.

Migrasi `20260902210000_rename_announcement_agenda_to_english` memakai
`CHANGE COLUMN`, `RENAME TABLE`, dan `RENAME INDEX` non-destruktif. Konsumen
yang diperbarui: beranda publik, layout staf, dashboard staf, Shell (ticker
agenda sidebar), tab portal santri (beranda + pengumuman), dan tab ringkasan
portal wali. `npx tsc --noEmit` dan `prisma migrate status` bersih; verifikasi
Playwright di `http://202.59.200.26:3226` mengonfirmasi beranda publik dan
dashboard Super Admin merender tanpa `pageerror`.

## 2026-09-02 — Rename teknis PPDB ke Bahasa Inggris

Model Prisma dan tabel fisik PPDB kini memakai `Applicant`/`applicants` dan
`ApplicantDocument`/`applicant_documents` (sebelumnya `Pendaftar`/`pendaftar` dan
`BerkasPendaftar`/`berkas_pendaftar`). Kolom teknis (`registrationNumber`,
`fullName`, `gender`, `choice`, `previousSchool`, `guardianPhone`,
`registeredAt`, `score`) dan enum status (`New`, `Verification`, `Selection`,
`Passed`, `Failed`, `Reenrollment`) juga memakai nama Inggris.

Migrasi `20260902200000_rename_ppdb_to_english` mengonversi nilai enum status
lama ke Inggris sebelum rename kolom/tabel/index, lalu membangun ulang foreign
key `applicant_documents → applicants`. Form pendaftaran publik, halaman cek
status (`?noReg=`), payload API `/api/ppdb`, dan teks UI panitia tetap
berbahasa Indonesia. `npx tsc --noEmit` dan `prisma migrate status` bersih
setelah penerapan.

## 2026-09-02 — Rename teknis keuangan dan penggajian ke Bahasa Inggris

Model Prisma dan tabel fisik finance kini memakai `SalaryComponent`, `PayrollSlip`,
`Invoice`, `Payment`, dan `CashTransaction`. Kolom teknis seperti nominal,
tanggal, dan komponen gaji juga memakai nama Inggris; nilai arah kas dipetakan
dari CSV `Masuk`/`Keluar` ke enum `Inbound`/`Outbound` saat disimpan.

Migrasi `20260902180000_rename_finance_payroll_to_english` memakai rename
non-destruktif tabel, kolom, indeks, dan foreign key. Payload API payroll,
header CSV, audit, dan teks UI tetap berbahasa Indonesia; tabel hasil migrasi,
Prisma migration status, dan typecheck TypeScript telah diverifikasi.

## 2026-09-02 — Rename teknis auth/RBAC ke Bahasa Inggris (Fase 3)

Model dan tabel otorisasi kini memakai kosakata Inggris: `Peran→Role`
(`peran→roles`), `UserPeran→UserRole` (`user_peran→user_roles`),
`Menu→MenuItem` (`menu→menu_items`), dan `MenuPeran→MenuRole`
(`menu_peran→menu_roles`). Kolom serta indeks terkait juga diterjemahkan,
termasuk `nama→name`, `deskripsi→description`, `urutan→order`, dan
`peran_id→role_id`.

Migrasi `20260902160000_rename_auth_rbac_to_english` menjaga seluruh baris
role dan grant melalui rename tabel/kolom/index serta pembangunan ulang FK.
Nilai key role/menu, payload sesi `peran`, rute, dan label UI tetap kompatibel.
Prisma migration status dan typecheck TypeScript bersih setelah penerapan.

## 2026-09-02 — Rename teknis Orang ke Person (Fase 2)

Model Prisma `Orang` dan tabel fisik `orang` kini menjadi `Person`/`people`.
Kolom identitas teknis dipindahkan ke kosakata Inggris, termasuk
`nama→fullName`, `jk→gender`, `tgl_lahir→birth_date`, `desa_id→region_id`,
dan `orang_id→person_id` pada `user`, `santri`, `pegawai`, serta
`riwayat_pendidikan`. Relasi wali/anak tetap mempertahankan arti domainnya,
tetapi FK-nya sekarang menunjuk ke `people`.

Migrasi `20260902150000_rename_orang_to_people` ditulis sebagai rename
non-destruktif dengan `CHANGE`, `RENAME INDEX`, `RENAME TABLE`, dan FK yang
dibangun ulang. Data Super Admin serta relasi `user.personId` diverifikasi
setelah penerapan; Prisma migration status dan typecheck TypeScript bersih.

## 2026-09-02 — Rename teknis domain wilayah/negara ke Bahasa Inggris (Fase 1)

Tahap pertama dari rename teknis penuh (model Prisma + tabel/kolom fisik MySQL)
mengikuti kosakata `temp/schema.sql`: `Negara→Country` (`negara→countries`),
`Wilayah→Region` (`wilayah→regions`), `AliasWilayah→RegionAlias`
(`alias_wilayah→region_aliases`), `AlamatLuarNegeri→ForeignAddress`
(`alamat_luar_negeri→foreign_addresses`). Enum `TingkatWilayah→RegionLevel`
(`Provinsi/Kota/Kecamatan/Desa`→`Province/City/District/Village`) dan
`JenisAliasWilayah→RegionAliasType`
(`NamaLama/EjaanLain/Singkatan/BahasaLokal`→`FormerName/AlternateSpelling/Abbreviation/LocalLanguage`).

Migrasi `20260902121216_english_rename_reference_domain` ditulis manual
(bukan draft otomatis Prisma yang destruktif) memakai `RENAME TABLE`,
`ALTER TABLE ... CHANGE COLUMN`, `RENAME INDEX`, dan
`DROP/ADD FOREIGN KEY` — data dipertahankan (keempat tabel referensi masih
kosong saat migrasi dijalankan, jadi tidak ada risiko konversi nilai enum).
Konsumen teknis disesuaikan: `lib/wilayah.ts` (`parseIdWilayah→parseRegionId`,
`validasiDesaAktif→validateActiveVillage`), `prisma/wilayah-path.ts`
(`bangunUlangJalurWilayah→rebuildRegionPaths`), `prisma/import/import-wilayah.ts`,
`app/api/wilayah/cari/route.ts`, tab Biodata santri, tab Unit/Profil yayasan,
ekspor data akademik, dan validasi CRUD `desaId`.

**Sengaja tidak berubah**: rute publik `/api/wilayah/cari`, field relasi
`desaId` pada `Orang`/`Unit`/`ProfilLembaga` (menunggu Fase 2 rename
`Orang→Person`), teks/label berbahasa Indonesia yang tampil ke pengguna.
Rename model `Orang`, lalu ~80 model domain lain, disusul sweep global untuk
identifier/string tersisa, adalah pekerjaan lanjutan (task berjalan).

## 2026-09-02 — Fondasi skema wilayah/alamat ternormalisasi

Menambah model `Negara`, `Wilayah` (hirarki provinsi→kota→kecamatan→desa
dengan pintasan leluhur `provinsiId`/`kotaId`/`kecamatanId` dan riwayat lewat
`aktif`/`digantiDenganId`), `AliasWilayah`, dan `AlamatLuarNegeri` (satu-satu
per orang). `Orang`, `Unit`, dan `ProfilLembaga` mendapat `desaId` opsional
(FK ke `wilayah`, harus desa/kelurahan aktif — divalidasi server via
`lib/wilayah.ts`) plus `latitude`/`longitude` pada Unit & ProfilLembaga.
Kolom alamat teks lama (`alamat`, `rt`, `rw`, `kelurahan`, `kecamatan`,
`kabupaten`) dipertahankan sebagai data historis/fallback — tidak dihapus.

Migrasi `20260902104633_normalized_region_address` bersifat aditif saja.
Form identitas orang, Unit, dan Profil yayasan kini punya pemilih desa
(`PemilihWilayah`, autocomplete terproteksi sesi via `/api/wilayah/cari`).
Tab Biodata santri menampilkan alamat dari desa terpilih bila ada, dengan
alamat teks lama sebagai fallback.

**Belum selesai (sengaja ditunda untuk konfirmasi)**: importer dataset resmi
kode wilayah Kepmendagri 2025 belum dijalankan — tabel `wilayah` masih kosong
sampai data diimpor lewat proses terkontrol terpisah. Pendaftar PPDB belum
memiliki `desaId` (masih alamat teks bebas) karena perlu keputusan skema
tersendiri. Backfill alamat teks lama `Orang` ke `desaId` belum dibuat.

## 2026-09-02 — Redirect halaman awal staf diperbaiki

Pengalihan tamu dari `/` ke `/beranda` kini hanya dijalankan oleh layout staf,
mencegah redirect paralel Next.js yang sebelumnya tampil sebagai layar kesalahan.
Server dev di port 3226 juga dijalankan ulang dengan konfigurasi MySQL aktif.

## 2026-09-02 — Label deskripsi modal Identitas orang dihapus

Teks penjelasan di bawah judul modal "Tambah/Ubah identitas orang" dihapus
sesuai permintaan; form dan validasi tidak berubah.

## 2026-09-02 — Tombol aksi modal master data dipindah ke kanan

Tombol "Batal" dan "Simpan" pada footer modal form (mis. `/data/*`) kini rata
kanan, bukan rata kiri — urutan dan gaya tombol tidak berubah.

## 2026-09-02 — Gap kartu daftar data dihapus

Kartu daftar CRUD tidak lagi memberi margin atas tambahan setelah panel filter.
Tampilan `/data/santri-orang` kini tidak memiliki jarak vertikal ganda di atas kartu.

## 2026-09-02 — Pemilih peran langsung diterapkan saat dipilih

Tombol Terapkan di samping dropdown "Lihat sebagai" dihapus. Memilih peran
langsung memperbarui sesi, mencatat audit, dan kembali ke beranda dengan menu
sesuai peran yang dipilih.

## 2026-09-02 — Jarak ikon dropdown pemilih peran diperbaiki

Panah native pada dropdown "Lihat sebagai" diganti SVG yang diposisikan 12px
dari sisi kanan agar tidak terlalu mepet ke tepi. Tidak ada perubahan pada opsi
atau perilaku pergantian peran.

## 2026-09-02 — Label wajib pada formulir Master Data dihapus

Keterangan `* wajib diisi` di bagian aksi modal Master Data dihapus. Penanda
pada field yang wajib tetap tersedia; tidak ada perubahan pada validasi atau
perilaku penyimpanan.

## 2026-09-02 — Tombol formulir Master Data lebih jelas

Aksi pada modal tambah dan ubah Master Data kini memakai tombol teks **Batal**
dan **Simpan** alih-alih ikon saja. Operator dapat mengenali aksi form tanpa
mengandalkan tooltip atau memahami arti ikon; perilaku simpan dan pembatalan
tidak berubah.

## 2026-09-02 — Filter Master Data dapat dihapus per-kolom

Tombol Filter eksplisit pada `/data/<entity>` dihapus karena pencarian dan
pilihan dropdown sudah menerapkan filter saat nilainya berubah. Setiap input
filter yang aktif sekarang memiliki tombol hapus (`×`); mengosongkan dropdown
berfilter bawaan mengirim `Semua` agar nilai bawaan benar-benar dibatalkan.
Semua tindakan tetap memperbarui daftar saja lewat fetch parsial, tanpa
navigasi halaman atau perubahan data dan akses.

## 2026-09-02 — Filter Master Data juga tidak reload seluruh halaman

Lanjutan dari perbaikan pagination di bawah: mengetik di kotak cari atau
mengubah dropdown filter pada `/data/<entity>` sebelumnya tetap submit GET
biasa (navigasi penuh). `FilterBar` sekarang menerima `onFilterChange` opsional
— bila diisi, submit form di-preventDefault dan filternya dikirim ke `CrudList`
alih-alih navigasi. `CrudList` kini merender `FilterBar` sendiri dan menyimpan
`filters` sebagai state, jadi ubah filter memicu fetch parsial yang sama
dengan pagination (balik ke halaman 1). Tombol Reset juga direset lewat
`form.reset()` + callback, bukan tautan navigasi. Murni perbaikan UX, tidak
ada perubahan data atau akses.

## 2026-09-02 — Pagination Master Data tidak lagi reload seluruh halaman

Klik nomor halaman atau ubah "baris per halaman" pada `/data/<entity>` (mis.
staf-orang) sebelumnya memakai `<a href>`/navigasi penuh, sehingga filter dan
komponen pagination ikut ter-reload bersama tabel. Endpoint `GET
/api/crud/[entity]` sekarang menerima `halaman`, `limit`, dan filter query
untuk mengembalikan `{ rows, total }` terpaginasi; tabel dan pager dibungkus
komponen klien baru `CrudList` (`components/organisms/CrudList.tsx`) yang
mem-fetch data dan memperbarui URL lewat `history.pushState` tanpa navigasi.
`FilterBar` tidak berubah (tetap submit GET) — hanya perubahan halaman/limit
yang kini parsial. Murni perbaikan UX, tidak ada perubahan data atau akses.

## 2026-09-02 — Halaman entitas Master Data: hapus tautan "Kembali ke Master Data", rapatkan gap

Halaman `/data/<entity>` (dipakai semua entitas Master Data, mis. mapel,
santri) tidak lagi menampilkan tautan "← Kembali ke Master Data" di atas
filter — navigasi kembali sudah tersedia lewat sidebar. Jarak vertikal antara
kotak filter (CARI) dan kotak daftar data juga dirapatkan (16px → 10px).
Murni styling/UI, tidak ada perubahan data atau akses.

## 2026-09-02 — Layout Master Data: jarak antarseksi dipersempit

Jarak vertikal standar di area konten staf (`.pad`) diturunkan dari 16px ke
12px. Filter, tabel, dan pagination kini lebih rapat tanpa mengubah padding
internal card atau ukuran kontrol.

## 2026-09-02 — Sidebar: submenu Master Data bisa dibuka/tutup per grup, dianimasikan

Tiap kelompok di submenu Master Data (Data Orang per Peran, Dashboard, Data
Induk, dst.) kini punya heading yang berfungsi sebagai tombol toggle sendiri
(`aria-expanded` + chevron berputar), independen dari grup lain. Transisi
buka/tutup memakai animasi tinggi (`grid-template-rows` + opacity) alih-alih
render instan, dan hover/active pada `.menuitem`/`.submenuitem` diberi
transisi warna supaya sidebar tidak terasa kaku. Murni styling/UI, tidak ada
perubahan data atau akses.

## 2026-09-01 — Master Data: submenu entitas sesuai akses peran

Menu staf **Kelola Data** berganti nama menjadi **Master Data**. Saat menu
tersebut dibuka, sidebar menampilkan submenu bertingkat untuk setiap entitas,
dikelompokkan menurut modul dan hanya berisi data yang diizinkan oleh
`menu_peran` sesi aktif. Sumber daftar yang sama sekarang dipakai oleh halaman
`/data` dan sidebar, sehingga hak akses dan daftar keduanya selalu selaras.

Dampak operator: pilih Master Data lalu langsung pilih entitas dari sidebar;
pada layar sempit submenu disembunyikan agar navigasi bawah tetap ringkas.

## 2026-08-30 — /induk: panel kiri tak lagi ulang daftar lembaga, daftar diberi penanda unit

Lanjutan dari entri di bawah. Setelah lembaga naik jadi tab, panel kiri masih
menampilkan baris "Semua lembaga / SMP / MA / Madin" — dua kontrol untuk hal
yang sama. Baris lembaga dibuang dari `PohonLembaga.tsx`; panel kini memuat
**tingkat & kelas milik lembaga yang aktif** saja (judul ikut berubah menjadi
"Tingkat & kelas"), plus cabang Alumni dan "Belum berkelas". Saat belum ada
lembaga terpilih, panel menunjuk ke tab di atas — tingkat milik lembaga berbeda
tidak sebanding untuk ditumpuk jadi satu daftar.

Sebagai gantinya, di tab "Semua lembaga" tiap baris hasil diberi penanda
lembaga (`.tanda-unit` di globals.css). Penanda dibaca dari `kelasLain`, bukan
kolom `santri.unit`: kolom itu hanya memuat penempatan utama, sehingga santri
yang sekolah di SMP sekaligus mengaji di Madin akan kehilangan lembaga
keduanya justru di tampilan lintas-lembaga. Penanda otomatis hilang saat satu
lembaga/kelas dipilih karena saat itu semua baris berlabel sama.

Verifikasi (Playwright ke `http://202.59.200.26:3226`, superadmin): di "Semua
lembaga" panel hanya berisi ajakan memilih lembaga dan 20 penanda muncul
(termasuk baris ber-`SMP`+`MADIN` sekaligus); di `?unit=2` panel berisi Tingkat
VII/VIII/IX + Alumni dan penanda 0. Tanpa `pageerror`; `npx tsc --noEmit` bersih.

## 2026-08-30 — Lembaga jadi tab utama di /induk, /akademik, /kepegawaian

SMP, MA, dan Madin adalah organisasi terpisah, jadi pemilihan lembaga dinaikkan
menjadi keputusan pertama di halaman — bukan penyaring yang harus dicari.
Ditambahkan molekul bersama `components/molecules/TabLembaga.tsx` (diekspor
lewat barrel `@/components`) yang dipakai tiga modul:

- `/induk` — komponen baru `TabUnit.tsx` di atas baris penyaring; memetakan ke
  parameter `unit=` yang sudah ada, **bukan** `?tab=`, karena kunci `tab` sudah
  dipakai tab profil santri. Pohon "Lembaga & kelas" tetap ada untuk drill-down
  tingkat/kelas dan tersinkron dengan tab karena keduanya menulis filter sama.
- `/akademik` dan `/kepegawaian` — baris chip "Lembaga" di dalam `Penjelajah`
  diganti `TabLembaga`; chip tingkat/kelas/status tetap chip karena memang
  penyaring, bukan konteks. Posisinya tetap di ATAS tabbar modul supaya pilihan
  lembaga bertahan saat operator berpindah tab.

CSS: `.tab` jadi flex dan ditambah `.tab-cacah` (pil angka di dalam tab).

Dampak operasional: tidak ada perubahan skema atau migrasi. URL lama tetap
berlaku — tab hanya menulis penyaring yang sudah ada. Catatan untuk operator:
tab berlabel **Madin** mengirim `unit=Pondok`; itu benar, karena baris unit itu
ber-`key='Pondok'` dengan `nama='Madin'` di tabel `unit`.

Verifikasi (Chromium/Playwright ke `http://202.59.200.26:3226`): login
superadmin, tab render di ketiga halaman (induk 4 tab, akademik 4, kepegawaian
3) dengan cacah dari DB; memilih lembaga lalu berpindah tab tetap membawa
`unit=`; tanpa `pageerror`. Negatif: akun santri diarahkan keluar `/induk` dan
tab tidak dirender. `npx tsc --noEmit` bersih. Peran `guru` memang berhak atas
menu `induk` (8 peran), jadi akses guru ke halaman ini bukan kebocoran.

## 2026-08-30 — Kepala Madrasah MA diganti Khalimatus Sa'diyah (data)

SK MA (`SK_MA` di `prisma/import/import-struktur.ts`) dan `kepalaNama` unit MA
di `prisma/seed-dasar.ts` diperbarui: Kepala Madrasah kini **Khalimatus
Sa'diyah, S.Si** (sebelumnya Tika Kartika, S.Pd). Posisi Kordinator Tata Usaha
yang sebelumnya dijabatnya dikosongkan (`namaMentah: ''`) sampai penggantinya
ditentukan operator.

Dampak operasional: setelah deploy, jalankan ulang
`npm exec tsx prisma/import/import-struktur.ts` (upsert idempoten via
`skNomor`+`urutan`) agar tabel `jabatan_struktural` dan tampilan Struktur
Organisasi di kepegawaian ikut terbarui. Data 25-baris "Struktur Yayasan Kyai
Masduqi" belum dimasukkan — menunggu nomor SK dan masa berlaku dari operator.

## 2026-08-29 — Penetapan Madin Kelas 1 sesuai daftar resmi (data)

Daftar resmi TA 2026/2027 Gasal ditetapkan untuk Madin Kelas 1 (`#21`):
**50 anggota** cocok tepat dengan daftar operator, tanpa anggota kurang atau
berlebih. Delapan santri yang sebelumnya tercatat sebagai alumni dipulihkan
menjadi Mukim dan dijadikan penempatan utama Madin Kelas 1; riwayat pendidikan
Madin serta audit log mereka juga diperbarui.

Empat santri alumni lain dipulihkan sebagai Mukim dan penempatan utama Madin
Kelas 2 (`#29`), sehingga jumlah Kelas 2 tetap **19 anggota**. Santri SMP/MA
yang juga mengaji di Madin tetap mempertahankan penempatan utama SMP/MA mereka;
Madin dicatat sebagai keanggotaan kedua melalui `santri_kelas`.

Skrip idempoten `prisma/import/tetapkan-kelas-1-madin-2026.ts` menyimpan daftar
NIS, validasi seluruh identitas sebelum transaksi, mencatat pelepasan anggota
lama pada audit log, serta memverifikasi jumlah akhir Kelas 1.

Dampak operasional: daftar Kelas 1 Madin siap dipakai sebagai daftar resmi
TA aktif; Kelas 2 tetap berisi 19 santri yang telah diverifikasi.

## 2026-08-29 — 95 alumni Madin ditampilkan kembali di /induk (data)

Operator menyerahkan daftar alumni Madin dan meminta statusnya diperbaiki.
Pemeriksaan TA aktif `2026/2027 Gasal` memisahkan 11 nama yang masih tercatat
aktif di Madin, sehingga tidak disentuh. Sisa daftar menghasilkan **95 orang
unik** (bukan 103; `Ali Wafa` tercantum dua kali di sumber) yang sebelumnya
sudah memiliki `riwayat_pendidikan` Madin berstatus `Alumni`, tetapi belum
mempunyai baris `santri`. Karena pohon `/induk` menghitung dari `Santri`, cabang
Alumni Madin salah menampilkan 0.

Ditambahkan baris `santri` berstatus `Alumni`, unit Madin, tanpa kelas atau
`santri_kelas` aktif untuk 95 identitas tersebut. Semua penulisan tercatat di
`audit_log`; 11 santri Madin aktif tetap tidak termasuk alumni. Skrip idempoten
`prisma/import/tetapkan-alumni-madin.ts` menyimpan daftar identitas dan
verifikasi total agar koreksi dapat diulang tanpa membuat duplikat.

Dampak operasional: cabang Alumni Madin di `/induk` sekarang menampilkan
**95 alumni**; status dan kelas 11 santri Madin aktif tidak berubah.

## 2026-08-29 — Anggota Madin Kelas 2 dilengkapi jadi 19 santri (data, bukan kode)

Operator meminta verifikasi anggota Madin Kelas 2 (TA 2026/2027 Gasal, kelas
`#29`) terhadap daftar 19 nama. 14 sudah cocok; 5 belum punya penempatan
Madin sama sekali:

- **Addafi Syar'i Muhammad** — sudah aktif (Mukim) di **MA Kelas 1**;
  ditambahkan Madin Kelas 2 sebagai penempatan **kedua** (`santri_kelas`),
  kelas utamanya tetap MA.
- **Gus Ramadhani, Maulana Ridwan Aqilah, Muhammad, Muhammad Fathian Akbar Al
  Aqil** — keempatnya berstatus **Alumni SMP** tanpa kelas aktif sama
  sekali. Atas konfirmasi operator, status diubah ke **Mukim** dan
  ditempatkan di Madin Kelas 2 sebagai penempatan **utama**
  (`santri.unit_id/kelas_id` + `santri_kelas`).

Dieksekusi lewat SQL langsung (bukan skrip Prisma baru — koreksi data
ad-hoc untuk 5 orang bernama, bukan operasi berulang) di dalam transaksi
tunggal, tercatat di `audit_log`. Terverifikasi: `santri_kelas` untuk
kelas `#29` sekarang berjumlah 19 baris, seluruhnya cocok dengan daftar
operator. Tidak ada perubahan skema atau kode aplikasi.

## 2026-08-29 — Santri Madin aktif tidak lagi dicap alumni di /induk (`44b1680c`)

Agus Rosifat Aqli muncul sebagai alumni Madin padahal masih aktif di Tingkat VI
TA 2026/2027. Penyebabnya syarat alumni yang hanya memeriksa "punya riwayat
berstatus `Alumni` di unit itu": `import-santri-madin-riwayat.ts` menulis satu
baris `riwayat_pendidikan` **per tahun ajaran**, dan setiap baris TA lampau
berstatus `Alumni`. Jadi santri yang naik dari Kelas 2 (2021/2022) ke Tingkat VI
tetap menyandang baris `Alumni` untuk tahun lamanya — 11 santri Madin kena.

- `app/(staf)/induk/filter.ts`: helper `alumniDiUnit()` — alumni sebuah lembaga
  kini berarti punya riwayat `Alumni` di unit itu **dan** tidak lagi menempati
  rombel unit yang sama (`SantriKelas`). Kepindahan antar-lembaga tetap terbaca
  alumni (lulus SMP lalu mukim di MA: rombel SMP-nya sudah tidak ada), jadi
  angka SMP tidak berubah.
- Cabang "Alumni" tanpa unit terpilih tidak bisa lagi dijawab satu predikat
  tunggal — seseorang bisa beralumni di satu lembaga sambil aktif di lembaga
  lain — jadi `whereFilter` menerima daftar unit dan menyusunnya sebagai OR per
  unit. Daftar itu datang dari `unitIdsPohon()` (baru, di `pohon.ts`), dipakai
  bersama oleh `page.tsx` dan `ambilPohon()`.

Dampak operasional: cacah alumni Madin 11 → 0, SMP tetap 24, MA tetap 0. Tidak
ada perubahan skema atau data — hanya cara membacanya. Terverifikasi lewat
Prisma dan SQL; `npx tsc --noEmit` bersih.

## 2026-08-29 — Kelas Madin tidak lagi tampil ganda di pohon /induk (`4802ad9a`)

"Kelas 6" muncul **dua baris** di bawah Tingkat VI (5 dan 2) — dan sebenarnya
setiap tingkat Madin bernasib sama. Penyebabnya: satu rombel punya baris `Kelas`
sendiri di tiap tahun ajaran, sedangkan 93 santri Madin masih menempati kelas
**TA 2025/2026** (warisan `import-santri-madin-riwayat.ts` yang menyetel
`kelasId` ke TA berkas presensinya), padahal TA aktif adalah 2026/2027.

- `prisma/import/pindah-santri-ke-ta-aktif.ts` (baru, idempoten,
  `npm run pindah:santri-ta-aktif`): memindahkan `santri.kelasId` **dan** baris
  `santri_kelas` ke kelas bernama sama di TA aktif. Memvalidasi seluruh
  pemetaan dulu (batal bila ada kelas TA lama tanpa kembaran di TA aktif), jadi
  tidak ada partial write. `riwayat_pendidikan` tidak disentuh — sejarah utuh.
- `app/(staf)/induk/pohon.ts` (ikut commit `08a49dcc`): daftar kelas disaring ke
  `tahunAjaran.aktif`, supaya kelas TA lama tidak lagi jadi baris kedua.
- Ini **bukan kenaikan tingkat** — santri pindah ke kelas dengan nama sama
  persis (Kelas 3 lama → Kelas 3 TA aktif). Promosi tetap proses terpisah.

Hasil pohon Madin: I'dad 23, I 19, II 14, III 11, IV 9, V 12, **VI 7** —
masing-masing satu baris.

## 2026-08-29 — Santri bisa menempati lebih dari satu kelas; anggota I'dad Madin ditetapkan

Commit `08a49dcc`.

Sebelumnya satu santri hanya bisa punya satu `unit_id`/`kelas_id`, padahal
kenyataannya banyak siswa SMP/MA yang **juga** mengaji di Madin. Ditambahkan
tabel pivot **`santri_kelas`** (migrasi `20260829190000_santri_multi_kelas`),
di-backfill otomatis dari penempatan tunggal yang sudah ada — jadi tidak ada
data yang perlu diisi ulang manual.

Kolom `santri.unit_id/kelas_id` **tetap dipertahankan** sebagai penempatan
*utama*, dipakai modul yang memang hanya butuh satu jawaban (kartu identitas,
tagihan, kamar). Yang berubah: pohon lembaga dan penyaring unit/kelas di
`/induk` kini membaca pivot, sehingga santri berkelas jamak muncul di **kedua**
cabang lembaga. Chip "Tanpa kelas" kini berarti tidak punya penempatan sama
sekali.

Skrip baru `npm run kelas:idad-madin` menetapkan 23 anggota resmi kelas I'dad
Madin berdasarkan **NIS** (kebal terhadap beda penulisan nama — daftar operator
menulis "M Ilham Arifin", DB menyimpan "Muhammad Ilham Arifin"). 17 siswa SMP
ditambahkan sebagai kelas kedua tanpa melepas rombel SMP-nya. Skrip idempoten;
santri di I'dad yang tidak ada di daftar hanya dilepas dari kelas itu, tidak
dihapus dari sistem.

**Yang perlu diketahui operator:**

- Angka per lembaga di `/induk` kini bisa **lebih besar dari jumlah santri**,
  karena satu santri sengaja terhitung di SMP dan Madin sekaligus. Ini benar,
  bukan duplikat.
- Kelas I'dad Madin masih **kembar**: `#36` (kosong) dan `#37` (berisi 23).
  Skrip otomatis memakai yang berisi, tapi baris kosongnya belum dibersihkan.
- "Kelas 6" Madin juga masih terpecah dua baris (`#45` 5 santri, `#33` 2 santri).
  Belum ditangani di commit ini.
- Tiga nama tersimpan dengan gelar yang janggal untuk santri
  (`Muhammmad Bismar As Sidiq, S.H`, `Wardatul Haizatil Husna, S.Sos., Gr`) —
  perlu dikonfirmasi apakah itu memang santri atau salah masuk tabel.

## 2026-08-29 — Cabang Alumni dicacah per lembaga saja, bukan per tingkat/kelas

Atas permintaan operator, simpul **Alumni** di pohon lembaga `/induk` tidak lagi
dipecah per tingkat maupun per kelas — cukup satu angka per lembaga. Alasannya:
keanggotaan alumni berasal dari `RiwayatPendidikan`, sedangkan tingkat/kelas
menggambarkan penempatan rombel santri **aktif**. Menampilkan keduanya bersamaan
memunculkan angka menyesatkan (mis. alumni SMP yang kini mukim di MA ikut
terhitung di "MA Tingkat X"). Total "Semua lembaga" juga ikut mencacah alumni di
mode ini supaya tidak bentrok dengan angka lembaga di bawahnya.

Perubahan kodenya (`app/(staf)/induk/pohon.ts`, penanda `modeAlumni`) ikut
terbawa pada commit `ecf4f2d0`; berkas diagnostik sementara `_cek.ts` yang
tidak sengaja ikut ter-commit di sana dihapus menyusul.

Verifikasi Playwright ke `http://202.59.200.26:3226` — kontrol `?unit=4` (Mukim)
tetap merender 7 baris Tingkat, sedangkan `?status=Alumni`, `?alumni=4` (Madin)
dan `?alumni=2` (SMP) merender **nol** baris Tingkat/Kelas dengan Hasil 35 / 11 /
24 yang cocok dengan angka pohon, tanpa `pageerror`.

Catatan id unit untuk penelusuran berikutnya: MA=1, SMP=2, Poskestren=3, Madin=4.

## 2026-08-29 — Gabungkan duplikat santri Madin: Bismar & Wardatul (`ecf4f2d0`)

Wardatul Haizatil Husna dan M. Bismar As Sidiq muncul **dua kali** sebagai
santri Madin Kelas 6. Penyebabnya sama seperti kasus Alfan Jamil: mereka sudah
ada di DB sebagai guru MA dengan nama **bergelar** ("…, S.H" / "…, S.Sos., Gr"),
sedangkan roster Madin menulis nama tanpa gelar. `import-santri-madin-riwayat.ts`
mencocokkan nama persis dan barisnya tidak diberi `orangIdExisting`, jadi skrip
membuat `Orang` + `Santri` baru (#589/#590, NIS `2025PONDOK128`/`2025PONDOK130`).

- Keputusan operator: keduanya **memang** santri Madin Kelas 6 (guru MA yang
  juga mengaji di Madin) — yang salah hanya duplikatnya.
- `prisma/import/gabung-santri-madin-duplikat.ts` (baru, idempoten,
  `npm run gabung:santri-madin-duplikat`): memindahkan `riwayat_pendidikan`
  duplikat ke `Orang` asli lalu menghapus duplikatnya. Skrip menolak jalan bila
  duplikat punya nilai/tagihan/presensi/hafalan/akun user (di kasus ini nol).
- `import-santri-madin-riwayat.ts`: baris no. 128 & 130 dipatok
  `orangIdExisting: 414` dan `419` agar tidak menduplikasi lagi bila diimpor ulang.
- Hasil: Bismar (`2026PONDOK004`) riwayat 2021/2022 Kelas 2 + 2025/2026 &
  2026/2027 Kelas 6; Wardatul (`2026PONDOK006`) riwayat 2025/2026 & 2026/2027
  Kelas 6. Wildana Izza Afkarina tidak terdampak — barisnya sudah memakai
  `orangIdExisting` sejak awal.

Dampak operator: dua nama ganda di daftar santri Madin Kelas 6 hilang; jumlah
santri Madin berkurang 2. Tidak ada data akademik/keuangan yang hilang.

## 2026-08-29 — Pegawai bisa bertugas di lebih dari satu unit; Alfan Jamil digabung (`d32da92f`)

"Alfan Jamil, M.Si, Gr" (`GTT-MA-005`, guru Fikih MA — dari `DATA GURU.xlsx`)
dan "Alfan Jamil" (`AST-004`, asatidz Madin) adalah **orang yang sama**, tetapi
terdaftar sebagai dua `Pegawai` dengan dua `Orang` terpisah. `Pegawai.unitId`
hanya menampung satu lembaga, sehingga duplikat itu satu-satunya cara ia muncul
di MA sekaligus Madin.

- Skema: tabel baru `pegawai_unit` (migrasi `20260829180000_pegawai_multi_unit`)
  — penugasan pegawai↔unit dengan `jabatan`/`nip` per unit dan penanda `utama`.
  `Pegawai.unitId` **tetap ada** dan berarti unit utama; migrasi mengisi
  `pegawai_unit` dari `unitId` yang sudah ada (39 baris).
- Data: `prisma/import/gabung-alfan-jamil.ts` (idempoten) melebur `AST-004` ke
  `GTT-MA-005` — Madin jadi penugasan kedua, gelar "Gus" + panggilan "Gus Alfan"
  pindah ke `Orang` yang bertahan, nama dirapikan jadi "Alfan Jamil" (gelar
  akademik tidak lagi menempel di kolom nama), lalu `Orang` duplikat dihapus.
  Tidak ada data transaksional yang hilang: jadwal/piket/jurnal/presensi/beban
  jam/slip gaji/SK kedua baris nihil; satu-satunya `KomponenGaji` ada di baris
  yang dipertahankan.
- Penyaring: `whereUnit()` di `app/(staf)/kepegawaian/filter.ts` kini
  mencocokkan unit utama **ATAU** penugasan tambahan (OR), jadi pegawai lintas
  lembaga muncul di kedua chip, dan pegawai yang belum punya baris
  `pegawai_unit` (dibuat lewat menu CRUD/seed) tetap terhitung — tabel jung
  tidak wajib terisi. `pohon.ts` menghitung chip lewat `whereUnit` yang sama
  agar angka chip persis sama dengan jumlah baris saat diklik.
- `import-asatidz.ts`: daftar `SUDAH_TERDAFTAR` memetakan asatidz yang sudah
  jadi pegawai lewat impor lain ke NIP yang bertahan; untuk mereka impor hanya
  menambah penugasan Madin, tidak membuat `Orang`/`Pegawai` kembar. Impor ulang
  diverifikasi: 0 baru, `AST-004` tidak lahir kembali.

**Dampak operator**: Alfan Jamil kini satu baris di /kepegawaian, muncul pada
filter MA maupun Madin (MA 17, Madin 22 — Alfan terhitung di keduanya). Total
pegawai turun 39 → 38. Untuk pegawai lintas lembaga berikutnya, tambahkan baris
`pegawai_unit`, jangan membuat baris `Pegawai` kedua.

## 2026-08-29 — Impor riwayat Madin 2019–2026 dari berkas presensi (`1a6c3622`)

Berkas operator `docs/PRESENSI DAN JURNAL JULI-AGUSTUS AJARAN BARU
2025_111924.xlsx` dimuat lewat `npm run import:santri-madin-riwayat`:
**248 orang** (188 baru, 60 dicocokkan ke `Orang` yang sudah ada) dan
**284 baris `riwayat_pendidikan`** pada unit Madin, lintas empat tahun ajaran
2019/2020, 2021/2022, 2023/2024, 2025/2026.

Yang perlu diketahui operator:

- **Hanya roster 2025/2026** yang menyentuh tabel `santri` (status `Mukim`,
  NIS `2025PONDOK001+`). TA lama murni riwayat berstatus `Alumni`, jadi status
  santri MA/SMP yang juga mengaji di Madin **tidak berubah** — 53 santri unit
  lain hanya bertambah riwayat Madin, unit/kelasnya dibiarkan.
- **TahunAjaran 2019/2020, 2021/2022, 2023/2024 dibuat baru** dengan
  `aktif: false` (generator hanya mulai 2024/2025).
- **Jenis kelamin 188 orang baru adalah terkaan** (dari penanda sheet PA/PI
  dan kata kunci nama) — berkas presensi tidak punya kolom JK. Mohon dikoreksi
  bila ada yang keliru; kolom NIS/NISN/TTL/alamat/wali sengaja kosong.
- Keputusan operator yang dipatok di skrip: sheet `Lembar1` dibaca sebagai
  **Kelas 6** (judul internalnya begitu, bukan nama sheet-nya); `Ali Wafa`
  yang tercatat ganda di TA 2021/2022 diambil **Kelas 4**; `M Ilham Arifin`
  dan `M Irham Arifin` adalah **dua orang berbeda**.
- Skrip idempoten — dijalankan ulang tidak menggandakan data.

## 2026-08-29 — Chip Alumni /induk ikut riwayat pendidikan (`dc091133`)

Chip **Status: Alumni** menampilkan 17, sedangkan cabang **SMP → Alumni** di
pohon lembaga menampilkan 24 — dua sumber berbeda untuk pertanyaan yang sama.
Chip memakai kolom `santri.status`, cabang memakai `riwayat_pendidikan`.
Selisih 7 adalah alumni SMP yang kini **mukim di MA Kelas 1** (Achmad Tsaaqib,
Addafi Syar'i, Aisyah Aulia, Errena Tembang, M. Uwais Qorne, Maulana Malik
Ibrahim, Siti Munawaroh), jadi status mereka `Mukim`, bukan `Alumni`.

Atas pilihan operator, chip disamakan dengan pohon: `whereFilter` menjawab
"Alumni" selalu dari `riwayat_pendidikan`, dan `unit=` pada status Alumni
berarti "alumni lembaga mana" (bukan unit santri sekarang). Cacah lembaga di
pohon saat status Alumni juga diambil dari riwayat alumni — sebelumnya semua
baris lembaga tampil `0` karena alumni tidak menempati rombel.

Dampak operator: 7 santri MA Kelas 1 itu kini **muncul di daftar chip Alumni**
meski masih mukim aktif — itu memang alumni SMP-nya. Jangan pakai chip ini
sebagai daftar "santri tidak aktif".

## 2026-08-29 — "Belum berkelas" disembunyikan untuk status non-aktif (`487fae84`)

Alumni dan santri Keluar per definisi tidak punya `kelasId`, jadi saat chip
status non-aktif dipilih, seluruh hasil jatuh ke cabang "Belum berkelas" (mis.
17 dari 17 alumni) — penyaring yang tidak menyaring apa pun. Cabang itu kini
hanya tampil untuk status aktif (Mukim). Selain itu, memilih status non-aktif
ikut membersihkan sisa filter unit/kelas dari klik sebelumnya, supaya hasil
tidak mendadak kosong. Tidak ada perubahan skema.

## 2026-08-29 — Filter status kembali di /induk (`56371750`)

Chip **Status** (Aktif / Alumni / Keluar) di penyaring `/induk` hilang sejak
`6cd16b95` yang membatasi halaman ke santri Mukim. Sekarang dikembalikan:
`?status=` dibaca lagi, chip aktifnya muncul di baris "filter aktif", dan
bawaan tanpa pilihan tetap Mukim. Memilih status membersihkan cabang "Alumni"
per unit di pohon lembaga (keduanya menjawab pertanyaan yang sama), dan cabang
"Belum berkelas" disembunyikan saat status non-aktif karena tidak menyaring apa
pun. Operator: alumni kini bisa dilihat lintas unit lewat chip Alumni.

## 2026-08-29 — 7 santri masuk Madin Tingkat VI (Kelas 6) TA 2026/2027

Skrip `prisma/import/import-santri-madin-6-2026.ts` (`npm run
import:santri-madin-6-2026`) mendaftarkan 7 santri ke `Kelas 6` unit Pondok/Madin,
ber-NIS pola `2026PONDOK001..007`, status `Mukim`, plus baris `RiwayatPendidikan`
TA 2026/2027. Idempoten (pencocokan nama / `orangId` tetap); dijalankan dua kali,
hasil akhir sama.

Dampak operator: **tiga dari tujuh adalah pegawai MA aktif yang sama** —
M. Bismar As Sidiq (Guru Mapel), Wardatul Haizatil Husna (Guru Mapel), dan
Wildana Izza Afkarina (Bendahara/TU). Atas konfirmasi operator, mereka memang
guru/TU yang juga mengaji di Madin, jadi baris `Santri` ditambahkan ke `Orang`
yang sudah ada (bukan orang baru) dan baris `Pegawai`-nya tidak disentuh.
Konsekuensinya nama mereka kini muncul di daftar santri `/induk` lengkap dengan
gelar. Biodata NIK/NISN/TTL/alamat/wali belum diserahkan, jadi masih kosong untuk
empat santri baru — perlu dilengkapi lewat menu Induk bila dibutuhkan.

## 2026-08-29 — Madin: tambah Tingkat I'dad di bawah Kelas I–VI

Jenjang diniyah Madin kini I'dad + I–VI. Kelas baru `Kelas I'dad` (tingkat `'0'`,
supaya terurut paling depan) ditambahkan di `prisma/seed.ts` dan sudah di-upsert
ke DB uji (kelas id 36, unit Pondok, TA 2026/2027). Pohon `/induk` memberi label
romawi khusus Madin: `Tingkat I'dad`, `Tingkat I` … `Tingkat VI`.

Dampak operator: santri Madin yang belum lancar baca kitab/Al-Qur'an dapat
ditempatkan ke `Kelas I'dad` lewat menu Induk/Kesantrian seperti kelas lain.

## 2026-08-29 — 22 Asatidz/Asatidzah masuk sebagai Pegawai + kolom gelar

`Orang` dapat tiga kolom baru: `gelar` (KH./Gus/Ning/Nyai Hj./Ustadz/Ustadzah),
`panggilan`, dan `nama_lengkap` — migrasi `20260829170000_orang_gelar_panggilan`.
Kolom `nama` tetap nama tanpa gelar dan tetap jadi kunci pencocokan jadwal guru.

Importir baru `npm run import:asatidz` menulis 18 Asatidz + 4 Asatidzah ke
`Orang` + `Pegawai` unit **Pondok**, NIP internal `AST-001`…`AST-022`, jabatan
awal "Asatidz"/"Asatidzah". Idempoten; impor ulang **tidak** menimpa `jabatan`
dan `unitId` supaya perubahan yang dilakukan operator lewat aplikasi bertahan.

Dampak operator: **belum ada akun login** untuk 22 orang ini — penugasan peran
(staf, pengasuh, bendahara, dst.) dan pembuatan user dilakukan lewat aplikasi.
Satu orang bisa multi-peran (`user_peran`), multi-jabatan (`jabatan_struktural`),
sekaligus terdaftar sebagai santri/siswa, karena `Pegawai` dan `Santri` sama-sama
menggantung ke satu baris `Orang`.

## 2026-08-29 — Cabang Alumni /induk dikembalikan, tidak lagi peduli kelas

Commit `6cd16b95` sempat menghapus total cabang "Alumni" dari pohon lembaga
`/induk` (hanya sisakan santri aktif/Mukim). Dikembalikan karena kebutuhan
operator: melihat siapa saja alumni satu unit, terlepas dari kelas/penempatan
aktifnya sekarang.

`filter.ts` `whereFilter` kembali punya cabang `alumniUnitId`: saat dipilih,
syarat kelas/unit/status aktif **sama sekali diabaikan** — santri disaring
murni lewat `RiwayatPendidikan` (unit + status Alumni). Santri yang alumni SMP
tapi kini mukim MA tetap muncul di cabang Alumni SMP. `hrefInduk` membuat
simpul Alumni dan simpul unit/kelas saling meniadakan (pilih satu, yang lain
kebersih). `pohon.ts` menghitung cacah alumni per unit lewat query terpisah
(bukan turunan `whereDasar`) dengan alasan yang sama. `PohonLembaga.tsx`
merender simpul Alumni per unit lagi.

Verifikasi: `npx tsc --noEmit` bersih untuk modul `/induk`.

## 2026-08-29 — MA Kelas 1 TA 2026/2027 dikembalikan ke 8 santri resmi

Skrip baru `prisma/import/perbaiki-ma-kelas1-2026.ts` (`npm run
fix:ma-kelas1-2026`) menegakkan daftar tertutup 8 NIK sesuai tabel operator.
Dua penyimpangan ditambal:

- **3 santri gelombang 1 tercecer** (Achmad Tsaaqib, Addaafi Syar'i, Aisyah
  Aulia) — tergerus jadi `unit = SMP`, `status = Alumni`, tanpa kelas oleh
  `import-alumni-smp-2025-2026.ts` yang jalan belakangan. Dikembalikan ke MA
  Kelas 1, `Mukim`, tahun masuk 2026.
- **13 alumni SMP ikut terbawa masuk** (NIS 2026MA013..025) oleh
  `import-siswa-ma-2026-gelombang2.ts`. Dikeluarkan dari rombel: kembali ke
  `unit = SMP`, `status = Alumni`, `kelasId = null`, `tahunMasuk = null`.

**Dampak operasional.** Lulus SMP **tidak** otomatis berarti masuk MA — alumni
boleh berdiri tanpa kelas. `import-siswa-ma-2026-gelombang2.ts` dibangun di atas
asumsi sebaliknya, jadi skripnya **dinonaktifkan**: entri `import:siswa-ma-2026-g2`
dihapus dari `package.json` dan berkasnya diberi peringatan jangan-dijalankan
(dipertahankan sebagai catatan sumber biodata/wali tabel Dinkes). Menjalankannya
lagi akan mengulang kesalahan yang sama.

Koreksi biodata yang ikut masuk (semua bekas gelombang 2): jenis kelamin
**Achmad Tsaaqib** dibetulkan `P` → `L` (sesuai tabel operator dan pola NIK),
dan `Orang.hp` empat santri pertama dikosongkan karena yang tersimpan
sebenarnya nomor **wali** — nomor itu tidak hilang, tetap ada di `RelasiWali`
yang memang jalur kontak notifikasi.

Baris `Santri` yang dikeluarkan tidak dihapus dan NIS `2026MA0xx`-nya
dibiarkan: mereka masih punya `Nilai`/`Presensi`/`NilaiUjian` hasil seed.
Skrip idempoten (kunci NIK) dan memvalidasi jumlah akhir rombel = 8.

Verifikasi: `npx tsc --noEmit` bersih; Playwright ke
`http://202.59.200.26:3226/induk?unit=1` — 8 nama hadir di cabang MA, 13 nama
absen, tanpa `pageerror`.

## 2026-08-29 — Sinkron biodata & wali 24 alumni SMP 2025/2026

Commit `8438da9d`. `import-alumni-smp-2025-2026.ts` kini tidak hanya menulis
`RiwayatPendidikan`, tapi juga menyinkronkan biodata dari berkas data diri
terbaru: RT/RW, kelurahan, kecamatan, kabupaten, HP santri, serta nama/NIK/HP
wali. Kolom yang kosong di sumber tidak menimpa nilai lama.

Koreksi data yang masuk: HP wali **Reni Hartini** (Achmad Tsaaqib) dan **Nur
Hamidah** (Maulana Malik Ibrahim) diperbarui ke nomor terbaru; kelurahan
**Mutma'inatus Zahro** dibetulkan dari `Nglanjurk` ke `Nglanjuk`. Peran
Ayah/Ibu yang sudah dikenal dari sumber MA ditulis eksplisit di data, supaya
kolom gabungan "NAMA IBU/AYAH/WALI" milik berkas SMP tidak menurunkan peran
`Ibu` yang sudah tercatat menjadi `Wali`.

Dampak operator: 24 riwayat kelulusan SMP IX-A TA 2025/2026 utuh di basis
data (`riwayat_pendidikan`), meski sejak commit `6cd16b95` tidak lagi
ditelusuri lewat /induk. Skrip idempoten — aman dijalankan ulang dengan
`npm run import:alumni-smp-2025`.

## 2026-08-29 — /induk hanya data induk aktif: alumni & keluar dihapus

Halaman `/induk` sekarang **murni data santri aktif (Mukim)**. Yang dihapus:
cabang **Alumni** per unit di pohon lembaga (beserta param `?alumni=`), chip
status **Alumni** dan **Keluar**, serta param `?status=`. `whereFilter()`
mengunci mati `status = 'Mukim'`, jadi tidak ada lagi jalan dari URL untuk
memunculkan alumni atau santri keluar di halaman ini — `?status=Alumni` dan
`?alumni=1` kini menghasilkan daftar aktif yang sama.

Dampak operator: baris chip di atas daftar tinggal **Jenis kelamin** dan
**Angkatan**; 24 lulusan SMP tidak lagi bisa ditelusuri dari /induk. Ini
membatalkan fitur cabang Alumni dari commit `0965c780`/`adf80e90`.
Terverifikasi via Playwright ke `http://202.59.200.26:3226/induk` (login
superadmin): 74 santri cocok, tanpa `pageerror`.

## 2026-08-29 — Naik kelas 11 santri MA ke Kelas 2 + biodata lengkap di /induk

Sebelas santri MA angkatan 2025 masih menunjuk **Kelas 1 (tingkat 10, TA
2025/2026)** padahal tahun ajaran aktif sudah 2026/2027, sehingga rombel
**Kelas 2 (tingkat 11)** kosong. Skrip baru `prisma/import/promosi-ma-2026.ts`
(`npm run promosi:ma-2026`, idempoten) memindahkan mereka ke Kelas 2 TA
2026/2027 dan mencatat `RiwayatPendidikan` MA Kelas 1 TA 2025/2026 berstatus
`Mukim` (naik kelas, bukan lulus) agar jejak jenjangnya tetap ada.

NIS **Muhammad Fajar Putra Sulhari** dikoreksi dari NIS sintetis `2025MA007`
menjadi NIS resmi `131235730007250129` yang baru diterbitkan operator;
`import-siswa-ma-2025.ts` ikut disesuaikan agar sumbernya konsisten.

Tab Biodata `/induk` kini merender **NIK, No. KK, anak ke-N dari M saudara,
hobi, cita-cita, no. HP, dan asal sekolah** — semuanya sudah tersimpan di
`Orang` sejak impor, tapi tidak pernah ditampilkan. Tidak ada perubahan skema.

Dampak: operator melihat buku induk yang lengkap, dan rombel MA kelas XI kini
berisi 11 santri. Verifikasi Playwright ke `http://202.59.200.26:3226`: login
superadmin, 6 tab `/induk` tanpa `pageerror`, nilai biodata & NIS baru tampil.

## 2026-08-29 — Cabang Alumni /induk tersembunyi saat status Mukim (adf80e90)

Saat penyaring STATUS berada di **Aktif** (Mukim — juga nilai bawaan), cabang
**Alumni** di pohon lembaga tidak lagi ditampilkan: cacahnya dipaksa 0 sehingga
simpulnya hilang. Alumni baru muncul kembali ketika operator memilih status
Alumni/Keluar. Dampak: cacah unit di pohon kini konsisten dengan daftar santri
aktif — tidak ada lagi baris "Alumni 17" di bawah SMP saat melihat santri aktif.

## 2026-08-29 — Simpul "Alumni" per unit di pohon /induk

Pohon lembaga `/induk` kini punya cabang **Alumni** sejajar tingkat kelas di
bawah tiap unit (label cukup "Alumni" — unitnya sudah tersirat dari hierarki).
Cabang ini bersandar pada `RiwayatPendidikan`, bukan penempatan aktif, sehingga
santri yang lulus SMP lalu mukim di MA muncul di **dua** tempat sekaligus:
Alumni SMP dan kelas aktifnya di MA. Filter baru `?alumni=<unitId>` saling
meniadakan dengan `?unit=`/`?kelas=` di `hrefInduk`.

Dampak operator: di simpul Alumni, chip Status tidak lagi default ke "Aktif" —
semua lulusan tampil, dan Status dipakai untuk memisah yang lanjut (Mukim) dari
yang benar-benar keluar. Data sekarang: SMP 24 alumni = 17 Mukim (lanjut MA) +
7 Alumni. Cacah unit tetap menghitung penempatan aktif saja agar tidak dobel.

## 2026-08-29 — Filter status /induk default ke santri aktif (Mukim)

`whereFilter` di `app/(staf)/induk/filter.ts` sebelumnya tidak menyaring
status kalau operator belum memilih chip Status, jadi santri Alumni/Keluar
ikut tercampur di daftar & pohon lembaga (termasuk 7 alumni SMP IX-A yang
`kelas_id`-nya sempat masih terisi — sudah dibersihkan langsung di DB).
Sekarang tanpa filter status eksplisit, query selalu menambahkan
`status: 'Mukim'`; Alumni/Keluar baru muncul saat chip statusnya dipilih.
Dampak: total "Hasil" dan cacah di pohon lembaga di `/induk` sekarang
menghitung santri aktif saja secara default.

## 2026-08-29 — Riwayat kelulusan SMP IX-A 2025/2026 untuk 24 alumni

Ditambahkan model `RiwayatPendidikan` (migrasi
`20260829150000_add_riwayat_pendidikan`) untuk mencatat jenjang yang pernah
dijalani seorang `Orang`, terpisah dari `Santri.status/unitId/kelasId` yang
hanya menyimpan jenjang AKTIF. Diperlukan karena 24 siswa kelas IX-A SMP
lulusan TA 2025/2026 yang diserahkan operator TERNYATA sudah ada di DB — 18
dari 24 sudah aktif sebagai santri MA Kelas 1 (Mukim, TA 2026/2027). Menulis
status `Alumni` langsung ke `Santri` akan menghapus status MA aktif mereka
(satu `Orang` cuma boleh punya satu baris `Santri`), jadi kelulusan SMP
dicatat sebagai baris `RiwayatPendidikan` lewat skrip baru
`npm run import:alumni-smp-2025` (24 baris di-upsert lewat pencocokan NIK,
tanpa mengubah `Santri` yang ada). Tab Biodata di `/induk`
(`TabBiodata.tsx`) sekarang menampilkan kartu "Riwayat pendidikan" per
baris `RiwayatPendidikan`. Catatan: NISN Errena Tembang Sosialista Tazheva
di sumber operator (`0112234300`) berbeda dari yang tersimpan di DB
(`0112234304`) — dicocokkan lewat NIK, NISN tidak diubah tanpa konfirmasi.

## 2026-08-29 — Ganti santri/tab di /induk tidak reset scroll ke atas

Memilih santri di daftar (`DaftarSantri.tsx`) dan berpindah tab profil
(`page.tsx`) memakai `<Link>` ke query `?sel=&tab=` — Next.js App Router
men-scroll ke atas pada tiap navigasi begitu, walau posisi elemen sama.
Ditambahkan `scroll={false}` di kedua tautan itu supaya posisi scroll
operator tetap terjaga saat menjelajah daftar panjang.

## 2026-08-29 — Indikator "Belum berkelas" jadi tautan filter di /induk

Baris "Belum berkelas" di pohon lembaga (`PohonLembaga.tsx`) sebelumnya cuma
teks statis. Sekarang jadi tautan yang mengeset `?kelas=none`, menyaring
daftar ke santri dengan `kelasId` null (klik ulang mematikannya). `FilterInduk.kelasId`
diperluas ke `number | 'none'` di `app/(staf)/induk/filter.ts`, dan
`whereFilter` menerjemahkan `'none'` ke `{ kelasId: null }`. Diverifikasi
lewat Playwright ke `http://202.59.200.26:3226/induk`: hasil berubah dari
89 → 1 santri saat filter aktif.

## 2026-08-29 — Urutan lembaga SMP-MA-Madin & rename kelas IX-A/IX-B

Urutan lembaga di pohon /induk diubah dari Madin → MA → SMP menjadi
SMP → MA → Madin lewat `URUTAN_UNIT` di `app/(staf)/induk/pohon.ts`.
Kelas 3A dan 3B pada SMP Tingkat IX (tahun ajaran aktif 2026/2027 Gasal)
di-rename langsung di data (`Kelas.nama`) menjadi IX-A dan IX-B, bukan
sekadar label tampilan — perubahan ini terjadi di database, bukan diff
kode. Ditemukan juga (dilaporkan, belum diperbaiki): MA Tingkat X
menampilkan dua kelas "Kelas 1" karena ada dua baris `Kelas` untuk
tingkat 10 di dua tahun ajaran berbeda (aktif & tidak aktif) — query
pohon /induk belum menyaring berdasarkan tahun ajaran aktif.

## 2026-08-29 — Sidebar staf persisten saat navigasi

Rute staf dipindahkan ke route group `(staf)` tanpa mengubah URL. `Shell` kini
hidup sekali di layout grup sehingga sidebar, topbar, menu RBAC, dan agenda tidak
terpasang ulang ketika operator berpindah menu; hanya konten halaman yang
berganti. Navigasi dan judul aktif memakai komponen klien kecil agar status aktif
tetap berubah tanpa reload kerangka. Import modul ujian yang bergantung pada
lokasi rute juga diperbarui.

## 2026-08-29 — Label tingkat & urutan lembaga di penyaring /induk

Penyaring pohon lembaga di /induk sebelumnya melabeli sub-tingkat sebagai
"Kelas 1/2/3" generik dan mengurutkan lembaga alfabetis (MA, Madin, SMP).
Diubah: SMP kini berlabel Tingkat VII/VIII/IX, MA berlabel Tingkat X/XI/XII
(Madin tetap 1–6 apa adanya), dan urutan lembaga dipaksa Madin → MA → SMP
lewat `URUTAN_UNIT` di `app/induk/pohon.ts` (bukan lagi `orderBy nama asc`).
Tingkat dengan tepat satu kelas langsung memakai label tingkat sebagai
tautan filter, tanpa sub-menu nama kelas — pola yang sudah ada sebelumnya,
kini labelnya ikut memakai `t.label`.

## 2026-08-29 — Pencarian entitas di /data

/data menampilkan 21+ kartu entitas dalam satu layar tanpa cara menyaringnya
selain scroll. Ditambahkan kotak cari klien (`PencarianEntitas.tsx`) yang
menyaring kartu persona dan kelompok modul per label — datanya tetap dihitung
di server (RBAC tidak berubah), komponen klien hanya menyaring tampilan yang
sudah lolos akses. Pesan "Tidak ada data yang cocok" muncul saat hasil nihil.

Sekaligus memperbaiki bug yang ditemukan saat verifikasi: `IkonMenu` yang
sebelumnya melekat di `Shell.tsx` (Server Component yang mengimpor
`next/headers`/Prisma) membuat `/data` gagal total (500) begitu diimpor dari
komponen klien baru. Dipindah ke `components/atoms/IkonMenu.tsx` yang bebas
dependensi server; `Shell.tsx` kini re-export dari sana agar konsumen lama
tidak berubah.

## 2026-08-29 — Aksesibilitas chip penjelajah/penyaring

Chip aktif di penjelajah `/akademik`, `/kepegawaian`, dan penyaring `/induk`
hanya bergantung pada warna (hijau vs putih) untuk menandai pilihan yang
sedang dipakai — tidak terbaca pembaca layar dan tidak lolos WCAG 1.4.1.
Ditambahkan `aria-current="true"` di setiap chip aktif serta penanda "✓"
non-warna lewat `.chip-aktif::before`. Kontras teks krem di atas hijau aktif
diukur `6.20:1` (hover `9.76:1`) — di atas ambang AA 4.5:1, jadi tidak perlu
diubah.

## 2026-08-29 — Tata letak /induk responsif di layar kecil

Grid master-detail `/induk` (pohon lembaga · daftar hasil · profil) memakai
gaya sebaris tetap `250px 300px 1fr`, jadi tak bisa disesuaikan lewat media
query dan menjepit di layar sempit. Kini tiga breakpoint: ≥1280px seperti
semula; 900–1279px pohon lembaga menyusut ke 220px dan jadi `<details>` yang
bisa dilipat; <900px satu kolom — begitu santri dipilih (`?sel=`), pohon dan
daftar hasil disembunyikan, hanya profil yang tampil, dengan tautan "‹ Kembali
ke daftar" di atasnya untuk balik ke hasil.

Bagian "Data induk santri" ditambahkan di `app/docs/isi.ts` sesuai perubahan
layar yang material.

## 2026-08-29 — Penyaring jenis kelamin di /induk

/induk sudah punya penyaring Status dan Angkatan, tapi jenis kelamin — meski
logikanya sudah ada di `filter.ts` sejak awal — tidak punya kontrol di layar
sama sekali. Ditambahkan kelompok chip "Putra"/"Putri" di samping Status,
memakai pola `Opsi` yang sama (klik ulang untuk mematikan, tergabung ke chip
penyaring aktif yang seragam).

## 2026-08-29 — Penjelajah & penyaring akademik naik ke atas tabbar

Penjelajah lembaga dan baris penyaring dulu diulang di dalam masing-masing tab
(Siswa, Presensi, Nilai, Rapor), sehingga berpindah tab terasa seperti mereset
konteks: operator yang sudah menyaring "SMP › 7A" harus menyaring ulang. Kini
keduanya dirender sekali di `app/akademik/page.tsx` di atas tabbar — ia menyaring
keempat tab sekaligus — dan tabbar memakai `hrefTab` supaya filter ikut terbawa
saat tab berganti.

Efek samping yang diinginkan: tab Nilai dan Rapor sekarang ikut punya pencarian
dan penyaring yang sebelumnya hanya ada di Siswa/Presensi.

## 2026-08-29 — Chip penyaring aktif seragam di induk/akademik/kepegawaian

Tiga modul menampilkan penyaring aktif dengan cara berbeda: /akademik punya chip
per penyaring, /induk hanya tombol "Hapus n filter" (tidak bisa mencopot satu
saja), /kepegawaian menampilkannya di dua tempat sekaligus — baris di Penjelajah
dan tidak ada di BarisFilter. Kini semuanya lewat molekul baru
`FilterAktif`: satu baris, satu chip per penyaring, tiap chip bisa dicopot
sendiri, dan "Bersihkan semua (n)" muncul hanya kalau ada lebih dari satu.

Baris chip duplikat di `app/kepegawaian/Penjelajah.tsx` dihapus. Unit/kelas
sengaja tidak dijadikan chip karena pohon lembaga di sebelahnya sudah menyorot
pilihan itu.

## 2026-08-29 — Penyaring select berlaku seketika, tanpa tombol Terapkan

Di /akademik dan /kepegawaian dulu ada dua idiom bertumpuk di satu layar: chip
penjelajah lembaga berlaku instan, tapi `<select>` di bawahnya baru berlaku
setelah menekan "Terapkan" — operator kerap mengubah pilihan lalu heran hasilnya
tidak berubah. Sekarang aturannya tunggal di seluruh app: **pilihan berlaku
seketika, ketikan berlaku saat Enter**. Semua `<select>` penyaring memakai
molekul baru `PenyaringOtomatis`; kotak pencarian tetap form GET dengan tombol
"Cari" supaya mengetik tidak memicu navigasi per ketukan.

Catatan teknis: tiap opsi membawa `href`-nya sendiri yang dihitung di server,
bukan callback `buatHref` — Server Component tidak boleh mengirim fungsi ke
Client Component, dan `tsc` tidak menangkap pelanggaran itu (hanya terlihat di
browser sebagai komponen yang ditelan error boundary).

Dampak operator: tidak ada tombol Terapkan lagi di penyaring; keadaan filter
tetap hidup di URL sehingga tetap bisa dibookmark dan dibagikan.

## 2026-08-29 — Paginasi daftar santri di /induk

Daftar santri di /induk dulu memuat seluruh baris sekaligus dalam kotak
ber-scroll. Kini 15 baris per halaman dengan pager standar (`UKURAN_HALAMAN`,
`Pagination`) dan panel hasil menampilkan jumlah total.

Dampak operator: nomor halaman ikut di URL (`?halaman=`). Santri terpilih
(`?sel=`) tetap bertahan walau ada di halaman lain — validasinya lewat query
tersendiri, bukan dicari di baris yang sedang tampil. Mengganti filter selalu
kembali ke halaman 1.

## 2026-08-29 — Skeleton loading & error boundary di 4 modul utama

`/induk`, `/akademik`, `/kepegawaian`, dan `/data/[entity]` kini punya
`loading.tsx` sehingga saat query Prisma berjalan layar menampilkan kerangka
abu berdenyut, bukan halaman kosong. `app/error.tsx` menangkap kegagalan render
dengan kartu "Terjadi kesalahan" + tombol "Coba lagi", menggantikan layar putih.

Dampak operator: jika suatu halaman gagal, tombol "Coba lagi" biasanya cukup;
kalau berulang, laporkan ke admin sistem.

## 2026-08-29 — Daftar santri di /data/santri bisa dipakai tanpa hafal NIS

Dua hal membuat halaman ini praktis tidak terpakai. Pertama, nama santri tidak
pernah muncul maupun bisa dicari: kolom pertama menampilkan `orangId` (nomor
internal), dan kotak Cari hanya menyapu kolom teks milik tabel `santri`,
sedangkan nama hidup di tabel `orang` — mengetik nama selalu nihil. Kedua,
filter Unit/Kelas/Kamar tidak muncul walau kolomnya ada, karena `FilterBar`
mensyaratkan field itu juga terdaftar sebagai kolom tabel.

Perubahan mesin CRUD (berlaku umum, bukan khusus santri): `Entity.cariPath`
menambahkan path relasi ke klausa OR pencarian (`orang.nama`); `Column.name`
kini boleh bertitik dan diratakan di server sehingga tabel klien tetap membaca
`row[nama]`; `Column.subName` memberi baris kecil kedua di sel yang sama, dan
`Column.badge` memetakan nilai → nada badge. `Field.filterDefault` membuat
filter punya nilai bawaan — nilai `semua` (konstanta di `lib/crud/filter-nilai.ts`,
modul terpisah agar bilah filter tidak menarik Prisma ke bundel browser)
dipakai untuk membatalkannya.

Entitas `santri`: kolom jadi Nama (+NIS sebagai sub-baris) / JK / Unit / Kelas /
Kamar / Status (badge) / Tahun masuk. Filter bertambah Jenis kelamin dan
Kelengkapan data (`lib/crud/santri-filter.ts`), Status berbawaan `Mukim`, dan
Kamar menampilkan kode + nama asrama. `orangId` ditandai `hanyaBaru` sehingga
tidak dirender saat mengubah — mencegah satu baris santri dipindah ke identitas
orang lain. Baris ringkasan baru (`app/data/ringkasan-santri.tsx`) menampilkan
Semua/Mukim/Alumni plus tiga daftar kerja operator (belum ada kelas/kamar/NIS),
masing-masing menautkan ke daftar yang sudah tersaring.

**Dampak operator.** Status kini tersaring ke Mukim secara bawaan; alumni
dimunculkan lewat opsi "Semua" pada dropdown Status. Tombol Reset hanya muncul
bila filter menyimpang dari bawaan itu.

Verifikasi lewat Chromium ke `http://202.59.200.26:3226` dengan login riil:
`q=Hamdan` → 2 hasil dan `q=Zzzqqq` → 0 (sebelumnya nama tak pernah ketemu),
kolom JK terisi L/P dari relasi, jkSantri L=55 P=34, `lengkap=tanpaKelas` → 1,
badge status hijau, uji negatif akun `santri.*`/`wali.*` dialihkan ke `/` tanpa
`pageerror`, dan mutasi ubah dicek sampai baris DB (`program` tersimpan,
`orangId` & `nis` utuh, lalu dipulihkan). `npx tsc --noEmit` bersih.

Catatan: DB uji saat ini hanya memuat `superadmin` + akun portal santri/wali;
akun `guru.*`/staf belum di-seed, jadi uji negatif memakai akun portal.

## 2026-08-27 — Profil unit & yayasan bisa diedit lewat /data

Kolom profil yang ditambahkan sebelumnya belum punya pintu edit: entitas CRUD
`unit` masih 4 field lama (kode, nama, deskripsi, aktif), dan `profil_lembaga`
belum terdaftar sama sekali — jadi koreksi data hanya lewat seed atau MySQL.

Entitas `unit` di `lib/crud/registry.ts` kini memuat seluruh field profil
(nama resmi, jenjang, NPSN/NSM, akreditasi, tahun berdiri, logo, kontak, visi
& misi), dikelompokkan lewat `group`: Pimpinan, Kontak, Visi & misi. Kepala
unit bisa diisi dua cara — teks `kepalaNama` untuk yang belum jadi pegawai,
atau lookup `kepalaPegawaiId` ke `pegawai` (label `orang.nama`) yang menang
bila terisi. Kolom tabel diganti ke Kode / Nama resmi / Kepala unit / NPSN /
Aktif. Entitas baru `profil-lembaga` (menu `pengaturan`) untuk yayasan induk.

Yang perlu diketahui operator:
- **Edit ada di `/data/unit` dan `/data/profil-lembaga`** (menu Kelola data →
  grup Pengaturan), bukan di Pengaturan → Unit yang tetap read-only.
- **Logo diisi sebagai path**, mis. `/assets/logo-nuha.webp` — berkasnya harus
  sudah ada di `public/assets/`. Belum ada mekanisme unggah.
- Profil yayasan cukup satu baris berkode `yayasan`; kode lain tidak dibaca
  Pengaturan → Unit.

Verifikasi (Playwright ke `http://202.59.200.26:3226`, login `superadmin`):
tabel `/data/unit` merender 4 unit dengan kolom baru; form ubah memuat 20
field profil; mengubah NPSN Poskestren tersimpan ke tabel, muncul di daftar,
dan tercatat di `audit_log` (`unit` / `CRUD_UPDATE`) — data uji dikembalikan
ke `null` setelahnya. Tanpa `pageerror`. `npx tsc --noEmit` bersih.

## 2026-08-27 — CRUD khusus per persona: Santri, Guru, Staf, Wali santri

Hash: `71b07f76` (entitas persona, ikut commit lookup kelas) + `71f9fbf4`
(field wajib wali + dokumentasi).

Halaman `/data` kini dibuka oleh kelompok **"Data orang per peran"** berisi
empat pintasan CRUD satu-layar: `/data/santri-orang`, `/data/guru-orang`,
`/data/staf-orang`, `/data/wali-orang`. Semuanya menulis ke tabel `orang`
yang sama seperti "Identitas orang", tapi perannya sudah dikunci lewat
`Entity.whereDasar` (klausa `where` yang selalu berlaku) — jadi tidak ada
kotak centang peran yang perlu diisi, dan daftarnya hanya memuat orang yang
memang berperan itu.

Implementasi: `lib/crud/persona.ts` (resep per persona) + `lib/crud/orang-fields.ts`
(field identitas dasar yang kini dipakai bersama entitas `orang` dan keempat
persona, supaya labelnya tidak bercabang). `lampirkanKeterkaitan` sekarang
memicu pada `entity.model === 'orang'`, bukan `entity.key === 'orang'`,
sehingga badge peran juga tampil di halaman persona.

Yang perlu diketahui operator:
- **Menambah lewat persona = identitas + baris peran sekaligus.** Tidak perlu
  lagi membuat orang dulu lalu menyalin ID Orang ke modul Santri/Kepegawaian.
  NIP dibuatkan otomatis bila dikosongkan.
- **Menghapus di halaman persona menghapus identitas orangnya**, dan baris
  santri/pegawai/relasinya ikut terhapus (`onDelete: Cascade`). Untuk sekadar
  menonaktifkan, pakai toggle "Status keaktifan".
- **Persona Wali mewajibkan minimal satu santri.** Status wali hanya ada
  sebagai relasi ke santri, jadi wali tanpa santri tersimpan tapi langsung
  hilang dari daftarnya sendiri — bug ini ketemu saat verifikasi dan sudah
  ditutup. Validasinya di klien (`CrudPanel`) karena `coerce` di server
  melewati field virtual.
- **Guru vs staf dibedakan dari kata "Guru" pada jabatan**, konsisten dengan
  filter Kategori yang sudah ada. Mengganti jabatan bisa memindahkan orang
  antar dua daftar itu.
- Label lama diperjelas: `/data/santri` → "Santri (detail akademik)" dan
  `/data/pegawai` → "Kepegawaian (detail)", untuk kolom lanjutan (unit, kelas,
  kamar, rekening, jam mengajar). Kartu "Wali santri" yang dulu menunjuk
  `/data/orang#wali` diganti pintasan persona.

Verifikasi (Playwright ke `http://202.59.200.26:3226`, login riil): keempat
kartu tampil; daftar tersaring benar (santri 89, guru 16, staf 1, wali 103);
tambah berhasil di keempat persona dengan badge peran yang tepat
(Santri/Pegawai/Pegawai/Wali); form ubah memuat NIS tersimpan dan perubahan
tersimpan; wali tanpa santri ditolak dengan pesan; peran tanpa hak akses
(akun santri) dialihkan ke `/`; baris DB dan `audit_log` (entitas
`orang_peran`) dicek langsung di MySQL; data uji dihapus setelahnya. Tanpa
`pageerror`. `npx tsc --noEmit` bersih.

## 2026-08-27 — Impor 11 siswa MA Kelas X TA 2025/2026 + koreksi `jk` wali

Importir baru `prisma/import/import-siswa-ma-2025.ts` (`npm run
import:siswa-ma-2025`) memuat 11 siswa MA Kelas 1 (tingkat 10) tahun ajaran
**2025/2026 Gasal** dari tiga tabel operator sekaligus: data diri, data wali
murid (blok Ayah + Ibu), dan data kesehatan. Pengecekan sebelum menulis:
tidak satu pun dari 11 NIK/NISN sudah ada — semuanya baris baru. Hasil:
11 `Santri` + 22 `RelasiWali` + 8 `ProfilKesehatan`.

Yang perlu diketahui operator:
- **Muhammad Fajar Putra Sulhari** tidak punya NIS di tabel sumber → NIS
  dibuat otomatis `2025MA007`. Sepuluh sisanya memakai NIS resmi 18 digit.
- **Tanpa profil kesehatan** (kolom sumber kosong / tak ada barisnya):
  Muhammad Abdulloh Azamy, Muhammad Fajar Putra Sulhari, Muhammad Hamdan
  Zaini. Tab Kesehatan menampilkan "belum diisi", bukan angka nol.
- Kolom "NAMA WALI" (wali pihak ketiga) kosong di seluruh 11 baris, jadi
  hanya relasi Ayah & Ibu yang dibuat. Ayah Ahmad Shafly (Aminudin), ayah
  Dinda (Abdul Holik), dan ibu Hamdan (Noer Laila) hanya diketahui namanya —
  tanpa NIK/TTL/pekerjaan, sesuai sumber.

Sekalian memperbaiki cacat di `prisma/import/lib/tulis-wali.ts`: `Orang.jk`
hanya diset saat *create*, tak pernah dikoreksi saat *update*. Akibatnya wali
yang lebih dulu masuk lewat importir berkolom-tunggal (peran `Wali`, default
`L`) tetap tercatat laki-laki ketika importir lain mengenalinya sebagai Ibu.
Ditemukan 7 ibu angkatan 2026 ber-`jk = L`; setelah helper diperbaiki dan
`npm run import:siswa-ma-2026` dijalankan ulang (idempoten), tinggal 0. Peran
`Wali` sengaja tidak menimpa `jk` karena tidak menyiratkan jenis kelamin.

Verifikasi: `npx tsc --noEmit` bersih; importir dijalankan dua kali (run ke-2
seluruhnya `[perbarui]`, 0 duplikat NISN); Playwright ke
`http://202.59.200.26:3226` login `superadmin`, tab Biodata/Wali/Kesehatan
untuk 4 santri sampel merender tanpa `pageerror`, dan `guru.1` yang membuka
`/induk` diarahkan ke `/login`.

## 2026-08-27 — Profil kelembagaan tiap unit & yayasan (`71b07f76`)

Identitas lembaga (nama resmi, logo, kepala unit, alamat, NPSN) sebelumnya
hardcoded di JSX ~14 berkas dan tak punya model. Tabel `unit` kini punya kolom
profil: `nama_resmi`, `jenjang`, `npsn`, `akreditasi`, `tahun_berdiri`,
`logo_path`, `alamat`, `telepon`, `email`, `website`, `kepala_nama`,
`kepala_jabatan`, `kepala_pegawai_id` (FK ke `pegawai`), `visi`, `misi`.
Tabel baru `profil_lembaga` (satu baris, `key = "yayasan"`) memuat identitas
yayasan induk: ketua yayasan, pengasuh, akta, rekening resmi, nama Arab, visi
& misi. Migrasi `20260827160000_profil_unit_lembaga`.

Data seed-dasar mengisi keempat unit (SMP, MA, Pondok, Poskestren) + yayasan.
Kepala MA memakai nama dari SK struktur (Tika Kartika, S.Pd); ketua yayasan
`KH. Ahmad Zainuri, M.Ag.` dan sebagian NPSN masih nilai contoh yang perlu
dikoreksi operator. `tautkanKepalaUnit()` memaut `kepala_pegawai_id` bila ada
pegawai bernama sama — saat ini belum ada yang cocok, jadi tampilan jatuh ke
teks `kepala_nama` (memang dirancang sebagai fallback).

Tab Pengaturan → Unit berubah dari tabel ringkas jadi kartu profil per unit
plus kartu profil yayasan di atasnya; masih read-only.

Dampak: konsumen identitas lembaga (kop slip gaji, footer publik, rekening di
portal wali) belum dipindahkan ke tabel ini — masih hardcoded, kandidat
pekerjaan lanjutan.

## 2026-08-27 — Kelas: wali kelas & tahun pelajaran jadi lookup nama (`71b07f76`)

Entitas `kelas` di /data/kelas sebelumnya menampilkan dan meminta ID mentah
untuk wali kelas dan tahun pelajaran. Keduanya kini field `ref`: wali kelas
menarik dari `pegawai` dengan label `orang.nama`, tahun pelajaran dari
`tahunAjaran` dengan label `kode` + semester (opsi `labelTambahan` baru di
`FieldRef`, dirangkai di `loadRefOptions`). Header kolom ikut disesuaikan
(Unit / Wali kelas / Tahun pelajaran, tanpa awalan "ID").

Data: wali kelas XI (MA "Kelas 2", id 22) diset ke Nisrina Nada Aulia, S.Hum
(pegawai 12) dan wali kelas X (MA "Kelas 1", id 23) ke Rona Nadhiroh
(pegawai 14) — kolom `wali_kelas_id` sekaligus teks `wali_kelas` legacy.

Dampak: operator memilih dari dropdown, tidak lagi menyalin ID. Perubahan
wali kelas via UI hanya menulis `wali_kelas_id`; kolom teks `wali_kelas`
lama tidak ikut diperbarui dan memang sudah ditandai deprecated di schema.

## 2026-08-27 — Tombol simpan & batal form CRUD jadi ikon (`03a34c8b`)

Baris aksi modal CRUD sebelumnya memakai dua tombol berteks ("Simpan
perubahan" / "Batal") yang memakan lebar. Keduanya kini tombol ikon 28×28
seperti tombol Ubah/Hapus di tabel: centang untuk simpan (varian baru
`.btn-icon-utama`, hijau solid) dan silang untuk batal. Label tetap tersedia
lewat `title` + `aria-label`, termasuk keadaan "Menyimpan…" saat submit.

Dampak: tidak ada perubahan perilaku; operator yang hafal posisi teks tombol
perlu mengenali ikonnya.

## 2026-08-27 — Rapikan tampilan chip kotak centang peran (`c75d165f`)

Chip "Daftarkan sebagai" memakai kotak centang bawaan browser sehingga ukuran
dan gayanya tidak seragam lintas platform, chip-nya terlalu tinggi, dan opsi
yang belum dicentang nyaris tak terbaca. Indikator centang kini digambar
sendiri (kotak + tanda centang SVG), chip dibulatkan penuh, padding dan
kontras hover/fokus diperbaiki. Murni CSS — perilaku form tidak berubah.

## 2026-08-27 — Satu orang boleh memegang beberapa peran sekaligus (`792fbe22`)

Sebelumnya "Daftarkan sebagai" di `/data/orang` adalah pilihan tunggal, sehingga
satu identitas tidak bisa tercatat sebagai santri **dan** guru — padahal di
pesantren perangkapan itu lumrah (santri senior yang mengajar ngaji, guru yang
juga wali dari santri lain). Kini pilihannya kotak centang dan boleh lebih dari
satu; baris `santri` dan `pegawai` dibuat berdampingan untuk `orang` yang sama.

Perubahan teknis: tipe field baru `pilihan-banyak` (`lib/crud/types.ts`,
dirender di `InputField`, divalidasi di `engine.ts`), `peranOrang` dikirim
sebagai daftar dipisah koma, `daftarkanPeran`/`selaraskanPeran` tidak lagi
saling meniadakan per peran, dan `keterkaitan.ts` mengembalikan **semua** peran
yang melekat (dulu hanya satu "pemenang") sehingga form ubah memuat centangnya
dengan benar.

Yang perlu diketahui operator:
- Opsi "Belum ditentukan" hilang — tidak mencentang apa pun artinya sama.
- Guru dan Staf berbagi satu baris `pegawai`; bila keduanya dicentang, jabatan
  Guru yang dipakai (kategori orang tetap disimpulkan dari kata "Guru" di
  `jabatan`).
- Peran yang centangnya dilepas **tidak** dicabut diam-diam — modul nilai,
  presensi, dan penggajian masih merujuknya; cabut lewat modul asalnya.

Verifikasi lewat Chromium ke `http://202.59.200.26:3226`: login superadmin,
centang Santri + Guru sekaligus → NIS & NIP keduanya muncul, tersimpan sebagai
satu `orang` dengan baris santri (NIS) *dan* pegawai (NIP) di DB, badge tabel
menampilkan "Santri Pegawai", form ubah memuat kedua centang beserta isiannya,
tanpa `pageerror`. Baris uji dihapus kembali.

## 2026-08-27 — 17 alumni SMP naik ke MA angkatan 2026/2027 beserta wali (`e5ae2819`)

Impor gelombang 2 dari tabel operator format Dinkes (24 baris, identitas siswa +
satu kolom "NAMA IBU/AYAH/WALI"), lewat skrip baru
`prisma/import/import-siswa-ma-2026-gelombang2.ts` (`npm run import:siswa-ma-2026-g2`).

Hasil pengecekan: **ke-24 NIK sudah ada** di tabel `orang`. Tujuh di antaranya
sudah jadi siswa MA lewat impor gelombang 1 (NIS `2026MA001`–`2026MA008`) dengan
relasi Ayah + Ibu yang lebih lengkap, jadi baris-baris itu **dilewati** agar data
walinya tidak tergerus. Tujuh belas sisanya masih `unit = SMP`, `status = Alumni`,
tanpa kelas dan tanpa satu pun `relasi_wali` — merekalah alumni SMP yang naik ke
MA; skrip memindahkan mereka ke unit MA, Kelas 1 (tingkat 10), status `Mukim`,
`tahun_masuk = 2026`, memberi NIS `2026MA009`–`2026MA025`, mengisi NISN/HP/asal
sekolah, dan menulis walinya.

Dampak operator: santri MA kini 25 (dari 8), santri SMP turun 69 → 52. Kolom wali
di sumber tidak membedakan ayah/ibu, jadi relasi ke-17 anak itu ditulis dengan
peran `Wali` dan otomatis jadi kontak utama notifikasi (mereka belum punya
Ayah/Ibu). Bila operator kemudian mengirim sheet wali lengkap, jalankan importir
yang memisah Ayah/Ibu — peran `Wali` akan berhenti jadi kontak utama sendirinya.
Alumni SMP yang dipindah tidak punya nilai/presensi, jadi tidak ada data akademik
yang tertinggal. Skrip idempoten (jalan kedua: 0 diproses, 24 dilewati).

## 2026-08-27 — Tempat/tgl lahir & pendidikan terakhir di Identitas Orang (`d32da92f`)

Form `/data/orang` menambah tiga isian opsional: **Tempat lahir** dan **Tanggal
lahir** (grup Identitas, pemilih tanggal) memakai kolom `tmp_lahir`/`tgl_lahir`
yang sudah ada di tabel `orang` tapi belum pernah bisa diisi dari UI, plus
**Pendidikan terakhir** (grup Data pribadi) lewat kolom baru
`orang.pendidikan_terakhir` VARCHAR(80) NULL.

Dampak operator: kolom `pendidikan_terakhir` pada `pegawai` tetap ada dan tidak
diubah — untuk sementara pendidikan bisa tercatat di dua tempat, yang di `orang`
berlaku untuk semua peran (guru, staf, wali), bukan hanya pegawai. Migrasi
`20260827140000_orang_pendidikan_terakhir` sudah di-apply ke DB uji; jalankan
`prisma migrate deploy` di environment lain.

## 2026-08-27 — Impor 8 siswa MA angkatan 2026/2027 (`d32da92f`)

Importir baru `prisma/import/import-siswa-ma-2026.ts` (`npm run
import:siswa-ma-2026`) memasukkan 8 siswa MA ke **Kelas 1 (tingkat 10)** pada
TA aktif 2026/2027 Gasal, lengkap dengan wali (Ayah & Ibu) dan profil
kesehatan. Data sumber ditulis literal di berkas skrip — operator
menyerahkannya sebagai tabel teks, bukan XLSX.

- 6 dari 8 santri sudah ada dari impor terdahulu yang tak lengkap: berstatus
  `Alumni`, tanpa kelas/tahun masuk, tanpa No. KK/anak ke/hobi/cita-cita/asal
  sekolah, dan hanya punya 1 baris `RelasiWali` berlabel "Wali". Semuanya
  diperbaiki: status → `Mukim`, tahun masuk 2026, NIS `2026MA001`–`2026MA008`.
- **Errena Tembang Sosialista Tazheva** sebelumnya tersimpan dengan NISN
  `0112234300`, sedangkan tabel operator menulis `0112234304`. Pencocokan
  sekarang mendahulukan **NIK** di atas NISN, jadi baris lama dikoreksi
  (NISN diperbarui) — bukan jadi santri kedua. Operator perlu memastikan mana
  NISN yang benar di Dapodik.
- Jenis kelamin Achmad Tsaaqib dikoreksi dari `P` → `L`.
- Wali sekarang 16 baris (Ayah+Ibu per santri). Ayah Aisyah (Akhmad Gozali)
  dan ayah Siti Munawaroh (Djoko Poerwoto) hanya punya nama — sumber tidak
  mengisi NIK/TTL/pekerjaan.
- `Orang.alamat` hasil pembersihan manual di DB **tidak** ditimpa versi ALL
  CAPS dari tabel operator; alamat sumber hanya dipakai bila kolomnya kosong.
- Idempoten: dijalankan dua kali, tidak ada duplikat.

## 2026-08-27 — Semua santri berstatus mukim (`bceca301`)

Status `Kalong` dihapus dari model dan seluruh UI: semua data santri/siswa
pasti mukim, bukan kalong.

- Enum `StatusSantri` kini `Mukim | Alumni | Keluar`; migrasi
  `20260827120000_santri_selalu_mukim` mengonversi 51 baris `Kalong` → `Mukim`.
- Form Identitas Orang: pilihan "Status santri" dihapus (selalu Mukim).
- Dasbor: donut & StatCard tak lagi memecah mukim/kalong; kartu peringatan
  "santri kalong" di tab Biodata dan label kalong di header induk dihapus.
- Importir siswa SMP tidak lagi menandai siswa aktif sebagai Kalong.

## 2026-08-27 — Tahun pelajaran sampai 2030/2031 (`87153933`)

`prisma/tahun-ajaran.ts` kini men-generate tahun pelajaran 2024/2025 s.d.
minimal 2030/2031 (Gasal + Genap, 14 baris), bukan berhenti di tahun berjalan.
Kalau tahun berjalan melewati 2030 daftar tetap ikut maju sendiri. Yang aktif
tetap semester berjalan (kini 2026/2027 Gasal). Dampak operator: jalankan seed
(`nuha-migrate`) agar baris tahun baru muncul di Pengaturan → Tahun ajaran.

## 2026-08-27 — Master data kesehatan santri + CRUD-nya (pending)

Tabel `profil_kesehatan` yang selama ini hanya diisi importir MA kini punya
halaman CRUD di `/data/profil-kesehatan` (hak akses menu Poskestren). Kolom
baru: `gol_darah`, `alergi`, `catatan`, `updated_at`. Primary key dipindah dari
`santri_id` ke `id` sintetis karena engine CRUD generik selalu memakai kolom
`id`; `santri_id` tetap unik, jadi satu santri tetap hanya boleh punya satu
profil. Migrasi `20260827090000_profil_kesehatan_crud` membuat unique index
lebih dulu sebelum men-drop PK — FK ke `santri` masih membutuhkan indeks itu.

Dampak operator: santri dipilih lewat dropdown nama, bukan diketik ID-nya.
Profil kesehatan ini kondisi dasar sekali-isi; pemeriksaan per kunjungan tetap
di modul Rekam medis.

## 2026-08-27 — Grup "Data pribadi" di form CRUD bisa dilipat (pending)

Legend grup form kini bisa jadi tombol lipat. Grup di `GRUP_CIUT`
(`components/CrudPanel.tsx`) — saat ini hanya "Data pribadi" — tertutup secara
bawaan tiap kali modal dibuka, jadi form Identitas Orang langsung fokus ke data
utama. Isian yang dilipat disembunyikan dengan `display: none`, bukan
di-unmount, sehingga nilainya tetap terkirim saat disimpan walau grupnya
tertutup.

Dampak operator: klik judul "Data pribadi" untuk membuka anak ke-, jumlah
saudara, asal sekolah, hobi, cita-cita.

## 2026-08-27 — Tahun pelajaran 2024/2025 s.d. berjalan, Gasal + Genap (pending)

Daftar tahun pelajaran dipindah ke `prisma/tahun-ajaran.ts`: dibangkitkan dari
2024/2025 sampai tahun pelajaran berjalan (dihitung dari tanggal, mulai Juli),
masing-masing dengan semester Gasal dan Genap. `prisma/seed.ts` dan
`prisma/seed-dasar.ts` memakai sumber yang sama; upsert tetap idempoten.
Dampak: tabel `tahun_ajaran` kini 6 baris (2024/2025 … 2026/2027), aktif =
2026/2027 Gasal. Baris lama tidak dihapus.

## 2026-08-27 — Bagian "Peran" bisa diubah, bukan hanya saat menambah (pending)

Form ubah identitas orang kini menampilkan bagian "Daftarkan sebagai" beserta
turunannya (NIS/status, NIP/jabatan/tugas tambahan, daftar wali & santri),
terisi dari relasi yang sudah ada. Menyimpan memperbarui baris santri/pegawai
yang ada — tidak menggandakan. Relasi wali yang dibuang dari daftar benar-benar
dicabut dan dicatat ke audit (`orang_peran`).

Dampak operasional: peran lama **tidak** ikut terhapus saat pilihan peran
diganti (mis. santri → guru), karena nilai/presensi/gaji masih merujuknya —
pencabutan dilakukan sengaja lewat modul asalnya. Endpoint
`/api/orang/cari` menerima `?ids=` untuk memuat nama relasi tersimpan.

## 2026-08-27 — Impor 17 guru MA + pisah jabatan dari tugas tambahan

17 baris `DATA GURU.xlsx` masuk ke `orang` + `pegawai` unit MA
(`GTT-MA-001`..`017`). Importir `prisma/import/import-guru-ma.ts` sudah ada
sejak sebelumnya tetapi ternyata **belum pernah dijalankan** — tabel `pegawai`
masih kosong. Dua cacatnya diperbaiki dulu sebelum dijalankan:

1. **Jenis kelamin di-hardcode `L`** untuk semua baris — 14 dari 17 guru MA
   perempuan, jadi seluruh data akan salah. Sekarang ada peta eksplisit
   `JK_GURU_MA` (disimpulkan dari sapaan "B."/"P."/"Miss" di kamus alias
   jadwal, dituliskan per nama supaya bisa ditelusuri). Nama di luar peta
   **menggagalkan impor**, tidak diam-diam jadi `L`.
2. **Jabatan diisi nama mapel** saat kolom Jabatan kosong. Kategori orang
   disimpulkan dari kata "Guru" di `jabatan` (`FILTER_KATEGORI_ORANG`), jadi
   itu akan membuat guru terbaca sebagai staf. Sekarang siapa pun yang
   mengampu mapel jabatannya `Guru Mapel`, dan jabatan struktural dari kolom
   Jabatan ("Waka Kurikulum", "Wali Kelas 10", "Plt. Kepala Madrasah") pindah
   ke `pegawai.tugas_tambahan` — kolom yang memang disediakan skema.

Form `/data/orang` dapat isian baru **Tugas tambahan / jabatan struktural**
untuk peran Guru/Staf, terpisah dari Jabatan dengan alasan yang sama; nilainya
ikut termuat saat mengubah dan tampil pada badge keterkaitan Pegawai.

Dampak operasional: hasil impor 16 guru + 1 staf (Bendahara/TU, tidak mengampu
mapel). Tanpa migrasi — `tugas_tambahan` sudah ada di skema. Importir idempoten
(upsert by NIP/email), aman dijalankan ulang.

## 2026-08-27 — Field data pribadi di Identitas Orang (babfded3)

Form `/data/orang` kini punya grup **Data pribadi**: anak ke-, jumlah saudara
kandung, asal sekolah, hobi, dan cita-cita. Kolomnya sudah ada di tabel
`orang` sejak migrasi `20260826120638_fase1_fase2_data_client` — perubahan ini
hanya memaparkannya di registry CRUD, jadi tidak ada migrasi baru. Semua
opsional; baris lama tetap valid tanpa diisi.

## 2026-08-27 — Rapikan form modal CRUD (151f6d01)

Form di modal `/data/*` sekarang 2 kolom (dari 3) sehingga field tak lagi
sempit dan lebar-baris tidak berselang-seling; `span > 1` berarti selebar
baris penuh. Semua kontrol setinggi 40 px (input, select, segmented jenis
kelamin) agar sebaris rapi; textarea tetap fleksibel. Deskripsi entitas
dipindah ke kotak lembut di atas form, tombol Simpan/Batal dipisah garis di
bawah, dan jarak antar-grup dibuat konsisten. Fokus-state kini seragam pada
semua input form. Murni tampilan — perilaku dan data tidak berubah.

## 2026-08-27 — Filter /data/* otomatis saat diubah

`components/molecules/FilterBar.tsx` jadi client component: dropdown filter
langsung submit form GET saat `onChange`, kotak "Cari" submit setelah jeda
ketik 400 ms (debounce). Tombol filter dan Reset tetap ada sebagai fallback
tanpa JS. Berlaku untuk semua halaman `/data/<entity>`, bukan hanya `orang`.

## 2026-08-27 — Hapus panel "Hubungkan wali ke santri" di /data/orang

Tombol `+ Hubungkan wali ke santri` di bawah tabel Identitas orang dihapus atas
permintaan user. Karena tombol itu satu-satunya pintu masuk ke panelnya, seluruh
`app/data/[entity]/wali/` ikut dihapus (FormRelasiWali, PencariOrang, PanelWali,
actions, konstanta) — bukan hanya tombolnya, supaya tidak meninggalkan kode mati.

**Dampak operasional:** relasi wali↔santri kini **hanya** bisa dibuat lewat
bagian "Peran" pada form tambah identitas orang (peran Santri → tunjuk wali,
atau peran Wali murid → tunjuk santri). Aksi hapus relasi dan "jadikan wali
utama" yang dulu ada di panel itu tidak punya pengganti di UI — bila operator
perlu mengubah relasi yang sudah ada, itu belum tersedia. `app/docs/isi.ts`
bagian `kelola-data` sudah dikoreksi mengikuti keadaan baru.

## 2026-08-27 — UX: form identitas orang diringkas

Putaran ketiga masukan tampilan pada modal Tambah/Ubah identitas orang:

- Jenis kelamin kini **ikon saja**, dibedakan warna: biru (`#1d5fa8`) untuk
  laki-laki, magenta (`#b8407e`) untuk perempuan. Labelnya tetap tersedia
  lewat `title` + `aria-label` agar tidak hilang bagi pembaca layar.
- RT dan RW digabung ke satu baris `RT / RW` lewat `pasangan`/`tersembunyi`
  di registry — field `tersembunyi` tetap ikut dikirim saat submit.
- Panel **"Terhubung ke modul lain"** dipindah ke bawah field, bukan di atas
  form.
- Pemilih wali/santri: klik pada kolomnya langsung memunculkan maksimal
  **lima** kandidat tanpa perlu mengetik (`/api/orang/cari` menerima `q`
  kosong, batas 15 → 5); barisnya diklik biasa, bukan checkbox; penyaringan
  saat mengetik tetap jalan.
- Petunjuk per input dikurangi dari 25 → 15 supaya form tidak ramai.

Dampak operator: tidak ada perubahan data atau skema; hanya tampilan form.

## 2026-08-27 — UX: form identitas orang & pemilih wali banyak-ke-banyak

Lanjutan dari entri di bawah, hasil masukan tampilan:

- Jenis kelamin memakai ikon Mars/Venus di samping labelnya.
- Nama lengkap kini selebar 2 kolom (sebelumnya sesempit NIK).
- Alamat jalan/dusun jadi `textarea` selebar penuh, bukan input satu baris.
- Peran **Santri** bisa langsung menunjuk walinya — **boleh beberapa**
  (ayah, ibu, wali lain), masing-masing dengan hubungannya.
- Peran **Wali murid** bisa sekaligus mewakili **beberapa santri**; kandidatnya
  dibatasi ke orang yang benar-benar sudah terdaftar sebagai santri
  (`/api/orang/cari?santri=1`).

Wali pertama pada santri yang belum punya wali utama otomatis jadi utama; wali
utama yang sudah ada tidak diturunkan diam-diam.

Teknis: field type baru `orang-banyak` (komponen
`components/molecules/PemilihBanyakOrang.tsx`, nilainya JSON `{id, hubungan}[]`
yang divalidasi ulang di server), atribut field `optionIcons`, `hubungan`,
`hanyaSantri`, dan atom `components/atoms/IkonOpsi.tsx`.

## 2026-08-27 — Fitur: penentuan peran saat menambah identitas orang

Form "Tambah identitas orang" (`/data/orang`) dapat bagian **Peran**: satu
pilihan Santri / Guru / Staf / Wali murid / Belum ditentukan, dengan field
lanjutan yang muncul sesuai pilihan (NIS + status, NIP + jabatan, atau anak +
hubungan). Setelah identitas tersimpan, baris `santri` / `pegawai` /
`relasi_wali` dibuat otomatis dan dicatat ke audit log (entitas
`orang_peran`).

Dampak operator: tidak perlu lagi membuat orang lalu menyalin ID Orang ke
modul Santri/Kepegawaian secara manual. NIP yang dikosongkan diisi cadangan
deterministik `NIP-<id>` (skema mewajibkan NIP unik) — perbaiki di modul
Kepegawaian bila NIP resminya sudah ada. Bagian Peran hanya tampil saat
menambah, tidak saat mengubah; peran yang sudah melekat tetap terlihat di
panel keterkaitan.

Teknis: registry CRUD kini mengenal field `virtual` (tidak dikirim ke Prisma),
`hanyaBaru`, dan `tampilBila`, plus hook `sesudahBuat` per-entitas
(`lib/crud/peran-orang.ts`). Hook idempoten — orang yang sudah punya baris
santri/pegawai dibiarkan.

## 2026-08-27 — Refactor: relasi wali digabung ke halaman Identitas orang

Halaman terpisah `/data/wali` dihapus. Fitur "Hubungkan wali ke santri",
tabel relasi, filter, dan paginasinya kini menempel sebagai panel di bawah
tabel `/data/orang` (anchor `#wali`), karena relasi wali↔anak adalah pasangan
antar-baris `orang` — bukan entitas CRUD tersendiri.

- Berkas `app/data/wali/*` dipindah ke `app/data/[entity]/wali/`; komponen
  server baru `PanelWali.tsx` merangkai form + tabel + paginasi.
- Panel memakai parameter query sendiri (`wq`, `whalaman`, `wlimit`) supaya
  tidak bentrok dengan filter tabel Identitas orang di halaman yang sama.
- `LimitPicker` menerima prop `param` dan `hash` agar bisa dipakai dua panel
  dalam satu halaman.
- `revalidatePath` pada server action wali diarahkan ke `/data/orang`; badge
  keterkaitan "Wali" dan kartu di `/data` menunjuk `/data/orang#wali`.
- Dokumentasi `/docs` menambah bagian "Kelola Data & relasi wali".

**Dampak operator**: pranala lama `/data/wali` sekarang 404 — pakai
`/data/orang#wali`.

## 2026-08-27 — Fix: kontak wali utama hilang di seluruh data santri

`relasi_wali.utama` bernilai `false` untuk **seluruh 76 relasi**, sehingga tab
"Wali & Keluarga" di `/induk` selalu menampilkan "Belum ada data wali yang
tercatat" dan pemicu notifikasi tidak menemukan kontak wali siapa pun.

Penyebab: `prisma/import/lib/tulis-wali.ts` menyetel `utama = peran !== 'Wali'`
tanpa syarat, padahal form pendataan SMP hanya punya satu kolom
"NAMA IBU/AYAH/WALI" — semua relasi masuk sebagai `peran='Wali'` sehingga tak
ada satu pun kontak utama.

Perbaikan tiga lapis:
- Importir: helper `apakahUtama()` — Ayah/Ibu selalu utama; Wali pihak ketiga
  jadi utama hanya bila anak tidak punya relasi Ayah/Ibu.
- Pembaca (`app/induk/TabWali.tsx`, `app/notifikasi/TabPemicu.tsx`): query tanpa
  filter `utama: true`, diurutkan `utama desc, id asc` — relasi yang ada tidak
  lagi tersembunyi hanya karena tak bertanda.
- Data: skrip backfill idempoten `npm run fix:wali-utama`
  (`prisma/import/perbaiki-wali-utama.ts`), sudah dijalankan — 76/76 relasi
  diperbarui, jalan kedua 0 perubahan.

**Dampak operasional**: setelah impor data wali baru, jalankan
`npm run fix:wali-utama` bila ragu; skrip aman diulang dan tidak menghapus
relasi. Status kini: 76/76 santri punya wali utama, 0 santri tanpa kontak,
0 santri dengan >1 utama. Akun portal wali tetap 73/76 (tiga kontak belum
lengkap).

Verifikasi: Playwright ke `http://202.59.200.26:3226` sebagai `superadmin`,
8 santri sampel (termasuk Ahmad Fauzi → Windu Winarti) semua merender kontak
wali tanpa `pageerror`. `npx tsc --noEmit` bersih.

## 2026-08-27 — Kelola Data: filter server-side di /data/[entity] (174d1cd5)

`FilterBar` baru (form GET, tanpa JS) di atas tiap tabel `/data/[entity]`:
kotak cari bebas (`q`, contains case-sensitive di kolom text/textarea) dan
dropdown per kolom `select`/vlookup yang tampil di tabel (exact match).
`lib/crud/engine.ts` membangun `where` Prisma dari filter tersebut; limit
picker dan paginasi mempertahankan filter aktif lewat query string.

## 2026-08-27 — Fix: ikon tombol aksi Kelola Data belum center (31a36747)

Ikon pensil/tong sampah di `.btn-icon` sebelumnya sedikit menempel ke
kiri-atas dalam tombol bundar karena `line-height` default dan SVG
inline yang bukan `display: block`. Ditambah `line-height: 0` pada
`.btn-icon` dan `display: block; flex-shrink: 0` pada `.btn-icon svg`.

## 2026-08-27 — Kelola Data: aksi jadi ikon, limit paginasi (439bdcf2)

Tombol aksi tambah/ubah/hapus di `CrudPanel` diganti ikon saja (plus,
pensil, tong sampah — SVG inline, bukan dependensi baru) dengan
`title`/`aria-label` untuk aksesibilitas; hemat ruang di tabel compact.
Halaman `/data/[entity]` sekarang punya dropdown "Baris per halaman"
(10/25/50/100, default 10, sebelumnya hardcode 25) lewat komponen
klien baru `LimitPicker` (`components/molecules/LimitPicker.tsx`) dan
util `bacaLimit`/`OPSI_LIMIT` di `components/utils/pagination.ts`.
`engine.listRows` menerima parameter `ukuranHalaman` (default 10).
Tidak ada perubahan skema atau akses.

## 2026-08-27 — Kelola Data: tabel compact, form jadi modal, vlookup unit/kelas/kamar (dcdb90ad)

Halaman `/data` (Kelola Data): tabel CRUD kini padat (`table-compact`,
padding sel diperkecil) supaya lebih banyak baris terlihat sekaligus.
Form tambah/ubah tidak lagi memanjang di bawah tabel, melainkan modal
overlay (`.modal-overlay`/`.modal` baru di `globals.css`). Field
`unitId`/`kelasId`/`kamarId` (entitas santri, kelas, pegawai) yang
sebelumnya input ID angka manual sekarang dropdown yang menarik nama
dari master data (Unit/Kelas/Kamar) — pakai `Field.ref` di
`lib/crud/registry.ts` yang sudah ada di tipe tapi belum pernah
dipakai; `engine.toClientEntity` kini async dan resolve opsi lewat
Prisma. Tabel juga menampilkan nama, bukan ID mentah, untuk kolom yang
punya `ref`. Tidak ada perubahan skema.

## 2026-08-27 — Tambah siswa dipindah dari Data Induk ke Kelola Data (61eb21d7)

Halaman `/induk` (Data Induk) tidak lagi merender `CrudPanel` santri di
bawah baris filter — form tambah/ubah/hapus itu memecah fokus tampilan
master-detail (penjelajah lembaga → daftar → profil). Diganti tombol
"+ Tambah siswa" di header halaman yang mengarah ke `/data/santri`, tempat
CRUD entitas `santri` sudah tersedia lewat registry (`lib/crud/registry.ts`).
Tidak ada perubahan skema atau akses; hanya penempatan UI. Baris daftar
santri juga dapat hover state (`.baris-santri:hover`) untuk feedback klik.

## 2026-08-27 — Diniyah pondok jadi kelas 1–6

Unit Pondok Pesantren tidak lagi memakai satu rombel `Diniyah Wustha`.
Diganti enam baris `kelas` di tahun ajaran aktif dengan `nama` = `tingkat` =
`1`…`6`, satu rombel per tingkat. `prisma/seed.ts` ikut disesuaikan (loop
1–6, idempoten) supaya seed demo tidak menghidupkan `Diniyah Wustha` lagi.
Pengurutan tingkat di `app/akademik/pohon.ts` sudah numerik, jadi 1–6 tampil
berurutan tanpa perubahan kode.

## 2026-08-27 — `7b35e51e` Penamaan kelas: angka, huruf hanya bila >1 rombel

Struktur rombel disetel sesuai kondisi riil: tiap tingkat hanya satu kelas,
kecuali SMP kelas 9 yang punya dua (9A, 9B). Baris `kelas` di tahun ajaran
aktif kini: SMP `7`, `8`, `9A`, `9B`; MA `10`, `11`, `12` (dulu `X`/`XI`/`XII`);
Pondok `Diniyah Wustha`. Semua baris `kelas` warisan tanpa `tahun_ajaran_id`
(7A–7C, 8A–8D, 9A–9C lama) dihapus — tidak ada santri/jadwal/sesi yang
mereferensinya (DB memang masih kosong pasca seed-dasar).

Importir ikut disesuaikan supaya tidak menghidupkan nama lama:
`import-siswa-smp.ts` kini menurunkan nama kelas dari jumlah rombel per
tingkat (huruf hanya dipakai bila tingkat itu punya >1 identitas kelas),
`import-siswa-ma.ts` dan `import-jadwal-ma.ts` memakai `10`/`11` menggantikan
`X`/`XI`.

**Dampak operator**: jadwal MA yang sudah pernah diimpor dengan `kelas` =
`X`/`XI` (tabel `jadwal_pelajaran`, dicocokkan lewat string, bukan FK) perlu
diimpor ulang agar cocok dengan penamaan baru. Saat ini tabel itu kosong.

## 2026-08-26 — Rapikan kelas MA jadi tingkat saja (perubahan data, bukan kode)

Lanjutan pembersihan dummy: rombel MA contoh (`X-IPA-1`, `XII-Keagamaan`,
`XI-IPA-2`, dst.) dihapus, disisakan tiga baris `kelas` di tahun ajaran aktif
dengan `nama` = `tingkat` = `X`, `XI`, `XII`. Kelas SMP dan Pondok **tidak
disentuh** atas permintaan user.

Sekalian memperbaiki `tingkat` MA yang rusak: seed lama menurunkannya lewat
`nama.replace(/[^0-9X]/g, '')`, sehingga `X-IPA-1` → `X1` dan `XI-IPA-2` → `X2`,
dan `XII-Keagamaan` ikut tercatat tingkat `X`. Sekarang `tingkat` MA disamakan
dengan nama tingkatnya.

**Catatan**: `tingkat` bukan tabel sendiri melainkan kolom di `kelas`; daftar
tingkat di `/induk` diturunkan dengan mengelompokkan baris `kelas`
(`app/induk/pohon.ts`). Jadi tiap tingkat wajib punya minimal satu baris
`kelas`, kalau tidak tingkatnya hilang dari pohon. Rombel MA yang sebenarnya
ditambahkan lewat impor data nyata.

## 2026-08-26 — Hapus seluruh data dummy; seed dasar menggantikan seed prototype

Basis data masih 100% berisi data contoh dari `prisma/proto-data.json`
(87 santri, 29 pegawai, semua ber-email `@nuha.local`) — impor xlsx nyata
belum pernah dijalankan ke sana.

- **`scripts/purge-dummy.ts`** (baru, `npm run db:purge-dummy -- --yakin`):
  mengosongkan semua tabel operasional lalu menghapus semua `user`/`orang`
  selain superadmin. Dipertahankan: RBAC (`peran`/`menu`/`menu_peran`), master
  (`unit`, `kelas`, `tahun_ajaran`, `asrama`, `kamar`, `mata_pelajaran`,
  `template_wa`) dan akun `superadmin`. Skrip menolak jalan bila superadmin
  tak ditemukan, agar tak menghasilkan DB tanpa admin.
- **`prisma/seed-dasar.ts`** (baru): seed minimum — peran, menu + grant,
  unit, tahun ajaran, template WA, superadmin. **`nuha-migrate` kini memanggil
  ini**, bukan `prisma/seed.ts`; tanpa perubahan itu `docker compose up`
  berikutnya akan mengisi ulang data dummy. Seed prototype tetap ada sebagai
  `npm run db:seed:demo`.
- **`app/login/page.tsx`**: `defaultValue` kredensial demo dan blok "Akun demo"
  dihapus — akunnya sudah tidak ada dan itu membocorkan sandi di halaman publik.

**Dampak operator**: DB kini kosong dari data santri/pegawai. Login memakai
`superadmin` (sandi dari `SUPERADMIN_PASSWORD`, bawaan `Nuha2026!` — ganti).
Akun uji lain di CLAUDE.md sudah tidak berlaku. Backup pra-hapus ada di
`temp/backup-sebelum-purge-2026-08-26.sql` (tidak di-commit).

## 2026-08-26 — Akademik: penjelajah lembaga→tingkat→kelas + penyaring, sembunyikan 9 menu

`/akademik` sebelumnya menaruh semua rombel dua lembaga dalam satu dropdown
datar, dan tiap tab punya penyaringnya sendiri yang tak saling nyambung.

- **Penjelajah bertingkat** (`Penjelajah.tsx` + `pohon.ts`): Semua pesantren →
  SMP/MA/Pondok → tingkat → kelas, berupa chip dengan cacah santri. Cacah
  dihitung dengan penyaring lain tetap berlaku tapi tanpa unit/tingkat/kelas
  itu sendiri, jadi angka di chip = jumlah yang benar-benar didapat kalau
  chip itu diklik. Ada remah roti untuk mundur satu tingkat.
- **Penyaring bersama** (`filter.ts` + `BarisFilter.tsx`): pencarian, status,
  jenis kelamin, program, angkatan, asrama, dan urutan. Pilihan program/
  angkatan/asrama diambil dari data yang benar-benar ada — operator tak bisa
  memilih nilai yang hasilnya nol. Tiap filter aktif tampil sebagai chip yang
  bisa dicopot satu per satu, plus "Bersihkan semua".
- Keadaan filter hidup di URL (bisa di-bookmark & dibagikan) dan **dipakai
  bersama keempat tab** — Siswa, Presensi, Nilai, Rapor. Dropdown rombel di
  tab Nilai & Rapor ikut menyempit mengikuti penjelajah.
- Rombel bernama sama di tahun ajaran berbeda (data warisan punya dua "7A")
  kini diberi keterangan TA supaya dua chip tak lagi kembar tak terbedakan.
- **Menu disembunyikan** dari sidebar atas permintaan client: kurikulum,
  poskestren, keuangan, lms, gaji, ujian, kunjungan, ppdb, laporan. Daftarnya
  di `MENU_DISEMBUNYIKAN` (`components/templates/Shell.tsx`) — hapus kuncinya
  untuk memunculkan lagi. **Ini penyembunyian navigasi saja**: halaman dan
  `requirePage` tidak disentuh, jadi hak akses tak berubah dan URL langsung
  masih bisa dibuka oleh peran yang berhak.
- Gaya chip dipindah ke kelas bersama `.chip`/`.chip-aktif` di `globals.css`;
  `app/induk/BarisFilter.tsx` ikut memakainya (sebelumnya gaya sebaris).

Verifikasi: Playwright login `superadmin` ke `http://202.59.200.26:3226`,
keempat tab dirender tanpa `pageerror`, drill-down SMP→7→7A menyempitkan
hasil 87→60→11→1, sidebar terbukti tinggal 10 menu. `npx tsc --noEmit` bersih.

## 2026-08-26 — Data Induk: penjelajah lembaga→tingkat→kelas + penyaring

`/induk` sebelumnya hanya punya satu kotak cari nama; 87 santri dari dua
lembaga menumpuk dalam satu daftar datar tanpa cara menyempitkan.

- Kolom baru **Lembaga & kelas**: pohon `unit → tingkat → kelas` memakai
  `<details>` asli browser, jadi buka/tutup jalan tanpa JS klien. Tiap simpul
  menampilkan cacah santri yang **sudah menghormati filter lain**, sehingga
  angka di pohon = angka yang muncul saat simpul diklik (bukan cacah total
  yang menyesatkan).
- Penyaring cepat: status (Mukim/Kalong/Alumni/Keluar), jenis kelamin,
  angkatan (diambil dari `tahunMasuk` yang benar-benar ada di data, bukan
  daftar hardcode). Semua pilihan berupa **tautan**, bukan form — satu klik =
  satu keadaan URL yang bisa di-bookmark, dibagikan, dan di-*back*.
- Pencarian kini mencakup **NIS dan NISN**, bukan cuma nama.
- `whereFilter` disusun sebagai daftar `AND` (`app/induk/filter.ts`) supaya
  OR nama/NIS/NISN tidak bentrok dengan penyaring JK di relasi `orang` yang
  sama — versi awal yang menempel `where.orang` + `where.OR` sekaligus akan
  membuang syarat JK diam-diam.
- Klik kelas mereset `?sel=` karena santri terpilih bisa tersaring keluar.
- Baris daftar kini menampilkan NIS + badge status, tak lagi unit (unit sudah
  jelas dari cabang pohon yang sedang dibuka).

Diverifikasi lewat Chromium ke `http://202.59.200.26:3226` (login riil
superadmin): 6 kombinasi filter dirender tanpa `pageerror`/`console.error`,
dan cacahnya dicocokkan ke DB — MA=27, kelas X=8, Mukim+Putri=14, semua sama.

Catatan operator: kolom `kelas.tingkat` untuk MA tidak konsisten di data hasil
impor (`X`, `X1`, `X2`, `XI` hidup berdampingan), jadi pohon menampilkan
"Tingkat X1"/"Tingkat X2" yang janggal. Ini **data**, bukan kode — perlu
pembersihan di sisi impor/seed.

## 2026-08-26 — Fase 7: penjadwal notifikasi WA + reminder piket & ngajar

Penjadwal yang sebelumnya **tidak pernah ada** akhirnya dibangun. 20 dari 38
template WA bertanda "Terjadwal" (`WA-KEU-02` jatuh tempo H-3 08.00,
`WA-GUR-01` batas nilai 07.00, dst) selama ini **tidak pernah benar-benar
terkirim** — yang jalan hanya kirim manual dan pemicu di server action.

- Service `nuha-cron` terpisah di compose, **bukan** `setInterval` di Next.js:
  `output: 'standalone'` bisa punya lebih dari satu instans sehingga pesan
  akan terkirim ganda.
- `AntreanNotifikasi` berkunci idempoten `[kodeTemplate, tujuanId,
  tanggalJadwal]` — pencegahan ganda lewat kunci unik, bukan cek-lalu-tulis
  yang bisa balapan. Dibuktikan: tiga kali jalan, tetap 10 baris.
- Zona waktu WIB (UTC+7) ditangani eksplisit di `lib/penjadwal/waktu.ts`
  tanpa lib tambahan — container default UTC.
- Template baru `WA-GUR-04` (piket: H-1 19.00 dan H-0 45 menit sebelum shift)
  dan `WA-GUR-05` (rekap ngajar 06.30, satu pesan per guru agar tidak
  membanjiri). Semua pengiriman lewat `kirimWa()` sehingga tercatat di
  `LogWa` + `AuditLog` seperti kirim manual.
- **Ejaan hari beda antar tabel**: `jadwal_piket` memakai `Jum'at` (apostrof,
  ikut foto sumber) sedangkan `jadwal_pelajaran` memakai `Jumat` polos.
  Ditangani dua tabel nama hari terpisah, bukan locale.

**Yang perlu diketahui operator — reminder belum bisa terkirim ke siapa pun:**

- **Nol dari 29 pegawai punya nomor HP.** `DATA GURU.xlsx` tidak memuat kolom
  itu sama sekali. Jadi seluruh 10 baris antrean berstatus
  `DilewatiTanpaHp` — dicatat eksplisit di log, bukan diam-diam dilewati dan
  bukan crash. **Penjadwalnya jalan dan teruji, tapi reminder baru sampai ke
  guru setelah client menyerahkan nomor HP.** Tidak ada nomor palsu yang
  diisikan ke DB untuk membuat ini "berhasil".
- **Koreksi atas angka yang sempat mengkhawatirkan**: 67 dari 115 baris
  `jadwal_pelajaran` memang ber-`pegawai_id` NULL, tetapi itu **bukan**
  tanda pemetaan guru gagal. Rinciannya: 41 baris jadwal fiktif SMP + 5
  Pondok dari seed prototype, 19 baris MA fiktif lain, dan dari data client
  nyata (kelas X & XI) hanya **3**: `TKA` dan `EKSTRA` yang sengaja NULL
  (kegiatan tanpa pengampu tunggal), plus satu baris seed basi
  ("Pak Agus Salim", Sabtu XI jam 8 — punya kolom `ruang` yang tidak pernah
  diisi importir). Pemetaan data client praktis lengkap: 48 dari 50 slot.
- Baris seed fiktif itu masih perlu dibersihkan agar laporan tidak rancu.

## 2026-08-26 — Fase 4: struktur organisasi dari SK

Model baru `JabatanStruktural` (migrasi aditif murni: satu `CREATE TABLE` +
FK, nol perubahan tabel lama) berisi 40 baris dari dua SK: 9 pengurus MA
(008/YKM-NH/SK-MA/VII/2026) dan 31 pengurus Asrama Putra
(006/YKM-NH/SK-APa/VII/2026). Tab "Struktur" baru di `/kepegawaian`.

**Keputusan desain: jabatan struktural BUKAN peran RBAC — nol peran baru
ditambahkan** (tetap 12). `peran` mengatur akses menu; jabatan seperti
"Kepala Laboratorium", "Wakil Ketua Bid. Humas", atau "Div. Keamanan" tidak
butuh menu yang dibedakan — Kepala Madrasah memakai peran `kepma`, Lurah
memakai `pengasuh`. Menjadikan 31 pengurus asrama sebagai peran login akan
meledakkan RBAC tanpa guna. Jadi ini murni data organisasi.

**Yang perlu diketahui operator:**

- **Hanya 8 dari 40 baris tercocokkan ke `Pegawai`**, sisanya `pegawai_id`
  NULL dengan `nama_mentah` terisi. Itu benar, bukan kegagalan impor:
  "Tika Kartika, S.Pd" (Kepala Madrasah) dan "Dra. Nyai Hj. Roudlatul
  Hasanah" memang tidak ada di tabel Pegawai, dan 30 dari 31 pengurus asrama
  adalah santri/pengurus pondok, bukan pegawai.
- **9 pengurus asrama ternyata ADA sebagai `Orang`** (santri) — dicek dengan
  query nama. `JabatanStruktural` hanya punya FK ke `Pegawai`, jadi
  keterkaitan itu **belum terekam**. Kalau nanti perlu, tambahkan `orangId`
  nullable; sengaja tidak dilakukan sekarang agar tidak menebak lingkupnya.
- **Batas divisi 28 pengurus asrama (no 4–31) SENGAJA tidak ditebak.** Di
  ekstraksi PDF, label "Div. Pendidikan" muncul *setelah* nama ke-4 sehingga
  tidak jelas apakah label mengawali atau mengakhiri kelompoknya. Semua
  disimpan `jabatan='Pengurus'`, `divisi=NULL`. **Perlu konfirmasi client.**
  Yang pasti: no 1–3 (Lurah, Sekretaris, Keuangan) memang tidak berdivisi.
- **Satu orang boleh menjabat lebih dari satu kali** — kunci uniknya
  `[skNomor, urutan]`, bukan per orang. Isma Izha Utama memegang 3 baris
  (Waka Sarpras + Kepala Laboratorium di MA, dan no. 26 di asrama).
- "Muhammad Bismar As Sidiq" di SK asrama **tidak** dipautkan ke
  "Muhammmad Bismar As Sidiq, S.H" (guru MA) walau ejaannya mirip —
  konteksnya beda (pengurus pondok vs guru), jadi tidak dipastikan.
- Idempoten lewat upsert `[skNomor, urutan]`; dibuktikan dua kali jalan,
  tetap 40 baris.

## 2026-08-26 — Fase 6: modul Kepegawaian (piket, jurnal, presensi, SK)

Lima model baru (`JadwalPiket`, `JurnalMengajar`, `PresensiPegawai`,
`BebanJam`, `ArsipSk`) lewat migrasi aditif — nol `DROP`/`TRUNCATE`, data
lama utuh (87 santri, 29 pegawai). Menu `kepegawaian` + 5 tab, berkas SK
disajikan lewat route bergerbang `berkas/[nama]/route.ts`, **bukan**
`public/`.

**Jadwal piket terisi 5 dari 17 baris.** Sumbernya foto tabel MPLS, yang
client konfirmasi dipakai sebagai piket reguler. Yang perlu diketahui
operator:

- **12 baris dilewati, tidak membatalkan seluruh impor** (kebijakan sama
  dengan `import-siswa-smp.ts`). Keduabelas nama itu tidak ada di tabel
  `Pegawai` sama sekali — seluruhnya diduga **guru SMP, yang datanya memang
  belum pernah diserahkan client**. Menahan 5 baris yang sudah pasti benar
  berarti reminder piket Fase 7.2 tak bisa diuji sampai data itu tiba.
- **Tiga ejaan diperbaiki lewat pemetaan eksplisit** (`EJAAN_FOTO` di
  `import-piket.ts`), masing-masing hanya punya satu kandidat: "M. Bismar
  As-Shidiq" → `Muhammmad Bismar As Sidiq` (tiga m), "Muchammad Said" →
  `Fitri Muchammad Sa’id` (apostrof U+2019), "Warda Haizatil" →
  `Wardatul Haizatil Husna`. Pencocokan itu sendiri **tidak dilonggarkan**.
- **Jum'at hanya 2 shift**, bukan 3 seperti hari lain → total 17 baris, bukan
  18. Shift kedua Jum'at (09.00-11.05) juga tidak nyambung dari shift pertama
  (07.00-09.35) — kemungkinan salah cetak di sumber, **diimpor apa adanya**.
- `JadwalPiket` diberi `@@unique([hari, waktuMulai])` supaya importir
  idempoten; dibuktikan dengan jalan dua kali, tetap 5 baris.
- `BebanJam` dan `ArsipSk` sengaja masih kosong (belum ada sumber datanya).

**Bug seed yang ikut ketemu & dibereskan**: `seed.ts` mengasumsikan satu wali
utama per santri, padahal importir data client menandai **ayah dan ibu**
sebagai kontak utama (itu benar — keduanya dihubungi). Akibatnya seed jatuh
dengan P2002 di `user_username_key` karena mencoba membuat dua akun
`wali.<nis>`. Kini pemegang akun dipilih deterministik (`waliId` terkecil);
wali lain tetap ada sebagai relasi, hanya tanpa akun login.

## 2026-08-26 — `43d6745b` — Fase 3: importir XLSX data client nyata

Data client sungguhan masuk ke DB, menggantikan sebagian data fiktif
`proto-data.json`. Semua importir idempoten — dibuktikan dengan menjalankan
dua kali dan menghitung baris, bukan dari status perintah.

| Perintah | Hasil |
|---|---|
| `npm run import:guru-ma` | 17 Pegawai unit MA |
| `npm run import:siswa-ma` | 19 Santri (11 kelas XI TA 2025/2026, 8 kelas X 2026/2027) |
| `npm run import:siswa-smp` | 52 Santri (2 baris cacat dilewati) |
| `npm run import:jadwal-ma` | 50 JadwalPelajaran, `pegawaiId` terisi 48/50 |

**Yang perlu diketahui operator:**

- **Importir SMP melewati baris cacat, tidak membatalkan seluruh berkas.**
  Form pendataan diisi manual oleh banyak orang sehingga selalu ada sel salah
  (ditemukan: NIK 17 digit di KELAS 8 baris 9, NISN kosong di baris 21). Baris
  yang dilewati dicetak lengkap; perbaiki di berkas sumber lalu jalankan ulang.
- **`import:presensi-ma` sengaja tidak menulis apa pun.** CSV client adalah
  rekap agregat per siswa (`Total Hadir/Terlambat/Pulang`) tanpa kolom tanggal,
  sedangkan `Presensi` berkunci `[santriId, tgl, sesi]`. Angka sumbernya juga
  tidak konsisten: `Hari Tercatat` bernilai 1 di semua baris padahal
  Hadir+Terlambat+Pulang mencapai 30. **Perlu ekspor presensi per-tanggal dari
  client.**
- **`alias-guru.ts` jadi 16 entri.** "B. Ifa" dipetakan ke Kholifatun Khasanah
  — satu-satunya guru MA dengan mapel "Fisika, Kimia", dan "B. Ifa" hanya
  muncul mengampu KIM/FIS. **Masih perlu konfirmasi client.**
- **"TKA" dan "EKSTRA" bukan nama guru** → masuk `KODE_BUKAN_GURU`,
  `pegawaiId` dibiarkan NULL. Konsekuensinya dua slot itu tidak akan menerima
  reminder ngajar Fase 7.
- **"P. Bismar" dipetakan ke ejaan `DATA GURU.xlsx`** (`Muhammmad`, tiga m)
  karena berkas itulah sumber baris Pegawai — bukan ejaan SK (`Muh.`).
- Pencocokan nama guru memakai bentuk yang diratakan (gelar dibuang, apostrof
  lengkung U+2019 diseragamkan, huruf berulang dirapatkan) dan **hanya menerima
  kecocokan tunggal**; nol atau ambigu ditolak dan diselesaikan dengan menambah
  entri eksplisit di kamus, bukan dengan melonggarkan pencocokan.
- SMP ternyata 52 siswa, bukan 38 seperti dugaan rencana — sheet
  "KELAS 9 A&B" berisi dua rombel sekaligus. Rekap client menyebut 70;
  selisihnya masih terbuka.

## 2026-08-26 — `72e4967a` — Fase 1, 2 & 5: skema data client + importir keuangan

Skema disiapkan agar data client bisa masuk apa adanya, plus importir CSV
keuangan.

- Model baru `TahunAjaran`; `Kelas` di-scope ke tahun ajaran
  (`@@unique([unitId, nama, tahunAjaranId])`) karena "X" 2025/2026 dan "X"
  2026/2027 berisi orang berbeda.
- `StatusHadir` ditambah `Terlambat` dan `PulangCepat` — dua metrik utama di
  presensi MA yang sebelumnya hilang saat impor.
- `Santri.nis` jadi opsional: seluruh data client hanya punya NISN.
- FK `Kelas.waliKelasId` dan `JadwalPelajaran.pegawaiId` menggantikan
  pencocokan by-nama. Kolom string lama ditandai deprecated, tidak dihapus.
- `Pegawai`, `Orang` (alamat terstruktur), `RelasiWali` diperluas; model baru
  `ProfilKesehatan` dan `JadwalDiniyah` (Madin berbasis kitab, bukan kelas).
- Periode aktif `2026/2027 Gasal` tidak lagi hardcode — kini baris
  `TahunAjaran` yang di-seed.
- Fase 5: importir CSV keuangan di `prisma/import/`. **Validasi seluruh berkas
  lebih dulu; satu galat berarti batal tanpa menulis apa pun ke DB** — bukan
  gagal separuh jalan. `Tagihan.dibayar` dihitung ulang dari `SUM(Pembayaran)`,
  nilai di CSV hanya dipakai sebagai kondisi awal.

**Jebakan migrasi yang sudah dibereskan** (catat untuk migrasi berikutnya):
migrasi awal men-drop index unik `kelas(unit_id, nama)` sebelum penggantinya
ada, padahal FK `kelas.unit_id` bersandar pada index itu → MySQL galat 1553.
Urutannya dibalik dan ditambah index penopang `kelas_unit_id_idx`. Selain itu
image `nuha-migrate` **harus di-build ulang** sebelum dijalankan (`docker
compose build nuha-migrate`), dan setiap migrasi yang gagal separuh jalan
meninggalkan DDL parsial yang harus diperiksa serta dibersihkan sebelum
mencoba lagi.

**Dampak operasional**: `vitest.config.mts` diperluas agar `include` mencakup
`prisma/**/*.test.ts` — tanpa itu test importir tidak pernah dijalankan
`npm test`.

## 2026-08-26 — `4ee19a5d` — Fase 7: notifikasi WA reminder piket & ngajar

- **Temuan operasional penting**: dari 38 template WA di
  `prisma/proto-data.json`, **20 bertanda "Terjadwal"** (mis. `WA-KEU-02`
  jatuh tempo H-3 pukul 08.00, `WA-GUR-01` batas input nilai 07.00), tetapi
  pencarian `cron|setInterval|scheduler|node-cron` di seluruh `app/` dan
  `lib/` **tidak menemukan penjadwal apa pun**. Artinya seluruh notifikasi
  terjadwal selama ini **tidak pernah benar-benar terkirim** — yang jalan
  hanya kirim manual dan pemicu di dalam server action.
- Fase 7.1: service `nuha-cron` terpisah di compose, bukan `setInterval` di
  Next.js — `output: 'standalone'` bisa punya lebih dari satu instans
  sehingga pesan akan terkirim ganda. `AntreanNotifikasi` diberi kunci
  idempoten `[kodeTemplate, tujuanId, tanggalJadwal]`.
- Fase 7.2 `WA-GUR-04` reminder piket — butuh model `JadwalPiket` baru
  (`piket` di proto-data hanya array JSON tanpa model, tak bisa di-query).
  Sumbernya foto jadwal piket MPLS; **perlu konfirmasi client** apakah
  berlaku juga sebagai piket reguler.
- Fase 7.3 `WA-GUR-05` reminder ngajar — rekap pagi 06.30, satu pesan per
  guru. Bergantung pada `JadwalPelajaran.pegawaiId` (Fase 1 butir 5): tanpa
  FK itu sistem tidak bisa menemukan nomor HP guru, karena jadwal hanya
  menyimpan nama panggilan ("B. Hasni") yang tak cocok dengan `Orang`.
- **Dampak operasional — pengalihan nomor saat debugging**: seluruh
  notifikasi WA dialihkan ke `085607550989` (`6285607550989`), dikirim dari
  perangkat `085735248244` (`6285735248244`). Diterapkan lewat env
  `WA_DEBUG_REDIRECT` dan `WA_SENDER_NUMBER`, **tidak di-hardcode**.
  Pengalihan aktif terlepas dari `WA_DRY_RUN` supaya aman menguji pengiriman
  sungguhan; nomor tujuan asli tetap dicatat agar log tetap berguna.
  **`WA_DEBUG_REDIRECT` wajib dikosongkan sebelum produksi** — selama masih
  terisi, tidak ada wali santri yang menerima notifikasi apa pun.

## 2026-08-26 — `7d188296` — Rencana import data client + template keuangan

- Audit 14 dokumen client di `docs/` (XLSX/PDF/DOCX/CSV) dibandingkan dengan
  `prisma/schema.prisma` dan `prisma/proto-data.json`. Hasilnya
  `docs/RENCANA-IMPORT.md`: 6 fase, dari perubahan skema sampai fitur baru.
- **MA dikonfirmasi baru berjalan 2 tahun** — hanya kelas X (8 siswa,
  TA 2026/2027) dan XI (11 siswa, TA 2025/2026), total 19. Kelas XII belum
  ada dan **bukan** data yang hilang; jadwal client pun hanya X & XI.
- Temuan skema yang menghalangi impor: enum `StatusHadir` tidak punya
  `Terlambat`/`PulangCepat` padahal itu metrik utama di presensi MA;
  `Kelas` belum di-scope tahun ajaran sehingga "X" dua angkatan bertabrakan;
  `Santri.nis` wajib tapi kolom NIS di seluruh data client kosong (hanya
  NISN); jadwal memakai nama panggilan guru ("B. Hasni", "Miss Via") yang
  tidak sama dengan nama resmi sehingga pencocokan by-nama pasti pecah.
- Madrasah Diniyah diusulkan jadi `Unit` sendiri (7 jenjang I'dad–Enam,
  22 asatidz) dengan model `JadwalDiniyah` terpisah — `JadwalPelajaran`
  tidak cocok karena kuncinya `@@unique([hari, jamKe, kelas])` sedangkan
  Madin berbasis kitab dan tempat non-kelas.
- **Dampak operasional**: `prisma/proto-data.json` masih 100% fiktif; tidak
  ada satu pun nama nyata dari client yang sudah masuk sistem.
- Template keuangan di `docs/templates/` (tagihan, pembayaran, gaji, kas)
  karena client belum menyerahkan data keuangan sama sekali. Kolomnya
  mengikuti persis field model Prisma; NISN dipakai sebagai kunci santri
  karena NIS belum ditetapkan.
- **Berkas sumber client sengaja tidak di-commit** — memuat NIK, no. KK,
  dan nomor HP siswa serta orang tua yang nyata.

## 2026-08-24 — `749ad0a4` — Pagination di pengguna, PPDB, tunggakan, kurikulum, CRUD generik

- Molecule `components/molecules/Pagination.tsx` + util
  `components/utils/pagination.ts` (`UKURAN_HALAMAN`, `satu`, `bacaHalaman`)
  diekstrak dari pola yang sudah ada di `TabSiswa.tsx`, lalu dipakai ulang.
- Ditambahkan ke: `TabPengguna` (akun `User` termasuk santri+wali),
  `TabPendaftar`/`TabSeleksi`/`TabKelulusan` (PPDB), `TabTunggakan`
  (tagihan lintas santri, pakai `$queryRaw` karena Prisma tak bisa
  bandingkan dua kolom di `where`), `TabSoal`/`TabPerangkat` (bank soal &
  perangkat ajar).
- **Dampak operasional**: `lib/crud/engine.ts` (`listRows`) sebelumnya
  diam-diam memotong hasil ke 100 baris tanpa indikasi apa pun ke user
  (tidak ada total count, tidak ada halaman berikutnya) — kini
  `app/data/[entity]/page.tsx` menampilkan pagination sungguhan untuk
  semua entitas registry. Halaman lain (referensi kecil, agregasi,
  entity-scoped) sengaja tidak disentuh — lihat plan pagination audit.

## 2026-08-23 — `d7bc8fdc` — Restrukturisasi `components/` ke atomic design

- `components/ui/primitives.tsx`, `charts.tsx`, `Tabs.tsx`, dan
  `components/Shell.tsx` dipecah ke `components/atoms/`, `molecules/`,
  `organisms/`, `templates/`, dan `utils/` — pure restructure, tidak ada
  perubahan behavior atau styling.
- `components/index.ts` jadi barrel export sehingga seluruh import di
  `app/**` (104 file) cukup diarahkan ke satu path (`@/components`) tanpa
  perlu memecah tiap import statement per simbol per file baru.
- `app/**/Tab*.tsx` dan `page.tsx` tetap di lokasi masing-masing (constraint
  Next.js file-based routing) — hanya path import yang berubah.

**Dampak operasional**

- Tidak ada perubahan Prisma, query, atau route — verifikasi cukup lewat
  `npx tsc --noEmit` (hijau) dan smoke test setelah rebuild image
  (`docker compose build nuha-app && docker compose up -d nuha-app`):
  login superadmin, `/`, `/akademik`, `/keuangan`, `/kepesantrenan`,
  `/poskestren` semuanya render 200 tanpa error server.
- `npm run lint` tidak bisa dijalankan di host ini (Node 18.19, Next 16
  butuh ≥20.9) — pre-existing, bukan akibat perubahan ini.
- Kontributor baru: komponen UI generik ditambah di level yang sesuai
  (`atoms/` untuk elemen tunggal, `molecules/` untuk komposit kecil,
  `organisms/` untuk chart/komponen besar) lalu diekspor lewat
  `components/index.ts` — jangan tambah lagi file flat di `components/ui/`
  (folder itu sudah dihapus).

## 2026-08-23 — `376820e2` — Ujian berbasis komputer (CBT) dengan IRT dan anti-curang

- Delapan model baru (`soal`, `opsi_soal`, `paket_soal`, `butir_paket`,
  `sesi_cbt`, `peserta_cbt`, `jawaban_peserta`, `log_kecurangan`) lewat migrasi
  aditif `20260823210000_cbt_ujian_online` — tidak ada tabel lama yang diubah.
  `BankSoal` yang sudah ada tetap metadata kurikulum; butir sungguhan hidup di
  `soal`.
- `lib/cbt.ts`: koreksi otomatis enam tipe soal, pengacakan deterministik
  per peserta, analisis butir (p dan D dari kelompok 27% atas/bawah), IRT tiga
  parameter, dan penaksiran theta lewat pencarian kemungkinan maksimum.
  32 tes unit di `tests/cbt.test.ts`.
- Modul `/ujian` bertambah empat tab: Bank Soal, Sesi CBT, Pengawasan
  (termasuk panel penilaian esai), dan Kartu Ujian siap cetak.
- Portal santri bertambah tab **Ujian CBT** dan layar pengerjaan
  `/portal/santri/ujian/<id>` dengan autosave, penanda ragu-ragu, hitung waktu,
  dan pengawasan sisi klien.

**Dampak operasional**

- Token sesi hanya tampil saat sesi berstatus Berjalan; kartu ujian sengaja
  tidak memuat token karena dibagikan jauh sebelum ujian.
- Pembekuan peserta setelah batas pelanggaran dilakukan server dan tidak
  pernah dibatalkan otomatis — pengawas yang membuka kembali, tercatat di audit.
- Kunci zona jaringan (`sesi_cbt.ip_prefix`) memakai awalan IP pemanggil.
  Sesi contoh pertama sengaja dibiarkan terbuka agar bisa diuji dari luar lab.
- Analisis butir menolak berjalan di bawah empat responden.
- Peran pengelola ujian kini termasuk `superadmin` (sebelumnya hanya ketua dan
  kepala unit), supaya akun debug bisa menjalankan aksi pengelolaan.
- Seed CBT (`prisma/seed-cbt.ts`) idempoten; sesi berstatus Berjalan diberi
  jendela waktu relatif terhadap saat seed dijalankan agar benar-benar bisa
  dicoba.

## 2026-08-23 — `a770bdca` — Bagian onboarding proyek di /docs

- Lima bagian baru di paling atas /docs untuk orang yang baru mengenal
  proyek: "Proyek ini untuk apa" (4 unit + prinsip satu identitas), peta
  seluruh modul per kelompok urusan, lima alur data inti (PPDB → santri,
  nilai, uang masuk, santri sakit, WhatsApp), cara sistem dibangun, dan
  glosarium istilah pesantren.
- Data di `app/docs/onboarding.ts` + komponen `Onboarding.tsx` terpisah
  agar tiap file tetap < 400 baris. Sidebar bertambah 5 item (total 19).
- Diverifikasi Chromium via IP publik: 5 section render, 7/7 klik sidebar
  menandai item benar, nol pageerror.

## 2026-08-23 — `72dec77c` — Smooth scroll + fix scroll-spy /docs

- Lompatan dari sidebar kini meluncur halus (`scroll-behavior: smooth`,
  dimatikan bila pengguna menyetel prefers-reduced-motion).
- Bug "klik item, yang menyala malah di atasnya" diperbaiki. Akar masalahnya
  `loading="lazy"` pada screenshot: gambar termuat di tengah luncuran
  menggeser tata letak sehingga anchor mendarat di bagian sebelumnya. Lazy
  dilepas, scroll-spy dihitung dari posisi scroll (bagian terakhir yang
  melewati garis baca), dan klik mengoreksi posisi hingga tepat sasaran.
- Diverifikasi Chromium: 14/14 klik menandai item yang benar; scroll manual
  bergerak maju berurutan.

## 2026-08-23 — `4c569a35` — Sidebar navigasi di /docs

- Daftar isi berpindah dari kartu di atas konten menjadi sidebar kiri yang
  sticky, dengan scroll-spy (item bagian yang sedang dibaca ditandai) dan
  tombol kembali ke aplikasi. Layar ≤860px: berubah jadi pill daftar isi di
  atas konten; saat print disembunyikan.
- Komponen baru `app/docs/NavSamping.tsx` (client, IntersectionObserver);
  lebar halaman docs 880 → 1180px dua kolom.

## 2026-08-23 — `bda183df` — Manajemen ujian + kartu guru lintas unit

- Model baru `Ujian`, `JadwalUjian`, `NilaiUjian`; kolom `unit_id` pada
  `jadwal_pelajaran` (backfill dari nama kelas). Migrasi
  `20260823190000_ujian_dan_unit_jadwal`.
- Modul `/ujian` (menu `ujian`, peran: ketua, kepsmp, kepma, guru): tab
  Gelombang (status Draf→Berjalan→Selesai oleh kepala unit; gelombang Selesai
  mengunci nilai), Kartu Ujian, dan Input Nilai per sesi oleh guru pengampu.
  Santri absen disimpan barisnya dengan nilai 0. Semua aksi diaudit.
- Kartu "Kelas Saya" ditulis ulang: dikelompokkan per unit (SMP + MA + pondok),
  badge Wali Kelas / Ustadz Diniyah, KKM, kelengkapan nilai + rerata, rincian
  presensi hari ini, sesi ujian terdekat.
- Seed: jadwal lintas unit per guru + kelas Diniyah Wustha; ujian hanya untuk
  mapel yang benar-benar diajarkan (sesi basi dari mapel data-uji dibersihkan).
- Dampak: jumlah menu berubah (superadmin 18, ketua 16, kepala unit 11,
  guru 10); `nuha-migrate` perlu build ulang sebelum run.

## 2026-08-23 — `54dccc56` — Peran guru, pairing WhatsApp QR, halaman /docs

- Tab Perangkat di /notifikasi: daftarkan nomor, tampilkan QR (scan dari WA
  mobile), status terhubung/putus; kredensial Baileys di volume
  `nuha_simterpadu_wa_data`.
- Compose mewajibkan `WA_GATEWAY_ACCOUNT_TOKEN` (sandi buatan sendiri untuk
  endpoint kelola perangkat gateway) — tanpa itu compose menolak start.
- Halaman `/docs` bergerbang sesi: alur per modul + screenshot dari
  `docs-assets/` lewat route ber-auth (bukan `public/`).
- Peran ketua yang salah dicabut dari akun musyrif.b@ dan tu.smp@.

## 2026-08-22 — `2c7de099` — Super admin + pemilih peran

- Akun `superadmin` dengan seluruh menu; dropdown "Lihat sebagai" untuk
  menyamar sebagai peran lain (server menolak bila peran asli bukan super
  admin; tercatat sebagai GANTI_PERAN).

## 2026-08-22 — `95afd81a` — Port seluruh modul, portal, dan halaman publik

- 14 modul staf bertab, portal santri & wali (baca-saja ditegakkan server),
  halaman publik + wizard PPDB 5 langkah + cek status.

## 2026-08-21 — `f693d3f6` — Design system, shell, dashboard

- Token warna, primitif UI, Shell (sidebar gradient + ticker agenda), dan
  dashboard diport dari prototype `apps/marketing/sub/nuha`.

## Sebelumnya

- `8daa40b1` prototype → aplikasi nyata (Next.js + Prisma + MySQL, Docker).
- `07a208ac`, `e07367ee`, `34507351` modul akademik–laporan, portal, WA,
  payroll, audit, CRUD generik.
- `8fb6f31c` fix kuki login di atas http (kenapa verifikasi wajib lewat IP
  publik, bukan localhost).
- 2026-09-21 · d2253af · Fix alur pendaftaran cards: tambah ikon berwarna per langkah dan garis konektor dash horizontal, sesuai prototype.
