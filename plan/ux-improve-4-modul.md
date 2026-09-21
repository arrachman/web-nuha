# Plan: Perbaikan UX — /induk, /akademik, /kepegawaian, /data

Status: usulan (belum dieksekusi)
Tanggal: 2026-08-29
Cakupan: `app/induk`, `app/akademik`, `app/kepegawaian`, `app/data`, `app/globals.css`, `components/`

---

## 1. Temuan (hasil baca kode, bukan asumsi)

### T1 — Tidak ada umpan balik saat memuat (dampak terbesar)
Tidak ada satu pun `loading.tsx` atau `error.tsx` di seluruh `app/`
(`find app -name 'loading.tsx' -o -name 'error.tsx'` → kosong). Semua penyaring
berupa `<Link>`/GET form ke server. Artinya **setiap klik chip atau "Terapkan"
membuat layar membeku tanpa tanda apa pun** sampai query Prisma selesai. Di
`/akademik` tab Siswa, satu klik = 4 query paralel (`bacaPohon`, `bacaOpsi`,
`count`, `findMany`). Pengguna tidak tahu apakah kliknya masuk → cenderung
mengklik ulang.

### T2 — `/induk` memuat seluruh hasil tanpa paginasi
`app/induk/page.tsx:44` — `prisma.santri.findMany({ where, ... })` tanpa
`take`/`skip`. Dengan filter kosong (kondisi awal halaman), ini menarik seluruh
tabel santri, lalu `DaftarSantri` membatasi tampilan dengan `maxHeight: 520`
CSS saja. Modul lain (`/akademik`, `/kepegawaian`, `/data`) sudah memakai
`Pagination` + `UKURAN_HALAMAN`. `/induk` satu-satunya yang tidak.

### T3 — Tiga idiom penyaring berbeda di empat halaman
| Halaman | Idiom |
|---|---|
| `/induk` | chip toggle + kotak cari inline, terapkan langsung per klik |
| `/akademik` | form `<select>` + tombol **Terapkan**, plus chip-copot di bawahnya |
| `/kepegawaian` | penjelajah chip (instan) **dan** form select terpisah (butuh Terapkan) |
| `/data/[entity]` | `FilterBar` generik |

Pengguna harus belajar ulang tiap pindah modul. Di `/kepegawaian` bahkan dua
idiom bertumpuk di satu layar: chip lembaga berlaku seketika, sementara "Jenis
kelamin" tepat di bawahnya tidak berlaku sampai tombol ditekan.

### T4 — Posisi penjelajah tidak konsisten terhadap tabbar
`/kepegawaian` merender `Penjelajah` + `BarisFilter` **di atas** tabbar
(`page.tsx`), dengan komentar eksplisit bahwa konteks lembaga harus bertahan
antar tab. `/akademik` melakukan kebalikannya: `Penjelajah` dirender di dalam
tiap tab (`TabSiswa`, `TabPresensi`, `TabNilai`, `TabRapor`), dan
`BarisFilter` hanya ada di `TabSiswa` + `TabPresensi` — **tab Nilai dan Rapor
kehilangan pencarian/penyaring** meski datanya sama-sama per-santri.

### T5 — Master-detail `/induk` tidak responsif
`page.tsx:79` mengunci `gridTemplateColumns: '250px 300px 1fr'` sebagai gaya
sebaris. `app/globals.css` punya media query di 900/640/600px, tapi tak satu
pun menyentuh grid ini (gaya sebaris juga tak bisa di-override CSS). Di layar
< 1100px, kolom detail terjepit; di ponsel tiga panel berdempetan. Operator TU
yang membuka dari laptop kecil atau tablet akan kesulitan.

### T6 — Filter `jk` ada di logika tapi tak ada kontrolnya di `/induk`
`filter.ts` memvalidasi, menghitung (`jumlahFilterAktif`), dan menerjemahkan
`jk` ke WHERE Prisma — tetapi `BarisFilter.tsx` tidak pernah merendernya.
Filter hanya bisa diaktifkan dengan mengetik URL manual. `/akademik` dan
`/kepegawaian` punya kontrolnya.

