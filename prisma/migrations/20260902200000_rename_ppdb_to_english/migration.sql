-- Rename PPDB tables/columns/enum to English identifiers. Non-destructive:
-- data is preserved via RENAME TABLE / CHANGE COLUMN, never drop+recreate.

-- 1. Drop the FK that references `pendaftar` before renaming it.
ALTER TABLE `berkas_pendaftar` DROP FOREIGN KEY `berkas_pendaftar_pendaftar_id_fkey`;

-- 2. Rename `pendaftar` -> `applicants`, convert enum values to English, rename columns.
ALTER TABLE `pendaftar`
  MODIFY `status` ENUM('Baru', 'Verifikasi', 'Seleksi', 'Lulus', 'TidakLulus', 'DaftarUlang', 'New', 'Verification', 'Selection', 'Passed', 'Failed', 'Reenrollment') NOT NULL DEFAULT 'Baru';

UPDATE `pendaftar` SET `status` = CASE `status`
  WHEN 'Baru' THEN 'New'
  WHEN 'Verifikasi' THEN 'Verification'
  WHEN 'Seleksi' THEN 'Selection'
  WHEN 'Lulus' THEN 'Passed'
  WHEN 'TidakLulus' THEN 'Failed'
  WHEN 'DaftarUlang' THEN 'Reenrollment'
  ELSE `status`
END;

ALTER TABLE `pendaftar`
  MODIFY `status` ENUM('New', 'Verification', 'Selection', 'Passed', 'Failed', 'Reenrollment') NOT NULL DEFAULT 'New';

ALTER TABLE `pendaftar`
  CHANGE COLUMN `no_reg` `registration_number` VARCHAR(32) NOT NULL,
  CHANGE COLUMN `nama` `full_name` VARCHAR(160) NOT NULL,
  CHANGE COLUMN `jk` `gender` ENUM('L', 'P') NULL,
  CHANGE COLUMN `pilihan` `choice` VARCHAR(64) NOT NULL,
  CHANGE COLUMN `asal_sekolah` `previous_school` VARCHAR(160) NULL,
  CHANGE COLUMN `hp_wali` `guardian_phone` VARCHAR(32) NULL,
  CHANGE COLUMN `tgl_daftar` `registered_at` DATE NOT NULL,
  CHANGE COLUMN `nilai` `score` DECIMAL(5, 2) NULL;

RENAME TABLE `pendaftar` TO `applicants`;

ALTER TABLE `applicants`
  RENAME INDEX `pendaftar_no_reg_key` TO `applicants_registration_number_key`,
  RENAME INDEX `pendaftar_status_idx` TO `applicants_status_idx`;

-- 3. Rename `berkas_pendaftar` -> `applicant_documents`.
ALTER TABLE `berkas_pendaftar`
  CHANGE COLUMN `pendaftar_id` `applicant_id` BIGINT NOT NULL,
  CHANGE COLUMN `nama` `name` VARCHAR(120) NOT NULL,
  CHANGE COLUMN `file_url` `file_url` VARCHAR(255) NULL,
  CHANGE COLUMN `wajib` `required` BOOLEAN NOT NULL DEFAULT true,
  CHANGE COLUMN `terverifikasi` `verified` BOOLEAN NOT NULL DEFAULT false;

RENAME TABLE `berkas_pendaftar` TO `applicant_documents`;

-- 4. Recreate the foreign key against the renamed tables/columns.
ALTER TABLE `applicant_documents`
  ADD CONSTRAINT `applicant_documents_applicant_id_fkey`
  FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
