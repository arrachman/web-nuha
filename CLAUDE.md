# web-nuha — SIMTERPADU Pondok Pesantren Nurul Huda Mergosono

Panduan Claude Code khusus app ini. Aturan repo di `/opt/sentient-factory/CLAUDE.md`
tetap berlaku; yang di sini menambah, bukan menggantikan.

## Apa ini

Sistem informasi pesantren terpadu (SIMTERPADU): 18 menu staf, 2 portal
(santri & wali), halaman publik + PPDB, notifikasi WhatsApp, penggajian,
dan audit log. Diport dari prototype statis di
`apps/marketing/sub/nuha/dist/index.html` — desain harus tetap setia padanya.

- **Stack**: Next.js (App Router, `output: 'standalone'`), React 19, TypeScript
  strict, Prisma + MySQL 8, JWT (`jose`) di kuki httpOnly `nuha_session` (8 jam).
- **Deploy**: Docker Compose di folder ini — service `nuha-mysql`, `wa-gateway`
  (Baileys, internal saja), `nuha-migrate` (sekali jalan: migrate + seed), `nuha-app`.
- **URL uji**: `http://202.59.200.26:3226` — **selalu verifikasi lewat IP publik
  ini, jangan 127.0.0.1** (bug kuki pernah lolos di localhost).
- Port: app `3226`, MySQL host `3308`. Gateway `3204` tidak dipetakan ke host.
- **Port 3226 WAJIB `npm run dev`, bukan Docker/production.** Jangan jalankan
  `docker compose up nuha-app` (container standalone) di port ini — agent lain
  atau user bisa mematikannya kapan saja untuk pakai `npm run dev` langsung.
  Kalau container `nuha-app` sedang berjalan dan menahan port 3226, matikan
  (`docker compose stop nuha-app`) sebelum start `npm run dev`. Rebuild Docker
  hanya kalau user eksplisit minta deploy ke mode production.

## Menjalankan

```bash
cd apps/web-nuha
docker compose up -d --build          # butuh .env: AUTH_SECRET + WA_GATEWAY_ACCOUNT_TOKEN
docker compose logs -f nuha-app
```

`WA_GATEWAY_ACCOUNT_TOKEN` adalah sandi buatan sendiri (bukan token WhatsApp
resmi) yang menggerbangi endpoint kelola perangkat gateway. Tanpa dua variabel
wajib itu, compose menolak start. `WA_DRY_RUN=true` (bawaan) menahan pengiriman
WA sungguhan — jangan setel false saat testing tanpa penerima yang diotorisasi.

**Iterasi UI/kode (default)**: pakai `npm run dev` (hot reload), **jangan**
`docker compose build` untuk tiap perubahan kecil — rebuild+redeploy standalone
mahal dan tidak perlu saat masih iterasi. Rebuild Docker hanya saat memang mau
verifikasi/deploy ke environment uji publik (`http://202.59.200.26:3226`), atau
saat user eksplisit minta deploy.

## Arsitektur yang wajib diikuti

1. **RBAC dinamis** — menu per peran hidup di tabel `menu`/`menu_peran`/
   `user_peran`, bukan hardcode. Setiap halaman & server action memanggil
   `requirePage('<menuKey>')` dari `lib/access.ts`; menu tersembunyi bukan
   pengaman. Menu baru = baris `menu` + `menu_peran` di seed **dan** entri
   `HREF_BY_KEY` di `components/templates/Shell.tsx` (tanpa itu tidak muncul
   di sidebar).
2. **Audit** — semua aksi yang mengubah keadaan memanggil `recordAudit()` dari
   `lib/audit.ts`.
3. **Server Actions** — mutasi lewat `'use server'` + `FormData` +
   `revalidatePath`; tidak ada API route CRUD baru tanpa alasan.
4. **Tab server-side** — `?tab=` dengan `Tabs`/`tabAktif` dari
   `@/components` (molecules/Tabs.tsx + utils/tabs.ts). Satu file per tab
   (konvensi maks 400 baris/file); pengumpul data panjang dipisah ke modul
   sendiri (contoh: `app/kurikulum/kelas-guru.ts`).
5. **Primitif UI** — `components/` mengikuti atomic design: `atoms/`
   (Badge, Ring, ProgressBar, Kosong, Avatar), `molecules/` (Card, StatCard,
   Tabel, Tabs, JudulHalaman), `organisms/` (chart-chart), `templates/`
   (Shell), `utils/` (helper murni: rp, inisial, avaBg, kelasStatus,
   tabAktif). Semua diekspor lewat barrel `components/index.ts` — import
   selalu dari `@/components`, **jangan** buat file flat baru langsung di
   `components/` (folder `components/ui/` sudah dihapus). Kelas badge yang
   tersedia: hijau, biru, kuning, merah, netral, oranye, toska, pink —
   **tidak ada `badge-ungu`**; cek `styles/globals.css` sebelum memakai
   kelas baru.
6. **Data nyata** — angka di layar dihitung dari Prisma, bukan konstanta.
   Kalau datanya belum ada, perluas `prisma/seed.ts` (idempoten, nilai contoh
   deterministik dari indeks — bukan acak).
7. **Identitas guru** — jadwal pelajaran mencocokkan **nama** (`jadwal.guru ===
   session.nama`), belum FK pegawai. Kartu "Kelas Saya" dan filter modul Ujian
   bergantung pada kecocokan nama persis.

## Skema & migrasi

- Ubah `prisma/schema.prisma` → buat migrasi di `prisma/migrations/` →
  **wajib** `docker compose build nuha-migrate && docker compose run --rm
  nuha-migrate` (image migrate suka basi; build dulu). Jangan tulis warning
  Prisma ke file .sql (pernah kejadian lewat redirect shell).
- `nilai_ujian` (per sesi) sengaja terpisah dari `nilai` (rekap rapor per
  periode). Santri absen disimpan barisnya dengan nilai 0, bukan dihapus.
- Periode aktif hardcode `2026/2027 Gasal` di `app/kurikulum/kelas-guru.ts` —
  kandidat dipindah ke pengaturan.

## Akun uji (sandi semua: `Nuha2026!`)

| Peran | Login |
|---|---|
| Super admin (semua menu + pemilih peran) | `superadmin` |
| Ketua yayasan | `ketua@nuha.pesantren.web.id` |
| Kepala SMP / MA | `kepsek.smp@…` / `kepsek.ma@…` |
| Guru | `guru.1` … `guru.10` |
| Bendahara / pengasuh / poskestren | `<peran>@nuha.pesantren.web.id` |
| Santri / wali | `santri.<NIS>` / `wali.<NIS>` |

## Verifikasi (aturan keras dari user)

Jangan pernah menyatakan "berhasil end-to-end" dari status HTTP saja.
Verifikasi lewat Chromium/Playwright ke IP publik: login riil, sidebar sesuai
`menu_peran`, tiap tab merender tanpa `pageerror`, negatif (peran tanpa hak →
redirect), dan mutasi dicek sampai baris DB-nya. `npx tsc --noEmit` sebelum build.

## Dokumentasi & riwayat

- `/docs` (butuh sesi) dirender dari `app/docs/isi.ts`; screenshot di
  `docs-assets/` disajikan lewat route bergerbang, **bukan** `public/`.
  **Fitur baru = tambah bagiannya di `isi.ts`** (+ screenshot bila layar baru),
  dan koreksi angka akun/menu di tabel `AKUN` bila jumlah menu berubah.
- **Setiap perubahan yang di-commit dicatat di `HISTORY.md`** (baris baru di
  atas): tanggal, hash, ringkasan, dan dampak yang perlu diketahui operator.