### T7 — `/data` = 21 entitas datar tanpa pencarian
`registry.ts` mendaftar 21 entitas; `/data/page.tsx` merendernya sebagai kartu
per-modul tanpa kotak cari dan tanpa "terakhir dibuka". Menemukan satu entitas
berarti memindai seluruh halaman dengan mata.

### T8 — Aksesibilitas chip
Chip navigasi di `Penjelajah` (`/akademik`, `/kepegawaian`) adalah `<Link>`
tanpa `aria-current`; hanya `/induk/BarisFilter.tsx:10` memakai `aria-pressed`.
Pembaca layar tidak tahu penyaring mana yang aktif. Keadaan aktif juga
disampaikan **hanya lewat warna** (`.chip-aktif` hijau).

---

## 2. Prioritas

Diurut berdasarkan (dampak ke pengguna) ÷ (biaya perubahan).

| # | Perbaikan | Temuan | Dampak | Biaya |
|---|---|---|---|---|
| P1 | Skeleton + `loading.tsx` per modul | T1 | Tinggi | Rendah |
| P2 | Paginasi `/induk` | T2 | Tinggi | Rendah |
| P3 | Satukan idiom penyaring (auto-apply) | T3 | Tinggi | Sedang |
| P4 | Naikkan penjelajah `/akademik` ke atas tabbar | T4 | Sedang | Rendah |
| P5 | Responsif master-detail `/induk` | T5 | Sedang | Rendah |
| P6 | Kontrol `jk` di `/induk` | T6 | Rendah | Sangat rendah |
| P7 | Pencarian entitas di `/data` | T7 | Sedang | Rendah |
| P8 | `aria-current` + penanda non-warna pada chip | T8 | Sedang | Rendah |
| P9 | `error.tsx` global | T1 | Sedang | Rendah |

---

## 3. Rencana per fase

### Fase 1 — Kecepatan yang terasa (P1, P9, P2)

**1a. Skeleton loading**
- Tambah `app/globals.css`: kelas `.skeleton` (blok abu berdenyut) dan
  `.skeleton-baris`. Hormati `@media (prefers-reduced-motion: reduce)` yang
  sudah ada di baris 430 — matikan animasinya di sana.
- Tambah `components/atoms/Skeleton.tsx`, ekspor lewat barrel `components/index.ts`
  (sesuai aturan atomic design di CLAUDE.md — jangan buat file datar di `components/`).
- Buat `app/induk/loading.tsx`, `app/akademik/loading.tsx`,
  `app/kepegawaian/loading.tsx`, `app/data/[entity]/loading.tsx` yang meniru
  kerangka halaman aslinya (bilah filter + tabel), bukan spinner generik.

**1b. `error.tsx`**
- `app/error.tsx` (client component) dengan pesan Bahasa Indonesia + tombol
  `reset()`. Saat ini kegagalan query Prisma = layar error Next mentah.

**1c. Paginasi `/induk`**
- Pakai `bacaHalaman`, `UKURAN_HALAMAN`, `Pagination` yang sudah ada
  (`components/molecules/Pagination.tsx`) — bukan bikin baru.
- `page.tsx`: tambah `prisma.santri.count({ where })` ke `Promise.all`, lalu
  `skip`/`take` di `findMany`.
- `hrefInduk` sudah menerima `extra`; tambahkan kunci `halaman` di sana
  (pola sama dengan `hrefAkademik`).
- **Hati-hati**: `selId` sekarang jatuh ke `daftar[0]?.id` — dengan paginasi,
  santri terpilih bisa berada di luar halaman aktif. Ubah agar `sel` divalidasi
  lewat query terpisah (`findUnique` + cek lolos `where`), bukan `daftar.some()`.
- Buang `maxHeight: 520` di `DaftarSantri` setelah paginasi masuk.

