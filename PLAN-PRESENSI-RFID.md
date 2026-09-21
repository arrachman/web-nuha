# Rencana Arsitektur — Presensi RFID (ESP32) + Notifikasi WA Wali

Status: rencana, belum diimplementasikan. Disusun 2026-08-30.

Alat: ESP32 + modul RFID RC522 + LCD 16x2 (sudah terpasang di MA).
Tujuan: santri tap kartu → presensi tercatat → WA otomatis ke nomor wali.

## 1. Keputusan inti

| Pertanyaan | Keputusan | Alasan |
|---|---|---|
| Transport ESP32 → server | **HTTPS POST langsung** ke `/api/perangkat/tap` | Tidak menambah service baru (MQTT broker). Beban nyata kecil: 30 tap ≈ 30 request dalam ~30 detik — jauh di bawah kapasitas Next.js. MQTT juga **tidak menolong** di sini: alat ada di LAN dan server di cloud (§1c), sehingga broker harus ditaruh di cloud — kompleksitas naik tanpa mengurangi ketergantungan pada internet. |
| Topologi | Alat di **LAN pesantren**, app di **cloud**; koneksi **keluar saja** | Tidak perlu port forwarding/VPN/IP publik di sisi pesantren. Lihat §1c. |
| Jam masuk/pulang | Tabel `JadwalGerbang` **per hari**, bukan konstanta | Jumat & Sabtu beda jam pulang, Ahad libur; ganti jadwal tidak boleh perlu deploy. |
| Retry WA | 3 percobaan, backoff 1→5 menit, lalu **alarm email** | Notifikasi presensi basi tidak berguna; lebih baik menyerah cepat lalu lapor. Lihat §5c. |
| Stabilitas saat burst | **Endpoint tap tidak mengirim WA.** Tap hanya menulis DB lalu balas `200` (<200 ms). Pengiriman WA dilepas ke **outbox + worker** | Gateway Baileys serial dan lambat (~1–3 dtk/pesan). Kalau WA dikirim di dalam request tap, tap ke-30 menunggu ~60 dtk → LCD hang, santri antre, ESP32 timeout. |
| Kehilangan data saat WiFi putus | **Buffer di ESP32** (ring buffer di NVS/SPIFFS, ~200 tap) + kirim ulang dengan `tapId` unik | Presensi tetap valid meski server/WiFi mati; idempotensi mencegah duplikat saat kirim ulang. |
| Auth perangkat | **Token per perangkat** (`Authorization: Bearer <token>`), disimpan ter-hash | Endpoint ini terekspos jaringan; kuki sesi tidak berlaku untuk perangkat. |
| Trigger WA | Setiap tap **masuk** dan **pulang** | Sesuai permintaan; dilindungi dedup + jam tenang agar tidak spam. |

### Kenapa bukan MQTT (untuk sekarang)

MQTT unggul saat perangkat banyak dan koneksi labil, tapi menambah Mosquitto ke
compose, satu proses subscriber yang harus dijaga hidup, dan jalur auth kedua.
Manfaat utamanya — tahan jaringan putus — sudah didapat dari buffer di ESP32.

Dengan topologi LAN→cloud (§1c) argumennya makin kuat: broker tetap harus di
cloud, jadi tap tetap melewati internet yang sama. MQTT hanya akan memindahkan
titik gagalnya, bukan menghapusnya. Kalau internet benar-benar sering putus,
jawabannya **relay lokal** (§1c), bukan MQTT.

## 1c. Topologi: RFID di LAN pesantren, web-nuha di cloud

```
┌─ Jaringan lokal pesantren (IP privat, di balik NAT) ─┐
│                                                       │
│   [ESP32 + RC522]  192.168.x.x                        │
│         │  WiFi                                        │
│         │  HTTPS POST keluar (port 443)                 │
│         ▼                                              │
│   [Router / NAT] ─────────────────────────┐            │
└───────────────────────────────────────────│────────────┘
                                            │  internet
                                            ▼
                            ┌─ Cloud (VPS web-nuha) ─────────┐
                            │  nuha.pesantren.web.id:443     │
                            │   reverse proxy (TLS)          │
                            │     └→ nuha-app :3226          │
                            │          ├→ nuha-mysql         │
                            │          └→ wa-gateway :3204   │
                            └────────────────────────────────┘
```

