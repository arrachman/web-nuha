# Template Data Keuangan

Client belum menyerahkan data keuangan apa pun. Empat berkas CSV di folder ini
adalah template yang tinggal diisi — kolomnya sudah mengikuti persis field
model Prisma, jadi importirnya tipis dan tidak perlu pemetaan tambahan.

Baris yang ada sekarang adalah **contoh**, bukan data nyata. Hapus sebelum
mengisi data sebenarnya.

| Berkas | Isi | Model tujuan |
|---|---|---|
| `template-tagihan-spp.csv` | SPP & biaya lain per santri per periode | `Tagihan` |
| `template-pembayaran.csv` | Setoran atas tagihan yang sudah terbit | `Pembayaran` |
| `template-gaji-pegawai.csv` | Komponen gaji tetap per pegawai | `KomponenGaji` |
| `template-kas.csv` | Kas masuk/keluar yayasan | `TransaksiKas` |

## Aturan pengisian

- **Encoding UTF-8**, pemisah koma. Nilai yang mengandung koma dibungkus
  tanda kutip ganda — lihat `"Khalimatus Sa'diyah, S.Si"`.
- **Tanggal** format `YYYY-MM-DD` (mis. `2026-09-10`).
- **Nominal** angka polos tanpa titik, koma, atau `Rp` — tulis `350000`,
  bukan `Rp350.000`.
- **`nisn`** adalah kunci penghubung ke santri. NIS belum ditetapkan client,
  jadi NISN yang dipakai untuk mencocokkan.
- **`kode`** harus unik di seluruh berkas (`Tagihan.kode` dan
  `TransaksiKas.kode` keduanya `@unique` di skema).
- **`kode_tagihan`** di `template-pembayaran.csv` harus merujuk `kode` yang
  sudah ada di `template-tagihan-spp.csv`.
- **`arah`** hanya boleh `Masuk` atau `Keluar` (enum `ArahKas`).
- **`dibayar`** boleh `0`; nilainya akan diperbarui otomatis oleh importir
  pembayaran, jadi cukup isi kondisi awal.

## Catatan per berkas

**`template-gaji-pegawai.csv`** — `jam_mengajar` dan `tarif_jam` dipakai untuk
guru yang dibayar per jam; isi `0` untuk pegawai bergaji tetap. Kolom
`jam_mengajar` seharusnya diambil dari SK Pembagian Tugas Guru, tetapi kolom
jam di SK itu **masih kosong** — perlu dikonfirmasi ke client.

**`template-tagihan-spp.csv`** — `periode` mengikuti format yang dipakai
sistem: `2026/2027 Gasal` / `2026/2027 Genap`.
