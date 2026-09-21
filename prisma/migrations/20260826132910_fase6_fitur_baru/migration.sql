-- Fase 6: fitur baru (piket, jurnal mengajar, presensi pegawai, beban jam, arsip SK)
-- Semua tabel BARU, tidak ada ALTER pada tabel existing yang sudah berisi data
-- nyata (87 santri, 29 pegawai, 97 jadwal) -- migrasi ini non-destruktif.

CREATE TABLE `jadwal_piket` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `hari` VARCHAR(16) NOT NULL,
  `waktu_mulai` VARCHAR(16) NOT NULL,
  `waktu_selesai` VARCHAR(16) NOT NULL,
  `pegawai_id` BIGINT NULL,
  `urutan` INT NOT NULL DEFAULT 0,

  PRIMARY KEY (`id`),
  INDEX `jadwal_piket_hari_idx` (`hari`),
  INDEX `jadwal_piket_pegawai_id_fkey` (`pegawai_id`),
  CONSTRAINT `jadwal_piket_pegawai_id_fkey` FOREIGN KEY (`pegawai_id`) REFERENCES `pegawai` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4;

CREATE TABLE `jurnal_mengajar` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `pegawai_id` BIGINT NULL,
  `jadwal_id` INT NULL,
  `kelas` VARCHAR(32) NULL,
  `tgl` DATE NOT NULL,
  `jam_ke` INT NULL,
  `materi` VARCHAR(255) NULL,
  `catatan` VARCHAR(255) NULL,
  `jumlah_hadir` INT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `jurnal_mengajar_tgl_idx` (`tgl`),
  INDEX `jurnal_mengajar_pegawai_id_tgl_idx` (`pegawai_id`, `tgl`),
  INDEX `jurnal_mengajar_jadwal_id_fkey` (`jadwal_id`),
  CONSTRAINT `jurnal_mengajar_pegawai_id_fkey` FOREIGN KEY (`pegawai_id`) REFERENCES `pegawai` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `jurnal_mengajar_jadwal_id_fkey` FOREIGN KEY (`jadwal_id`) REFERENCES `jadwal_pelajaran` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4;

CREATE TABLE `presensi_pegawai` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `pegawai_id` BIGINT NOT NULL,
  `tgl` DATE NOT NULL,
  `jam_masuk` VARCHAR(16) NULL,
  `jam_pulang` VARCHAR(16) NULL,
  `status` ENUM('Hadir', 'Sakit', 'Izin', 'Alpa', 'Terlambat', 'PulangCepat') NOT NULL DEFAULT 'Hadir',
  `ket` VARCHAR(255) NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `presensi_pegawai_pegawai_id_tgl_key` (`pegawai_id`, `tgl`),
  CONSTRAINT `presensi_pegawai_pegawai_id_fkey` FOREIGN KEY (`pegawai_id`) REFERENCES `pegawai` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4;

CREATE TABLE `beban_jam` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `pegawai_id` BIGINT NOT NULL,
  `tahun_ajaran_id` INT NULL,
  `mapel` VARCHAR(160) NULL,
  `jumlah_jam` INT NULL,
  `keterangan` VARCHAR(255) NULL,

  PRIMARY KEY (`id`),
  INDEX `beban_jam_pegawai_id_idx` (`pegawai_id`),
  INDEX `beban_jam_tahun_ajaran_id_fkey` (`tahun_ajaran_id`),
  CONSTRAINT `beban_jam_pegawai_id_fkey` FOREIGN KEY (`pegawai_id`) REFERENCES `pegawai` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `beban_jam_tahun_ajaran_id_fkey` FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4;

CREATE TABLE `arsip_sk` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `nomor` VARCHAR(64) NOT NULL,
  `judul` VARCHAR(200) NOT NULL,
  `tgl` DATE NOT NULL,
  `jenis` VARCHAR(64) NOT NULL,
  `pegawai_id` BIGINT NULL,
  `file_url` VARCHAR(255) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `arsip_sk_jenis_idx` (`jenis`),
  INDEX `arsip_sk_pegawai_id_fkey` (`pegawai_id`),
  CONSTRAINT `arsip_sk_pegawai_id_fkey` FOREIGN KEY (`pegawai_id`) REFERENCES `pegawai` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4;
