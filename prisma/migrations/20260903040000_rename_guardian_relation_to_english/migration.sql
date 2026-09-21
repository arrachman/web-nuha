-- Rename the guardian relation table and its schema objects in place.
-- Existing rows and parent Person references are preserved.

ALTER TABLE `relasi_wali`
  DROP FOREIGN KEY `relasi_wali_anak_id_fkey`,
  DROP FOREIGN KEY `relasi_wali_wali_id_fkey`,
  RENAME INDEX `relasi_wali_wali_id_anak_id_key` TO `guardian_relations_wali_id_anak_id_key`,
  RENAME INDEX `relasi_wali_anak_id_fkey` TO `guardian_relations_anak_id_fkey`;

RENAME TABLE `relasi_wali` TO `guardian_relations`;

ALTER TABLE `guardian_relations`
  ADD CONSTRAINT `guardian_relations_anak_id_fkey`
    FOREIGN KEY (`anak_id`) REFERENCES `people`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `guardian_relations_wali_id_fkey`
    FOREIGN KEY (`wali_id`) REFERENCES `people`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
