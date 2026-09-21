-- Fase 7: penjadwal notifikasi WA (proses `nuha-cron` terpisah, bukan
-- setInterval di Next.js). Dua tabel baru, aditif saja -- tidak ada
-- ALTER/DROP pada tabel yang sudah berisi data nyata.

CREATE TABLE `jadwal_notifikasi` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `kode_template` VARCHAR(32) NOT NULL,
  `cron` VARCHAR(32) NOT NULL,
  `aktif` BOOLEAN NOT NULL DEFAULT true,
  `terakhir_jalan` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `jadwal_notifikasi_kode_template_key` (`kode_template`)
) DEFAULT CHARACTER SET utf8mb4;

CREATE TABLE `antrean_notifikasi` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `kode_template` VARCHAR(32) NOT NULL,
  `tujuan_id` VARCHAR(64) NOT NULL,
  `tanggal_jadwal` DATE NOT NULL,
  `status` VARCHAR(24) NOT NULL DEFAULT 'Terkirim',
  `log_wa_id` BIGINT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `antrean_notifikasi_kode_template_tujuan_id_tanggal_jadwal_key` (`kode_template`, `tujuan_id`, `tanggal_jadwal`),
  INDEX `antrean_notifikasi_tanggal_jadwal_idx` (`tanggal_jadwal`)
) DEFAULT CHARACTER SET utf8mb4;