**Kabar baiknya: arah koneksinya keluar saja, jadi integrasinya sederhana.**
ESP32 yang memulai koneksi ke cloud, bukan sebaliknya. Konsekuensinya:

- **Tidak perlu port forwarding** di router pesantren. Tidak perlu IP publik,
  tidak perlu DDNS, tidak perlu VPN. NAT keluar sudah cukup.
- **Tidak perlu membuka port apa pun di firewall pesantren.** Justru jangan:
  mengekspos ESP32 ke internet adalah risiko tanpa manfaat.
- ESP32 **tidak boleh** bicara langsung ke MySQL. Kredensial DB di firmware =
  siapa pun yang membuka kotak alat bisa membaca seluruh basis data. Satu-satunya
  jalur adalah endpoint HTTPS `/api/perangkat/tap`.
- Aturan UFW repo (§4.1) berlaku untuk **port cloud**, bukan LAN pesantren.
  Yang perlu terbuka global hanya 443 di VPS.

### Blocker wajib: HTTPS + nama domain

Sekarang app diuji lewat `http://202.59.200.26:3226` — **HTTP polos**. Token
perangkat yang dikirim sebagai `Authorization: Bearer` di atas HTTP polos bisa
disadap di sepanjang jalur internet, dan siapa pun yang menyadapnya bisa
memalsukan presensi santri mana pun. Jadi sebelum perangkat menunjuk ke cloud:

1. Domain (mis. `nuha.pesantren.web.id`) mengarah ke VPS.
2. Reverse proxy (Caddy/nginx) + sertifikat Let's Encrypt, terminasi TLS di 443.
3. `nuha-app:3226` **tidak** diekspos langsung ke internet; hanya proxy yang boleh.
4. Perangkat menunjuk ke `https://<domain>/api/perangkat/tap`, bukan ke IP:port.

Selama masa uji boleh HTTP di LAN, tapi jangan pernah token produksi lewat HTTP publik.

### Gotcha TLS di ESP32 (sering bikin gagal berjam-jam)

- Pakai `WiFiClientSecure` dengan **root CA `ISRG Root X1`** yang di-pin, bukan
  sertifikat leaf. Let's Encrypt memperbarui leaf tiap ~60 hari; kalau yang
  di-pin leaf, alat mati total setiap perpanjangan. Root X1 berlaku sampai 2035.
- **Sinkron NTP dulu sebelum request pertama.** Validasi sertifikat butuh jam
  yang benar; ESP32 boot dengan jam 1970 → semua TLS handshake gagal dengan
  galat yang menyesatkan. Urutan boot: WiFi → NTP → baru HTTPS.
- Sediakan `setInsecure()` **hanya** di build debug, dan jangan pernah kirim
  token produksi lewat build itu.
- Heap: TLS handshake butuh ~30–40 KB. Jangan alokasi buffer besar sebelum request.

### Kalau internet pesantren sering putus: relay lokal (opsi lanjutan)

Buffer di ESP32 (§6) sudah menutup putus jaringan sampai ~200 tap. Kalau ternyata
kurang, tambahkan relay di LAN — **bukan** ganti arsitektur:

```
[ESP32] ──HTTP polos di LAN──► [Relay: Pi/mini-PC] ──HTTPS──► [Cloud]
                                 buffer SQLite, retry
```

Keuntungan: LCD tetap responsif walau internet mati berhari-hari, TLS diurus
satu tempat (bukan di tiap ESP32), dan buffer sebesar disk. Biaya: satu perangkat
tambahan yang harus dijaga hidup. Kontrak endpoint cloud-nya identik, jadi
migrasi ke relay tidak mengubah sisi server sama sekali. **Mulai tanpa relay;
tambahkan kalau data lapangan menunjukkan perlu.**

