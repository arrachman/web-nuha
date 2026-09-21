-- Rename the institution profile table and its database objects in place.
-- Existing records and their Region references are preserved.

ALTER TABLE `profil_lembaga`
  DROP FOREIGN KEY `profil_lembaga_desa_id_fkey`,
  RENAME INDEX `profil_lembaga_key_key` TO `institution_profiles_key_key`,
  RENAME INDEX `profil_lembaga_desa_id_idx` TO `institution_profiles_desa_id_idx`;

RENAME TABLE `profil_lembaga` TO `institution_profiles`;

ALTER TABLE `institution_profiles`
  ADD CONSTRAINT `institution_profiles_desa_id_fkey`
    FOREIGN KEY (`desa_id`) REFERENCES `regions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
