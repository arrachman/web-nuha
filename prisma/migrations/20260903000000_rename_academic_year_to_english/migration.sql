-- Rename TahunAjaran -> AcademicYear (table, columns, indexes, FKs).
-- Hand-written: preserves data via RENAME TABLE / CHANGE COLUMN, never drop+recreate.

-- 1. Drop FKs that reference tahun_ajaran (must drop before renaming referenced table/columns).
ALTER TABLE `kelas` DROP FOREIGN KEY `kelas_tahun_ajaran_id_fkey`;
ALTER TABLE `riwayat_pendidikan` DROP FOREIGN KEY `riwayat_pendidikan_tahun_ajaran_id_fkey`;
ALTER TABLE `beban_jam` DROP FOREIGN KEY `beban_jam_tahun_ajaran_id_fkey`;

-- 2. `riwayat_pendidikan_person_id_fkey` has no index of its own — it relies on
-- the composite unique index below (person_id is its leftmost column). Add a
-- standalone index first so dropping that composite index doesn't break the FK.
ALTER TABLE `riwayat_pendidikan` ADD INDEX `riwayat_pendidikan_person_id_idx` (`person_id`);

-- 3. Drop unique indexes involving the old column names (recreated below with new names).
ALTER TABLE `kelas` DROP INDEX `kelas_unit_id_nama_tahun_ajaran_id_key`;
ALTER TABLE `riwayat_pendidikan` DROP INDEX `riwayat_pendidikan_person_id_unit_id_tahun_ajaran_id_key`;
ALTER TABLE `tahun_ajaran` DROP INDEX `tahun_ajaran_kode_semester_key`;

-- 3. Rename the table.
RENAME TABLE `tahun_ajaran` TO `academic_years`;

-- 4. Rename columns on academic_years.
ALTER TABLE `academic_years` CHANGE COLUMN `kode` `code` VARCHAR(16) NOT NULL;
ALTER TABLE `academic_years` CHANGE COLUMN `aktif` `is_active` BOOLEAN NOT NULL DEFAULT false;

-- 5. Rename FK columns on referencing tables.
ALTER TABLE `kelas` CHANGE COLUMN `tahun_ajaran_id` `academic_year_id` INT NULL;
ALTER TABLE `riwayat_pendidikan` CHANGE COLUMN `tahun_ajaran_id` `academic_year_id` INT NOT NULL;
ALTER TABLE `beban_jam` CHANGE COLUMN `tahun_ajaran_id` `academic_year_id` INT NULL;

-- 6. Recreate unique indexes with new names/columns.
ALTER TABLE `academic_years` ADD UNIQUE INDEX `academic_years_code_semester_key` (`code`, `semester`);
ALTER TABLE `kelas` ADD UNIQUE INDEX `kelas_unit_id_nama_academic_year_id_key` (`unit_id`, `nama`, `academic_year_id`);
ALTER TABLE `riwayat_pendidikan` ADD UNIQUE INDEX `riwayat_pendidikan_person_id_unit_id_academic_year_id_key` (`person_id`, `unit_id`, `academic_year_id`);

-- 7. Recreate FKs pointing at the renamed table/columns.
ALTER TABLE `kelas` ADD CONSTRAINT `kelas_academic_year_id_fkey`
  FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `riwayat_pendidikan` ADD CONSTRAINT `riwayat_pendidikan_academic_year_id_fkey`
  FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `beban_jam` ADD CONSTRAINT `beban_jam_academic_year_id_fkey`
  FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