### Yang perlu dipastikan di lapangan sebelum implementasi

- Jangkauan WiFi di gerbang (ESP32 antena internal, beton/besi banyak menyerap).
- Apakah WiFi pesantren pakai captive portal / WPA2-Enterprise — ESP32 **tidak**
  bisa lewat captive portal, dan WPA2-Enterprise butuh konfigurasi khusus.
- Apakah DNS lokal bisa meresolusi domain publik (kalau ada filter DNS).

## 2. Alur end-to-end

```
[Kartu RFID]
   │ tap
   ▼
[ESP32] ── generate tapId (uid+epoch) ──┐
   │  LCD "Memproses…"                   │ gagal kirim → simpan ke buffer NVS,
   ▼                                     │ retry tiap 10 dtk
POST /api/perangkat/tap  ◄───────────────┘
   Bearer <token perangkat>
   { tapId, uid, waktu }
   │
   ├─ 1. verifikasi token → Perangkat
   ├─ 2. UID → KartuRfid → Santri     (tidak ketemu → 404 "Kartu tidak dikenal")
   ├─ 3. INSERT TapPresensi (unik: tapId)   ← idempotensi; P2002 = sudah pernah
   ├─ 4. UPSERT Presensi (santriId, tgl, sesi='Gerbang')
   ├─ 5. INSERT AntreanWa (status=Menunggu)  ← outbox, TIDAK kirim di sini
   └─ 6. 200 { nama: "Ahmad F.", arah: "Masuk", jam: "06:41" }   (<200 ms)
   │
   ▼
[ESP32] LCD 2 baris: "Ahmad F." / "MASUK 06:41" + buzzer
                                             │
                            (proses terpisah) │
                                             ▼
                                      [Worker WA]
                                 poll AntreanWa tiap 2 dtk
                                 → kirimWa() (lib/wa.ts)
                                 → status Terkirim / Gagal (+retry maks 3, backoff)
```

Kunci kestabilan: langkah 6 terjadi sebelum WA apa pun dikirim. Antrean WA boleh
tertinggal beberapa menit tanpa mengganggu antrean santri di gerbang.

## 3. Perubahan skema Prisma

Tiga model baru; `Presensi` yang ada dipakai apa adanya (sesi diisi `"Gerbang"`).
Struktur `Presensi` (`santriId, tgl, sesi VarChar(32), status, ket`, unik
`[santriId, tgl, sesi]`) sudah generik — tidak perlu diubah. Enum `StatusHadir`
juga sudah punya `Terlambat`. Catatan: daftar sesi sah di
`app/(staf)/kepesantrenan/actions.ts` masih hardcode lima waktu sholat, jadi
`"Gerbang"` harus ditambahkan ke sana (atau alur gerbang dipisah dari
`simpanAbsenJamaah`, yang lebih bersih).

Catatan tipe: sketsa di bawah memakai `String @default(cuid())` agar ringkas,
tetapi skema existing (`Presensi`, `Santri`) memakai `BigInt @default(autoincrement())`.
**Saat implementasi, ikuti konvensi existing `BigInt`** — termasuk `santriId` pada
`KartuRfid` dan `TapPresensi` — supaya FK-nya cocok.