Kriteria selesai: klik chip di `/induk` menampilkan skeleton < 100 ms; halaman
awal `/induk` hanya query `UKURAN_HALAMAN` baris; memilih santri lalu ganti
halaman tidak mereset seleksi.

---

### Fase 2 — Konsistensi penyaring (P3, P4, P6)

**2a. Auto-apply, hilangkan tombol "Terapkan"**
- Buat satu `components/molecules/PenyaringOtomatis.tsx` (client component)
  yang membungkus `<select>`: `onChange` → `router.push(hrefBaru)`. Polanya
  sudah ada persis di `LimitPicker.tsx` — tiru, jangan reka ulang.
- Ganti `<select>` di `app/akademik/BarisFilter.tsx` dan
  `app/kepegawaian/BarisFilter.tsx` dengan komponen ini.
- Kotak cari **tetap** form GET (mengetik tidak boleh memicu navigasi per
  ketukan); pertahankan tombol "Cari" seperti di `/induk`.
- Hasilnya: satu aturan tunggal di empat halaman — *pilihan berlaku seketika,
  ketikan berlaku saat Enter*.

**2b. Chip-copot di semua halaman**
`/akademik` sudah punya daftar `copot` yang bagus (satu chip per filter aktif,
bisa dicabut satuan). `/kepegawaian` hanya mencopot `q` dan `jk`; `/induk`
cuma punya "Hapus N filter" borongan. Angkat pola `/akademik` menjadi
`components/molecules/FilterAktif.tsx` (menerima `{label, href}[]`), lalu pakai
di ketiganya.

**2c. Naikkan penjelajah `/akademik`**
- Pindahkan `<Penjelajah>` + `<BarisFilter>` dari `TabSiswa`/`TabPresensi`/
  `TabNilai`/`TabRapor` ke `app/akademik/page.tsx`, di atas `<Tabs>` — persis
  seperti `app/kepegawaian/page.tsx` sudah melakukannya.
- Beri `<Tabs>` prop `hrefTab={(key) => hrefAkademik(key, f)}` supaya filter
  ikut terbawa antar tab (tanpa ini filter ter-reset — lihat komentar di
  `Tabs.tsx`).
- Efek samping baik: tab Nilai & Rapor otomatis dapat pencarian yang selama ini
  hilang.

**2d. Kontrol `jk` di `/induk`**
Tambah satu `Kelompok` chip "Jenis kelamin" (Putra/Putri) di
`app/induk/BarisFilter.tsx`. Logikanya sudah lengkap di `filter.ts` — ini murni
merender kontrol yang hilang.

Kriteria selesai: mengubah `<select>` mana pun langsung memuat ulang hasil;
berpindah tab di `/akademik` mempertahankan unit/tingkat/kelas/pencarian; tiap
filter aktif punya chip yang bisa dicopot satuan di tiga halaman.

---

### Fase 3 — Layar kecil & aksesibilitas (P5, P8)

**3a. Master-detail responsif `/induk`**
- Pindahkan grid dari gaya sebaris ke kelas `.induk-grid` di `app/globals.css`
  (gaya sebaris tidak bisa di-override media query).
- Breakpoint:
  - ≥ 1280px: `250px 300px 1fr` (sekarang)
  - 900–1279px: `220px 1fr` — pohon lembaga jadi `<details>` yang terlipat
  - < 900px: satu kolom; saat `?sel=` ada, tampilkan panel detail saja + tautan
    "‹ Kembali ke daftar" (`hrefInduk(f, {}, {})`). Ini pola master-detail
    mobile yang lazim dan tidak butuh JS karena seleksi sudah hidup di URL.

**3b. Aksesibilitas chip**
- Tambah `aria-current="true"` pada chip aktif di `Penjelajah` (`/akademik`,
  `/kepegawaian`) — pola sudah dipakai di `app/data/ringkasan-santri.tsx:33`.
- Beri `.chip-aktif` penanda non-warna (tanda centang kecil atau border tebal)
  agar keadaan aktif tidak hanya lewat warna (WCAG 1.4.1).
