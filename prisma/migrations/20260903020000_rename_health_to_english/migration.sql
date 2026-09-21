-- Rename Poskestren/health tables, columns, indexes, and constraints to English.
-- Hand-authored (never accept Prisma's destructive drop/recreate diff) to preserve data.

-- 1. Drop FKs referencing santri before column/table renames.
ALTER TABLE `profil_kesehatan` DROP FOREIGN KEY `profil_kesehatan_santri_id_fkey`;
ALTER TABLE `rekam_medis` DROP FOREIGN KEY `rekam_medis_santri_id_fkey`;

-- 2. profil_kesehatan -> health_profiles
ALTER TABLE `profil_kesehatan`
  CHANGE COLUMN `santri_id` `student_id` bigint NOT NULL,
  CHANGE COLUMN `berat_kg` `weight_kg` decimal(5,2) DEFAULT NULL,
  CHANGE COLUMN `tinggi_cm` `height_cm` decimal(5,2) DEFAULT NULL,
  CHANGE COLUMN `gol_darah` `blood_type` varchar(3) DEFAULT NULL,
  CHANGE COLUMN `riwayat_penyakit` `medical_history` varchar(255) DEFAULT NULL,
  CHANGE COLUMN `alergi` `allergies` varchar(255) DEFAULT NULL,
  CHANGE COLUMN `kebutuhan_khusus` `special_needs` varchar(255) DEFAULT NULL,
  CHANGE COLUMN `catatan` `notes` text;

ALTER TABLE `profil_kesehatan`
  RENAME INDEX `profil_kesehatan_santri_id_key` TO `health_profiles_student_id_key`;

RENAME TABLE `profil_kesehatan` TO `health_profiles`;

ALTER TABLE `health_profiles`
  ADD CONSTRAINT `health_profiles_student_id_fkey`
    FOREIGN KEY (`student_id`) REFERENCES `santri` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. rekam_medis -> medical_records
ALTER TABLE `rekam_medis`
  CHANGE COLUMN `santri_id` `student_id` bigint NOT NULL,
  CHANGE COLUMN `tgl` `date` date NOT NULL,
  CHANGE COLUMN `jam` `time` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  CHANGE COLUMN `keluhan` `complaint` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  CHANGE COLUMN `terapi` `treatment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  CHANGE COLUMN `tindak_lanjut` `follow_up` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  CHANGE COLUMN `petugas` `officer` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE `rekam_medis`
  RENAME INDEX `rekam_medis_santri_id_tgl_idx` TO `medical_records_student_id_date_idx`;

RENAME TABLE `rekam_medis` TO `medical_records`;

ALTER TABLE `medical_records`
  ADD CONSTRAINT `medical_records_student_id_fkey`
    FOREIGN KEY (`student_id`) REFERENCES `santri` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. obat -> medicines
ALTER TABLE `obat`
  CHANGE COLUMN `nama` `name` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  CHANGE COLUMN `satuan` `unit` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  CHANGE COLUMN `kategori` `category` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  CHANGE COLUMN `stok` `stock` int NOT NULL DEFAULT '0',
  CHANGE COLUMN `stok_min` `min_stock` int NOT NULL DEFAULT '0',
  CHANGE COLUMN `kadaluarsa` `expiry` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL;

ALTER TABLE `obat`
  RENAME INDEX `obat_nama_key` TO `medicines_name_key`;

RENAME TABLE `obat` TO `medicines`;