```prisma
model PerangkatPresensi {
  id         String   @id @default(cuid())
  nama       String   @db.VarChar(64)      // "Gerbang MA"
  lokasi     String?  @db.VarChar(64)
  tokenHash  String   @unique              // sha256 token; token asli hanya tampil sekali
  aktif      Boolean  @default(true)
  terakhirAktif DateTime?
  taps       TapPresensi[]
}

model KartuRfid {
  id        String   @id @default(cuid())
  uid       String   @unique @db.VarChar(32)   // UID kartu, hex uppercase
  santriId  String
  santri    Santri   @relation(fields: [santriId], references: [id])
  aktif     Boolean  @default(true)            // kartu hilang → nonaktifkan, terbitkan baru
  diterbitkan DateTime @default(now())
  @@index([santriId])
}

model TapPresensi {
  id          String   @id @default(cuid())
  tapId       String   @unique @db.VarChar(64) // dibuat ESP32 → idempotensi
  perangkatId String
  santriId    String?                          // null = kartu tak dikenal (tetap dicatat)
  uid         String   @db.VarChar(32)
  arah        ArahTap                          // Masuk | Pulang
  waktu       DateTime                         // waktu di perangkat
  diterima    DateTime @default(now())         // waktu sampai server (deteksi tap tertunda)
  @@index([santriId, waktu])
}

enum ArahTap { Masuk Pulang }

// Kenapa model antrean baru, bukan AntreanNotifikasi yang sudah ada:
// kunci uniknya [kodeTemplate, tujuanId, tanggalJadwal] bersifat per-hari —
// cocok untuk notifikasi terjadwal, tapi tidak bisa membedakan dua tap
// (masuk & pulang) pada tanggal yang sama. Antrean tap butuh kunci per-tap.
// Model ini juga menambah retry/backoff, yang belum ada di AntreanNotifikasi.
model AntreanWa {
  id         String   @id @default(cuid())
  tujuan     String   @db.VarChar(24)
  isi        String   @db.Text
  kunci      String   @unique @db.VarChar(96)  // "tap:<tapId>" → anti kirim ganda
  status     StatusAntreanWa @default(Menunggu)
  percobaan  Int      @default(0)
  kirimSetelah DateTime @default(now())        // backoff
  galat      String?  @db.Text
  @@index([status, kirimSetelah])
}

enum StatusAntreanWa { Menunggu Terkirim Gagal DilewatiTanpaHp }
```

Penentuan `arah`: tap pertama santri pada satu hari = `Masuk`, tap berikutnya
berselang >`JEDA_ARAH` (default 30 menit) = kebalikan tap terakhir. Tap ulang
dalam <30 menit dianggap salah-pencet → dicatat di `TapPresensi` tapi tidak
membuat baris antrean WA baru.

### Jam masuk & pulang per hari

Jam **tidak** di-hardcode — disimpan per hari agar Jumat dan hari libur bisa beda
tanpa deploy ulang:

```prisma
model JadwalGerbang {
  id            Int      @id @default(autoincrement())
  hari          Int      @unique          // 0=Ahad, 1=Senin … 6=Sabtu
  aktif         Boolean  @default(true)   // false = libur, tap dicatat tanpa WA rutin
  jamMasuk      String   @db.VarChar(5)   // "06:30" — batas datang tepat waktu
  toleransiMnt  Int      @default(10)     // ≤06:40 masih Hadir, >06:40 Terlambat
  jamPulang     String   @db.VarChar(5)   // "14:00" — sebelum ini = PulangCepat
  batasAlpaMnt  Int      @default(120)    // belum tap 2 jam lewat jamMasuk → Alpa
}
```

Contoh isian seed (silakan koreksi sesuai jadwal MA sebenarnya — **ini asumsi
saya, mohon dikonfirmasi**):

| Hari | Aktif | Masuk | Toleransi | Pulang |
|---|---|---|---|---|
| Senin–Kamis | ya | 06:30 | 10 mnt | 14:00 |
| Jumat | ya | 06:30 | 10 mnt | 11:00 |
| Sabtu | ya | 06:30 | 10 mnt | 12:00 |
| Ahad | tidak | — | — | — |

Pemetaan tap → `StatusHadir` (semua nilai enum sudah ada, tidak perlu migrasi enum):

| Kondisi tap | Status |
|---|---|
| Masuk ≤ `jamMasuk + toleransi` | `Hadir` |
| Masuk > `jamMasuk + toleransi` | `Terlambat` |
| Pulang < `jamPulang` | `PulangCepat` |
| Pulang ≥ `jamPulang` | tidak mengubah status masuk |
| Tidak ada tap sampai `jamMasuk + batasAlpa` | `Alpa` (oleh job harian) |
| Ada `Izin`/sakit tercatat | status dari `Izin`, tap tidak menimpanya |

