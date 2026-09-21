-- Preserve the existing reference data while aligning its technical names with the English Prisma schema.

ALTER TABLE `alamat_luar_negeri`
  DROP FOREIGN KEY `alamat_luar_negeri_negara_id_fkey`,
  DROP FOREIGN KEY `alamat_luar_negeri_orang_id_fkey`,
  CHANGE `orang_id` `person_id` BIGINT NOT NULL,
  CHANGE `negara_id` `country_id` INT NOT NULL,
  CHANGE `alamat_baris_1` `address_line1` VARCHAR(255) NOT NULL,
  CHANGE `alamat_baris_2` `address_line2` VARCHAR(255) NULL,
  CHANGE `kota` `city_name` VARCHAR(120) NULL,
  CHANGE `negara_bagian` `state_name` VARCHAR(120) NULL,
  CHANGE `kode_pos` `postal_code` VARCHAR(20) NULL,
  CHANGE `aktif` `is_current` BOOLEAN NOT NULL DEFAULT true,
  RENAME INDEX `alamat_luar_negeri_orang_id_key` TO `foreign_addresses_person_id_key`,
  RENAME INDEX `alamat_luar_negeri_negara_id_idx` TO `foreign_addresses_country_id_idx`;

ALTER TABLE `alias_wilayah`
  DROP FOREIGN KEY `alias_wilayah_wilayah_id_fkey`,
  CHANGE `wilayah_id` `region_id` BIGINT NOT NULL,
  CHANGE `jenis` `type` ENUM('FormerName', 'AlternateSpelling', 'Abbreviation', 'LocalLanguage') NOT NULL,
  RENAME INDEX `alias_wilayah_wilayah_id_alias_key` TO `region_aliases_region_id_alias_key`,
  RENAME INDEX `alias_wilayah_alias_idx` TO `region_aliases_alias_idx`;

ALTER TABLE `wilayah`
  DROP FOREIGN KEY `wilayah_diganti_dengan_id_fkey`,
  DROP FOREIGN KEY `wilayah_induk_id_fkey`,
  DROP FOREIGN KEY `wilayah_kecamatan_id_fkey`,
  DROP FOREIGN KEY `wilayah_kota_id_fkey`,
  DROP FOREIGN KEY `wilayah_negara_id_fkey`,
  DROP FOREIGN KEY `wilayah_provinsi_id_fkey`,
  CHANGE `negara_id` `country_id` INT NOT NULL,
  CHANGE `induk_id` `parent_id` BIGINT NULL,
  CHANGE `tingkat` `level` ENUM('Province', 'City', 'District', 'Village') NOT NULL,
  CHANGE `nama` `name` VARCHAR(120) NOT NULL,
  CHANGE `label_tipe` `type_label` VARCHAR(30) NULL,
  CHANGE `provinsi_id` `province_id` BIGINT NULL,
  CHANGE `kota_id` `city_id` BIGINT NULL,
  CHANGE `kecamatan_id` `district_id` BIGINT NULL,
  CHANGE `kedalaman` `depth` INT NOT NULL DEFAULT 1,
  CHANGE `nama_lengkap` `full_name` VARCHAR(400) NULL,
  CHANGE `kode_pos` `postal_code` CHAR(5) NULL,
  CHANGE `luas_km2` `area_km2` DECIMAL(12,4) NULL,
  CHANGE `aktif` `is_active` BOOLEAN NOT NULL DEFAULT true,
  CHANGE `diganti_dengan_id` `replaced_by_id` BIGINT NULL,
  RENAME INDEX `wilayah_negara_id_kode_key` TO `regions_country_id_code_key`,
  RENAME INDEX `wilayah_induk_id_tingkat_aktif_idx` TO `regions_parent_id_level_is_active_idx`,
  RENAME INDEX `wilayah_tingkat_aktif_idx` TO `regions_level_is_active_idx`,
  RENAME INDEX `wilayah_provinsi_id_kota_id_kecamatan_id_idx` TO `regions_province_id_city_id_district_id_idx`,
  RENAME INDEX `wilayah_kode_pos_idx` TO `regions_postal_code_idx`;

ALTER TABLE `negara`
  CHANGE `kode_numerik` `numeric_code` CHAR(3) NULL,
  CHANGE `nama` `name` VARCHAR(100) NOT NULL,
  CHANGE `nama_lokal` `local_name` VARCHAR(100) NULL,
  CHANGE `kode_telepon` `phone_code` VARCHAR(8) NULL,
  CHANGE `kode_mata_uang` `currency_code` CHAR(3) NULL,
  CHANGE `aktif` `is_active` BOOLEAN NOT NULL DEFAULT true,
  RENAME INDEX `negara_iso2_key` TO `countries_iso2_key`,
  RENAME INDEX `negara_iso3_key` TO `countries_iso3_key`,
  RENAME INDEX `negara_nama_idx` TO `countries_name_idx`;

RENAME TABLE
  `negara` TO `countries`,
  `wilayah` TO `regions`,
  `alias_wilayah` TO `region_aliases`,
  `alamat_luar_negeri` TO `foreign_addresses`;

ALTER TABLE `orang`
  DROP FOREIGN KEY `orang_desa_id_fkey`;
ALTER TABLE `unit`
  DROP FOREIGN KEY `unit_desa_id_fkey`;
ALTER TABLE `profil_lembaga`
  DROP FOREIGN KEY `profil_lembaga_desa_id_fkey`;

ALTER TABLE `regions`
  ADD CONSTRAINT `regions_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `regions_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `regions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `regions_province_id_fkey` FOREIGN KEY (`province_id`) REFERENCES `regions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `regions_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `regions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `regions_district_id_fkey` FOREIGN KEY (`district_id`) REFERENCES `regions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `regions_replaced_by_id_fkey` FOREIGN KEY (`replaced_by_id`) REFERENCES `regions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `region_aliases`
  ADD CONSTRAINT `region_aliases_region_id_fkey` FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `foreign_addresses`
  ADD CONSTRAINT `foreign_addresses_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `orang`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `foreign_addresses_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `orang`
  ADD CONSTRAINT `orang_desa_id_fkey` FOREIGN KEY (`desa_id`) REFERENCES `regions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `unit`
  ADD CONSTRAINT `unit_desa_id_fkey` FOREIGN KEY (`desa_id`) REFERENCES `regions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `profil_lembaga`
  ADD CONSTRAINT `profil_lembaga_desa_id_fkey` FOREIGN KEY (`desa_id`) REFERENCES `regions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