- Pastikan kontras `.chip-aktif` (teks `--krem` di atas `--hijau`) ≥ 4.5:1;
  ukur, jangan asumsikan.

---

### Fase 4 — Navigasi `/data` (P7)

- Tambah kotak cari klien di `app/data/page.tsx` yang memfilter 21 kartu
  entitas berdasarkan label (client component kecil; datanya sudah di server).
- Tampilkan jumlah baris per entitas pada kartu (`count` batch) supaya operator
  tahu mana yang berisi — opsional, ukur biaya query dulu sebelum dipasang.
- Pertimbangkan "Terakhir dibuka" via `localStorage`. **Rendah prioritas** —
  hanya kalau Fase 1–3 sudah beres.

---

## 4. Yang sengaja TIDAK dilakukan

- **Tidak** mengubah RBAC / `requirePage` / seed menu. Semua di sini murni lapisan tampilan.
- **Tidak** mengubah skema Prisma → tidak ada migrasi di plan ini.
- **Tidak** mengganti filter GET/URL jadi state klien. Keadaan-di-URL adalah
  keputusan arsitektur yang sudah benar (bisa dibookmark & dibagikan); yang
  diperbaiki adalah *umpan baliknya*, bukan mekanismenya.
- **Tidak** menambah pustaka pihak ketiga.
- **Tidak** memakai `badge-ungu` atau kelas CSS yang tak ada di `globals.css`.

---

## 5. Verifikasi (wajib, sesuai aturan keras di CLAUDE.md)

Per fase, bukan sekali di akhir:

1. `npx tsc --noEmit` — sebelum apa pun dinyatakan selesai.
2. Chromium/Playwright ke **`http://202.59.200.26:3226`** (bukan 127.0.0.1):
   - Login riil sebagai `superadmin`, lalu ulangi sebagai `guru.1` dan
     `kepsek.smp@…` (peran berbeda = menu & data berbeda).
   - Tiap tab di keempat halaman dirender tanpa `pageerror`.
   - Negatif: peran tanpa hak `/kepegawaian` → redirect.
   - Fase 1: konfirmasi skeleton benar-benar muncul (throttle jaringan).
   - Fase 2: konfirmasi filter bertahan saat pindah tab `/akademik`.
   - Fase 3: cek di viewport 1280 / 1024 / 390 px.
3. `/docs` — tambah/ubah bagiannya di `app/docs/isi.ts` bila layarnya berubah
   nyata (Fase 3 mengubah tata letak `/induk` → wajib).
4. `HISTORY.md` — satu baris baru di atas per commit.

## 6. Urutan commit yang disarankan

Satu commit per sub-fase, jangan ditumpuk:

```
feat(web-nuha): skeleton loading & error boundary di 4 modul utama   # 1a,1b
feat(web-nuha): paginasi daftar santri di /induk                     # 1c
refactor(web-nuha): penyaring select berlaku otomatis tanpa Terapkan   # 2a
refactor(web-nuha): chip filter aktif seragam di induk/akademik/kepegawaian # 2b
refactor(web-nuha): penjelajah akademik naik ke atas tabbar           # 2c
feat(web-nuha): penyaring jenis kelamin di /induk                     # 2d
feat(web-nuha): tata letak /induk responsif di layar kecil            # 3a
fix(web-nuha): aria-current & penanda non-warna pada chip penyaring    # 3b
feat(web-nuha): pencarian entitas di /data                            # 4
```

---

## 7. Perkiraan

| Fase | Isi | Perkiraan |
|---|---|---|
| 1 | Skeleton, error boundary, paginasi induk | ~½ hari |
| 2 | Penyatuan penyaring | ~1 hari |
| 3 | Responsif + a11y | ~½ hari |
| 4 | Navigasi /data | ~¼ hari |

Fase 1 sendirian sudah memberi porsi terbesar perbaikan yang terasa. Kalau
waktu terbatas, kerjakan Fase 1 lalu 2c (penjelajah akademik) dan 2d
(kontrol `jk`) — dua yang terakhir masing-masing di bawah 30 menit.