`Alpa` diisi job harian yang jalan sekali setelah `batasAlpaMnt`, hanya untuk
santri yang tidak punya baris `Presensi` hari itu dan tidak punya `Izin` aktif.
**Hari `aktif=false` dilewati** — libur bukan alpa.

Tanggal & jam memakai zona **Asia/Jakarta** secara eksplisit. Server cloud lazim
berjalan UTC; kalau `tgl` dihitung dari waktu UTC, tap pukul 06:30 WIB akan
tercatat di tanggal yang benar tapi tap malam bisa lompat hari. Simpan `waktu`
sebagai UTC, tapi turunkan `tgl` dan perbandingan jam di zona Jakarta.

## 4. Endpoint & modul baru

| Berkas | Isi |
|---|---|
| `app/api/perangkat/tap/route.ts` | POST tap. Verifikasi Bearer → `lib/perangkat/auth.ts`. Balas cepat. Terima batch (`{ taps: [...] }`) untuk kiriman ulang dari buffer. |
| `lib/perangkat/auth.ts` | `verifikasiPerangkat(request): Promise<PerangkatPresensi \| null>` — hash token, cari, update `terakhirAktif`. Timing-safe compare. |
| `lib/presensi/tap.ts` | `catatTap({perangkat, tapId, uid, waktu})` — logika langkah 2–5 dalam satu transaksi Prisma. Murni, bisa diuji tanpa HTTP. |
| `lib/presensi/arah.ts` | `tentukanArah(tapTerakhir, waktu)` — helper murni + konstanta `JEDA_ARAH_MENIT`. |
| `lib/wa/antrean.ts` | `antreWa({tujuan, isi, kunci})` (tangkap P2002 = sudah antre) + `prosesAntrean(batas)` untuk worker. |
| `scripts/cron.ts` (ubah, bukan berkas baru) | Sudah ada proses cron eksternal (`scripts/cron.ts` + `lib/penjadwal/cron.ts`). Tambahkan tick 2 detik yang memanggil `prosesAntrean()` di sana, alih-alih menambah proses/service baru yang harus dijaga hidup sendiri. Backoff 1/5/15 menit, maks 3 percobaan. |
| `app/(staf)/kepesantrenan/TabGerbang.tsx` | Tab baru: daftar tap hari ini (auto-refresh), status antrean WA, kartu tak dikenal. |
| `app/(staf)/pengaturan/TabPerangkat.tsx` | CRUD perangkat + terbitkan/cabut token, dan pemetaan UID kartu → santri. |

Menu baru wajib: baris `menu` + `menu_peran` di seed **dan** entri `HREF_BY_KEY`
di `components/templates/Shell.tsx`.

## 5. Pesan WA & pengendalian spam

Template baru di `TemplateWa` (`prisma/schema.prisma:1166`), kode `PRESENSI_MASUK`
dan `PRESENSI_PULANG`. Placeholder `{{kunci}}` diisi oleh `renderTemplate()`
(`lib/wa.ts:32`). Pengiriman lewat
`kirimWa({ nomor, tujuan, isi, templateId?, actor?, ip? })` (`lib/wa.ts:46`),
yang sudah menulis `LogWa` + `recordAudit('KIRIM_WA')` sendiri — worker tidak
perlu menduplikasi audit.

> Assalamu'alaikum. Ananda *{{nama}}* tercatat *{{arah}}* di {{lokasi}} pukul {{jam}}, {{tanggal}}. — PP Nurul Huda Mergosono

Pengaman:
- **Dedup**: `AntreanWa.kunci = "tap:<tapId>"` unik → kiriman ulang dari buffer
  ESP32 tidak menghasilkan WA kedua.
- **Jeda arah 30 menit** → tap beruntun tidak jadi dua pesan.
- **Tanpa HP wali** → status `DilewatiTanpaHp`, bukan `Gagal`; pakai pola
  `pisahkanBerdasarkanHp()` yang sudah ada di `lib/penjadwal/kontak.ts`.
- Nomor wali diambil lewat `Santri → orang → sebagaiAnak[] → wali.hp`, ambil
  wali `utama` dulu, jatuh ke wali pertama yang punya `hp`.
