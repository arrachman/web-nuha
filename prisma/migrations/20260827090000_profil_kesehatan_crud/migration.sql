-- Profil kesehatan: PK sintetis `id` supaya bisa dikelola modul CRUD generik,
-- plus kolom tambahan (gol. darah, alergi, catatan) untuk master data kesehatan.
-- Unique index dibuat LEBIH DULU: FK ke santri masih membutuhkan indeks pada
-- `santri_id`, jadi PRIMARY tidak boleh di-drop sebelum ada penggantinya.
ALTER TABLE `profil_kesehatan` ADD UNIQUE INDEX `profil_kesehatan_santri_id_key`(`santri_id`);
ALTER TABLE `profil_kesehatan` DROP PRIMARY KEY;
ALTER TABLE `profil_kesehatan` ADD COLUMN `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST;
ALTER TABLE `profil_kesehatan`
  ADD COLUMN `gol_darah` VARCHAR(3) NULL AFTER `tinggi_cm`,
  ADD COLUMN `alergi` VARCHAR(255) NULL AFTER `riwayat_penyakit`,
  ADD COLUMN `catatan` TEXT NULL AFTER `kebutuhan_khusus`,
  ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
