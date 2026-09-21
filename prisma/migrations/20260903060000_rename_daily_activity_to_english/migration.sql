-- Rename daily activity table and its technical columns in place.
RENAME TABLE `kegiatan_harian` TO `daily_activities`;

ALTER TABLE `daily_activities`
  CHANGE COLUMN `jam` `time` VARCHAR(16) NOT NULL,
  CHANGE COLUMN `nama` `name` VARCHAR(160) NOT NULL,
  CHANGE COLUMN `ket` `note` VARCHAR(255) NULL,
  CHANGE COLUMN `urutan` `order` INT NOT NULL DEFAULT 0;