- `WA_DRY_RUN=true` tetap default (`lib/wa.ts:49`) → seluruh blok fetch dilewati,
  `LogWa.status = 'Dry-run'`, dan `ok: true`. **Uji seluruh alur dalam dry-run dulu.**
  Untuk uji kirim nyata: `WA_DRY_RUN=false` **plus** `WA_DEBUG_REDIRECT=<hp sendiri>`.
  Perhatikan `WA_DEBUG_REDIRECT` berlaku terlepas dari `WA_DRY_RUN`
  (`lib/wa.ts:24`), jadi ia bukan pengganti dry-run — ia hanya mengalihkan tujuan.

**Penting untuk logika retry**: gateway bergaya Fonnte — kegagalan tetap balas
HTTP 200 dengan body `status:false` (`lib/wa-gateway.ts:37`). Jadi worker
**tidak boleh** menilai sukses dari status HTTP; pakai nilai `ok` dari
`kirimWa()`, yang sudah menangani hal ini. Tandai `Gagal` + backoff hanya
berdasarkan `ok === false`.

## 5b. Kontrak existing yang dipakai ulang (jangan tulis ulang)

```ts
requirePage(menuKey: string): Promise<SessionPayload>   // lib/access.ts:9
recordAudit({ aksi, entitas, entitasId?, ringkasan,
              perubahan?, aktor?, ip? }): Promise<void> // lib/audit.ts:24
requestIp(request: Request): string | null              // lib/audit.ts:55
pisahkanBerdasarkanHp<T extends { hp: string | null }>  // lib/penjadwal/kontak.ts:6
```

- `recordAudit()` **tidak pernah throw** — kegagalan audit tidak membatalkan tap.
  Jadi aman dipanggil di dalam alur tap tanpa try/catch tambahan.
- Route tap pakai `requestIp(request)` untuk mengisi `ip` pada audit; **bukan**
  `requirePage()` (itu untuk halaman berkuki, dan ia `redirect()` — perilaku yang
  salah untuk perangkat, yang butuh balasan JSON 401).
- `StatusHadir` (`schema:645`) sudah punya `Terlambat` **dan `PulangCepat`** —
  keduanya pas untuk gerbang: tap masuk lewat jam batas → `Terlambat`, tap pulang
  sebelum jam batas → `PulangCepat`. Tidak perlu menambah nilai enum.
- `SantriKelas` (`schema:362`) adalah sumber kebenaran "santri di kelas mana";
  pakai ini kalau rekap gerbang perlu difilter per rombel.
- **Risiko operasional**: `tokenPengirim()` (`lib/wa-gateway.ts:95`) jatuh ke
  "perangkat terhubung pertama" bila `WA_GATEWAY_TOKEN` kosong. Untuk notifikasi
  otomatis sebaiknya `WA_GATEWAY_TOKEN` **diisi eksplisit**, supaya pesan tidak
  berpindah nomor pengirim saat daftar perangkat gateway berubah.

## 5c. Skema retry & laporan kegagalan ke email

Tiga lapis retry yang berbeda tujuan — jangan dicampur:

| Lapis | Gagal apa | Strategi | Maks |
|---|---|---|---|
| ESP32 → cloud | WiFi/internet putus | buffer NVS, kirim ulang tiap 10 dtk | tak terbatas (buffer ring ~200 tap) |
| Worker → gateway WA | gateway mati / nomor invalid | backoff berjenjang | **3 percobaan** |
| Alarm | worker menyerah | email ke admin | 1 email per kejadian, di-batch |

### Backoff worker WA

```
percobaan 1 → gagal → kirimSetelah = now + 1 menit
percobaan 2 → gagal → kirimSetelah = now + 5 menit
percobaan 3 → gagal → status = Gagal, dilaporkan = false  ← berhenti
```

Total rentang ~6 menit sebelum menyerah. Sengaja pendek: notifikasi presensi
kehilangan nilainya kalau tiba 3 jam setelah anak sampai. Lebih baik gagal cepat
lalu memberi tahu admin daripada mengirim pesan basi.

