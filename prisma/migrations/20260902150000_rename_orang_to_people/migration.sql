-- Preserve existing identity records while aligning the physical schema with Person.

ALTER TABLE `foreign_addresses`
  DROP FOREIGN KEY `foreign_addresses_person_id_fkey`;

ALTER TABLE `orang`
  DROP FOREIGN KEY `orang_desa_id_fkey`,
  CHANGE `nama` `fullName` VARCHAR(160) NOT NULL,
  CHANGE `jk` `gender` ENUM('L', 'P') NOT NULL,
  CHANGE `tgl_lahir` `birth_date` DATE NULL,
  CHANGE `tmp_lahir` `birth_place` VARCHAR(120) NULL,
  CHANGE `alamat` `addressLine` VARCHAR(255) NULL,
  CHANGE `rt` `neighborhoodRt` VARCHAR(8) NULL,
  CHANGE `rw` `neighborhoodRw` VARCHAR(8) NULL,
  CHANGE `kelurahan` `villageName` VARCHAR(120) NULL,
  CHANGE `kecamatan` `districtName` VARCHAR(120) NULL,
  CHANGE `kabupaten` `regencyName` VARCHAR(120) NULL,
  CHANGE `desa_id` `region_id` BIGINT NULL,
  CHANGE `kode_pos` `postal_code` CHAR(5) NULL,
  CHANGE `no_kk` `family_card_number` VARCHAR(32) NULL,
  CHANGE `anak_ke` `birth_order` INT NULL,
  CHANGE `jumlah_saudara` `sibling_count` INT NULL,
  CHANGE `hobi` `hobby` VARCHAR(255) NULL,
  CHANGE `cita_cita` `aspiration` VARCHAR(160) NULL,
  CHANGE `asal_sekolah` `previous_school` VARCHAR(160) NULL,
  CHANGE `pendidikan_terakhir` `highest_education` VARCHAR(80) NULL,
  CHANGE `hp` `phone` VARCHAR(32) NULL,
  CHANGE `foto_url` `photo_url` VARCHAR(255) NULL,
  CHANGE `aktif` `isActive` BOOLEAN NOT NULL DEFAULT true,
  RENAME INDEX `orang_nik_key` TO `people_nik_key`,
  RENAME INDEX `orang_email_key` TO `people_email_key`,
  RENAME INDEX `orang_nama_idx` TO `people_fullName_idx`,
  RENAME INDEX `orang_desa_id_idx` TO `people_region_id_idx`;

ALTER TABLE `user`
  DROP FOREIGN KEY `user_orang_id_fkey`,
  CHANGE `orang_id` `person_id` BIGINT NOT NULL,
  RENAME INDEX `user_orang_id_key` TO `user_person_id_key`;

ALTER TABLE `santri`
  DROP FOREIGN KEY `santri_orang_id_fkey`,
  CHANGE `orang_id` `person_id` BIGINT NOT NULL,
  RENAME INDEX `santri_orang_id_key` TO `santri_person_id_key`;

ALTER TABLE `pegawai`
  DROP FOREIGN KEY `pegawai_orang_id_fkey`,
  CHANGE `orang_id` `person_id` BIGINT NOT NULL,
  RENAME INDEX `pegawai_orang_id_key` TO `pegawai_person_id_key`;

ALTER TABLE `riwayat_pendidikan`
  DROP FOREIGN KEY `riwayat_pendidikan_orang_id_fkey`,
  CHANGE `orang_id` `person_id` BIGINT NOT NULL,
  RENAME INDEX `riwayat_pendidikan_orang_id_unit_id_tahun_ajaran_id_key` TO `riwayat_pendidikan_person_id_unit_id_tahun_ajaran_id_key`;

ALTER TABLE `relasi_wali`
  DROP FOREIGN KEY `relasi_wali_wali_id_fkey`,
  DROP FOREIGN KEY `relasi_wali_anak_id_fkey`;

RENAME TABLE `orang` TO `people`;

ALTER TABLE `people`
  ADD CONSTRAINT `people_region_id_fkey` FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `foreign_addresses`
  ADD CONSTRAINT `foreign_addresses_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `user`
  ADD CONSTRAINT `user_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `santri`
  ADD CONSTRAINT `santri_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `pegawai`
  ADD CONSTRAINT `pegawai_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `riwayat_pendidikan`
  ADD CONSTRAINT `riwayat_pendidikan_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `relasi_wali`
  ADD CONSTRAINT `relasi_wali_wali_id_fkey` FOREIGN KEY (`wali_id`) REFERENCES `people`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `relasi_wali_anak_id_fkey` FOREIGN KEY (`anak_id`) REFERENCES `people`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
