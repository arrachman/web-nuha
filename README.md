# web-nuha — SIMTERPADU

Aplikasi nyata (bukan prototype statis) untuk **Sistem Informasi Manajemen
Terpadu** Yayasan Pendidikan Islam Nurul Huda Mergosono.

Berasal dari prototype `apps/marketing/sub/nuha` (export claude.ai/design, satu
file HTML tanpa backend). Di sini alur dan datanya dipindahkan ke stack nyata:
**Next.js (App Router) + Prisma + MySQL**, dijalankan lewat Docker Compose.

## Prinsip data: satu identitas, banyak peran

Konsep inti prototype dipertahankan di skema. Seorang santri pondok yang juga
siswa SMP adalah **satu** record `Orang` dengan beberapa baris peran
(`Santri`, `Pegawai`, `User`, `RelasiWali`) — bukan beberapa record per unit.
Layar **Data Induk** adalah demonstrasi utama konsep ini.

## Menjalankan

Butuh Docker. Semuanya berdiri sendiri — tidak menyentuh `infra/docker-compose.yml`,
MySQL bersama di port 3307, atau `config/ports.json`.

```bash
cd apps/web-nuha
cp .env.example .env       # WAJIB: ganti password & AUTH_SECRET
docker compose up -d --build
```

Compose menjalankan tiga langkah berurutan:

1. `nuha-mysql` — MySQL 8 di host port **3308**, volume `nuha_simterpadu_mysql_data`.
2. `nuha-migrate` — job sekali jalan: `prisma migrate deploy` lalu seed. Idempoten.
3. `nuha-app` — Next.js standalone di host port **3226**, start setelah migrasi sukses.

Verifikasi:

```bash
curl -s http://127.0.0.1:3226/api/health   # {"success":true,...,"database":"connected"}
```

Akun demo hasil seed: `ketua@nuha.pesantren.web.id` / `Nuha2026!`
(8 akun staf, satu per peran — ganti password sebelum dipakai sungguhan.)
Akun portal dibuat otomatis dengan username `santri.<NIS>` dan `wali.<NIS>`, memakai
password awal yang sama; akun ini memakai login username/password tanpa OTP.

Konfigurasi WhatsApp ada di `.env` (jangan commit file tersebut):
`WA_GATEWAY_URL`, `WA_GATEWAY_TOKEN`, dan `WA_DRY_RUN` (default `true`). Gateway
mengikuti kontrak Fonnte-compatible `/send`; nomor `08xx` dinormalisasi menjadi
`62xx`. Set `WA_DRY_RUN=false` hanya setelah gateway dan nomor uji resmi siap.

## Pengembangan lokal

Node 20+ (host default masih 18 — pakai nvm). Dependensi di-hoist ke root
monorepo lewat npm workspaces.

```bash
npm install --workspace web-nuha
cd apps/web-nuha
docker compose up -d nuha-mysql
npx prisma migrate dev
npx tsx prisma/seed.ts
npm run dev            # http://localhost:3226
```

`prisma migrate dev` butuh shadow database. User `nuha` sudah diberi akses ke
`nuha_shadow`; set `SHADOW_DATABASE_URL` di `.env` bila membuat DB dari nol.
Untuk deploy cukup `prisma migrate deploy` (tanpa shadow DB).

## Layar

| Rute | Isi |
| --- | --- |
| `/login` | Masuk; sesi JWT HS256 di cookie httpOnly (8 jam) |
| `/` | Dashboard yayasan: santri aktif, PPDB, tunggakan, agenda, pengumuman |
| `/induk` | Data Induk lintas unit — satu identitas, banyak peran |
| `/kepesantrenan` | Okupansi asrama, setoran hafalan, ta'zir, perizinan |
| `/poskestren` | Rekam kunjungan kesehatan + stok obat |
| `/keuangan` | Tagihan SPP/syahriyah, pembayaran, kas |
| `/akademik` | Jadwal pelajaran, nilai, rombel |
| `/kurikulum` | Struktur kurikulum, perangkat ajar, capaian, bank soal |
| `/lms` | Kursus, materi, dan tugas LMS |
| `/penggajian` | Perhitungan gaji + terbit/bayar/revisi slip `slip_gaji` |
| `/notifikasi` | Template pemicu WhatsApp, kirim uji, dan log pengiriman |
| `/portal/santri` | Portal santri: profil, hafalan, izin, tagihan sendiri |
| `/portal/wali` | Portal wali: anak-anak asuh dan tagihannya |
| `/kunjungan-wali` | Buku tamu kunjungan wali santri |
| `/ppdb` | Formulir pendaftaran (tulis ke DB) + rekap pendaftar |
| `/laporan` | Rekap lintas modul: santri, keuangan, kas, PPDB |
| `/pengaturan` | Unit, peran, pengguna, dan pemetaan menu (khusus ketua) |