**Jangan retry untuk kegagalan permanen.** Bedakan dua hal:
- *Sementara* (gateway mati, timeout, `status:false` dari gateway) → retry.
- *Permanen* (nomor tidak valid, wali tidak punya HP) → langsung
  `DilewatiTanpaHp`/`Gagal` tanpa membakar 3 percobaan.

Tambahan field pada `AntreanWa`:

```prisma
  dilaporkan   Boolean  @default(false)   // sudah masuk email alarm?
  galatTerakhir String? @db.Text
```

### Alarm email

```prisma
model LogAlarm {
  id        BigInt   @id @default(autoincrement())
  jenis     String   @db.VarChar(32)   // "WA_GAGAL" | "PERANGKAT_SENYAP"
  ringkasan String   @db.Text
  jumlah    Int      @default(1)
  dikirim   DateTime @default(now())
}
```

Berkas baru `lib/alarm/email.ts` — `kirimAlarm({ jenis, ringkasan })`.
Transport: **nodemailer + SMTP** (dependensi baru; repo belum punya jalur email
sama sekali). Env baru: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
`ALARM_EMAIL_TO=arrrachm4n@gmail.com`, `ALARM_DRY_RUN` (default `true`,
mengikuti pola `WA_DRY_RUN` yang sudah ada).

Dua pemicu alarm:

1. **WA gagal** — job tiap 15 menit mengumpulkan `AntreanWa` berstatus `Gagal`
   dengan `dilaporkan=false`, kirim **satu email berisi ringkasan semua**, lalu
   tandai `dilaporkan=true`.
2. **Perangkat senyap** — job tiap 30 menit: bila `PerangkatPresensi.aktif` tapi
   `terakhirAktif` > 60 menit lalu **pada jam operasional**, kirim alarm. Ini
   menangkap kasus terburuk: alat mati diam-diam dan tidak ada yang sadar sampai
   wali protes. Di luar jam operasional dan hari libur, sepi itu normal — jangan
   kirim.

Isi email (teks polos, ringkas):

```
[NUHA] 4 notifikasi WA gagal terkirim — 30 Agu 2026 14:15

Gagal setelah 3 percobaan:
  06:41  Ahmad Fauzi (X-A)     → 6281234567890  galat: gateway timeout
  06:42  Siti Aminah (XI-B)    → 6281234567891  galat: status:false
  ...
Tindakan: cek koneksi wa-gateway (docker compose logs wa-gateway).
Antrean tertahan saat ini: 12.
```

**Anti banjir email (penting).** Kalau gateway WA mati sehari penuh, tanpa
peredam Anda menerima ratusan email dan justru berhenti membacanya:
- Batching per 15 menit (bukan per kegagalan).
- Maks **6 email/jam**; kelebihannya diringkas jadi satu "dan N lainnya".
- Kegagalan berulang dengan sebab sama dalam 1 jam → satu email, `jumlah` naik.
- `LogAlarm` menjadi rem sekaligus jejak audit.

Kegagalan mengirim email **tidak boleh** membatalkan apa pun — bungkus try/catch
dan catat ke log, mengikuti pola `recordAudit()` yang never-throw.

## 6. Firmware ESP32 (garis besar)

- WiFi + `HTTPClient`, `Authorization: Bearer <token>` disimpan di NVS.
- `tapId = <deviceId>-<uid>-<epoch>` → stabil lintas retry.
- Timeout HTTP 5 dtk. Gagal/timeout → antrekan ke ring buffer NVS, LCD
  "Tersimpan offline", tetap bunyikan buzzer (santri tidak perlu mengulang tap).
- Tiap 10 dtk: kirim isi buffer sebagai batch (maks 20/permintaan).
- Waktu: sinkron NTP saat boot + tiap jam. Kalau NTP gagal, kirim `waktu` apa
  adanya; server menyimpan `diterima` sehingga selisih terdeteksi.
- Debounce kartu yang sama 5 detik di sisi perangkat.

## 7. Keamanan

- Token perangkat 32 byte acak, ditampilkan **sekali** saat diterbitkan, di DB
  hanya sha256-nya. Bisa dicabut per perangkat.
