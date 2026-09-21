-- Profil kelembagaan per unit (logo, kepala unit, identitas resmi)
ALTER TABLE `unit`
  ADD COLUMN `nama_resmi` VARCHAR(200) NULL,
  ADD COLUMN `jenjang` VARCHAR(48) NULL,
  ADD COLUMN `npsn` VARCHAR(32) NULL,
  ADD COLUMN `akreditasi` VARCHAR(8) NULL,
  ADD COLUMN `tahun_berdiri` INT NULL,
  ADD COLUMN `logo_path` VARCHAR(255) NULL,
  ADD COLUMN `alamat` VARCHAR(255) NULL,
  ADD COLUMN `telepon` VARCHAR(32) NULL,
  ADD COLUMN `email` VARCHAR(160) NULL,
  ADD COLUMN `website` VARCHAR(160) NULL,
  ADD COLUMN `kepala_nama` VARCHAR(160) NULL,
  ADD COLUMN `kepala_jabatan` VARCHAR(120) NULL,
  ADD COLUMN `kepala_pegawai_id` BIGINT NULL,
  ADD COLUMN `visi` TEXT NULL,
  ADD COLUMN `misi` TEXT NULL;

CREATE INDEX `unit_kepala_pegawai_id_idx` ON `unit`(`kepala_pegawai_id`);

ALTER TABLE `unit`
  ADD CONSTRAINT `unit_kepala_pegawai_id_fkey`
  FOREIGN KEY (`kepala_pegawai_id`) REFERENCES `pegawai`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Profil yayasan induk (satu baris)
CREATE TABLE `profil_lembaga` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(24) NOT NULL,
  `nama` VARCHAR(200) NOT NULL,
  `nama_arab` VARCHAR(160) NULL,
  `singkatan` VARCHAR(48) NULL,
  `logo_path` VARCHAR(255) NULL,
  `alamat` VARCHAR(255) NULL,
  `telepon` VARCHAR(32) NULL,
  `email` VARCHAR(160) NULL,
  `website` VARCHAR(160) NULL,
  `tahun_berdiri` INT NULL,
  `akta_notaris` VARCHAR(160) NULL,
  `ketua_nama` VARCHAR(160) NULL,
  `pengasuh_nama` VARCHAR(160) NULL,
  `rekening` VARCHAR(160) NULL,
  `visi` TEXT NULL,
  `misi` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `profil_lembaga_key_key`(`key`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