Menu sidebar **tidak hardcoded** — dibaca dari tabel `menu`/`menu_peran` sesuai
peran user yang login. Hak yang sama juga menjaga halamannya: `requirePage()`
di `lib/access.ts` mengecek `menu_peran` sebelum merender, jadi menu yang
disembunyikan benar-benar tidak bisa dibuka lewat URL langsung, bukan sekadar
tidak ditautkan.

Angka gaji **dihitung** dari `komponen_gaji` (`lib/gaji.ts`), bukan disalin
sebagai total jadi, agar slip tidak pernah menyimpang dari komponennya.

## API

Semua respons memakai envelope `{ success, data, error }`.

| Endpoint | Keterangan |
| --- | --- |
| `GET /api/health` | Cek liveness + koneksi DB |
| `POST /api/auth/login` | Login email atau username; validasi zod, bcrypt, waktu respons konstan |
| `POST /api/auth/logout` | Hapus sesi dan catat audit logout |
| `POST /api/wa/kirim` | Kirim/dry-run pesan melalui gateway; wajib grant `wa` |
| `POST /api/gaji/slip` | Terbitkan, bayar, atau revisi slip; wajib grant `gaji` |
| `POST /api/ppdb` | Pendaftaran PPDB (publik, tervalidasi) |
| `GET /api/ppdb` | Rekap pendaftar (**wajib sesi**) |

## Data seed

Seed mengimpor dataset asli dari prototype (`prisma/proto-data.json`, hasil
ekstraksi 42 array dari `dist/index.html`) menjadi record relasional:
60 orang, 20 santri, 12 pegawai + komponen gaji, 19 pendaftar, 20 tagihan,
16 pembayaran, 12 setoran hafalan, 18 rekam medis, 10 izin, 41 kamar,
38 template WA, 14 menu berbasis peran, 20 mata pelajaran, 22 jadwal,
6 kursus LMS, 10 perangkat ajar, 6 capaian pembelajaran, dan 8 bank soal.

Seed memutakhirkan data referensi akademik yang punya kunci unik agar migrasi
baru bisa terisi aman. Data operasional bersifat importer first-boot: bila user
sudah ada, proses langsung berhenti agar data historis tidak terduplikasi atau
ditimpa. Untuk memuat ulang seluruh demo data, gunakan database/volume
pengembangan baru.

## Catatan

- Port 3226 (app) dan 3308 (MySQL) **belum** didaftarkan di `config/ports.json`
  dan **belum** dibuka di UFW — keduanya sengaja tidak disentuh (lihat CLAUDE.md
  root §2 dan §9). Untuk akses dari LAN, daftarkan port lalu:
  `sudo ufw allow from 192.168.1.0/24 to any port 3226 proto tcp comment 'web-nuha'`
- Prototype lama di `apps/marketing/sub/nuha` **tetap ada** dan masih jalan di
  port 3223 — rujukan desain. Halaman publik (profil + cek status PPDB) belum
  dibuat di aplikasi ini.
- Portal santri/wali memakai tabel `user` dan sesi yang sama seperti staf, hanya
  dengan peran `santri`/`wali`; datanya di-scope dari sesi, bukan parameter URL.
- Wewenang slip gaji **digerakkan data**: siapa pun yang punya grant `menu_peran`
  untuk menu `gaji` boleh menerbitkan, membayar, dan merevisi. Revisi setelah
  bayar diizinkan tetapi menaikkan `revisi`, menyimpan catatan wajib, dan menulis
  diff nilai lama→baru ke `audit_log`.
- Semua aksi penting (login, login gagal, logout, kirim WA, siklus slip) ditulis
  ke tabel append-only `audit_log` sekaligus ke stdout JSON terstruktur.
- `.env` berisi rahasia dan tidak di-commit (`.gitignore` + `.dockerignore`).