- Rate limit per perangkat (mis. 120 tap/menit) di route tap → perangkat rusak
  atau token bocor tidak bisa membanjiri antrean WA.
- Route tap **tidak** mengembalikan data santri selain nama pendek + jam.
  UID yang tidak dikenal dijawab 404 tanpa membocorkan apakah UID pernah ada.
- Jangan taruh endpoint ini di balik kuki sesi; auth-nya eksplisit dan terpisah.
- Buka port hanya untuk subnet yang perlu (aturan UFW repo), bukan global.
- Semua mutasi tetap memanggil `recordAudit()`.

## 8. Urutan pengerjaan

0. **Prasyarat infra**: domain + reverse proxy + TLS Let's Encrypt (§1c). Ini
   blocker untuk perangkat produksi, tapi langkah 1–6 bisa jalan paralel di LAN.
1. Skema Prisma (`PerangkatPresensi`, `KartuRfid`, `TapPresensi`, `AntreanWa`,
   `JadwalGerbang`, `LogAlarm`) + migrasi + `prisma migrate deploy`.
2. `lib/presensi/arah.ts`, `lib/presensi/jadwal.ts` (jam→StatusHadir),
   `lib/presensi/tap.ts` + unit test. Murni, tanpa HTTP — uji zona Jakarta,
   batas toleransi, Jumat, dan hari libur di sini.
3. `lib/perangkat/auth.ts` + `app/api/perangkat/tap/route.ts`; uji `curl`.
4. `lib/wa/antrean.ts` + tick worker di `scripts/cron.ts`, `WA_DRY_RUN=true`.
5. `lib/alarm/email.ts` + job alarm; uji dengan `ALARM_DRY_RUN=true`, lalu satu
   email nyata ke `arrrachm4n@gmail.com` untuk memastikan tidak masuk spam.
6. UI: TabPerangkat (token + peta kartu), TabGerbang (pantau tap), TabJadwal.
7. Seed: menu + menu_peran + template WA + `JadwalGerbang` + perangkat contoh.
8. Firmware ESP32: WiFi → NTP → HTTPS (urutan ini wajib), buffer NVS, uji 1 kartu.
9. Uji terima:
   - 30 tap berturut-turut, tiap tap balas ≤ 200 ms;
   - cabut WiFi saat tap lalu sambungkan → tidak ada presensi hilang, **tidak ada
     WA ganda** (uji idempotensi `tapId`);
   - matikan `wa-gateway` → 3 percobaan lalu satu email alarm, bukan ratusan;
   - tap Jumat & Ahad → status sesuai jadwal, libur tidak menghasilkan Alpa;
   - token salah/dicabut → 401, tidak ada baris tertulis.
10. `npx tsc --noEmit`, verifikasi Playwright ke URL publik.
11. Dokumentasi: bagian baru di `app/docs/isi.ts` + catatan di `HISTORY.md`.

## 9. Yang masih perlu diputuskan

**Perlu jawaban sebelum implementasi:**
- **Jam di tabel §4 masih asumsi saya** (06:30 masuk, Jumat pulang 11:00, Ahad
  libur). Mohon dikoreksi dengan jadwal MA sebenarnya.
- **Santri mukim vs pulang-pergi.** Kalau sebagian santri menginap di pesantren,
  presensi gerbang harian tidak masuk akal untuk mereka — perlu penanda supaya
  wali santri mukim tidak menerima WA "tiba di pesantren" tiap pagi.
- **Kredensial SMTP** untuk alarm email (host/port/user/pass). Gmail biasa butuh
  App Password; SMTP domain sendiri lebih tahan lama.
- Domain final untuk cloud + siapa yang mengelola DNS-nya.

**Bisa menyusul:**
- Apakah wali boleh menonaktifkan notifikasi per santri.
- Apakah presensi gerbang memengaruhi rekap presensi akademik atau berdiri sendiri.
- Prosedur kartu hilang (nonaktifkan + terbitkan ulang sudah didukung skema).
