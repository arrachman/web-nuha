ALTER TABLE `log_wa` DROP FOREIGN KEY `log_wa_template_id_fkey`;

ALTER TABLE `template_wa`
  CHANGE COLUMN `kode` `code` VARCHAR(24) NOT NULL,
  CHANGE COLUMN `judul` `title` VARCHAR(160) NOT NULL,
  CHANGE COLUMN `pemicu` `trigger` VARCHAR(255) NOT NULL,
  CHANGE COLUMN `waktu` `schedule` VARCHAR(120) NULL,
  CHANGE COLUMN `isi` `content` TEXT NOT NULL,
  CHANGE COLUMN `aktif` `is_active` BOOLEAN NOT NULL DEFAULT true;

RENAME TABLE `template_wa` TO `wa_templates`;

ALTER TABLE `log_wa`
  CHANGE COLUMN `tujuan` `recipient` VARCHAR(160) NOT NULL,
  CHANGE COLUMN `nomor` `phone` VARCHAR(32) NOT NULL,
  CHANGE COLUMN `isi` `content` TEXT NOT NULL,
  CHANGE COLUMN `waktu` `sent_at` DATETIME(3) NOT NULL;

RENAME TABLE `log_wa` TO `wa_logs`;

ALTER TABLE `wa_logs`
  RENAME INDEX `log_wa_waktu_idx` TO `wa_logs_sent_at_idx`;

ALTER TABLE `wa_logs`
  ADD CONSTRAINT `wa_logs_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `wa_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `jadwal_notifikasi`
  CHANGE COLUMN `kode_template` `template_code` VARCHAR(32) NOT NULL,
  CHANGE COLUMN `aktif` `is_active` BOOLEAN NOT NULL DEFAULT true,
  CHANGE COLUMN `terakhir_jalan` `last_run_at` DATETIME(3) NULL;

RENAME TABLE `jadwal_notifikasi` TO `notification_schedules`;

ALTER TABLE `notification_schedules`
  RENAME INDEX `jadwal_notifikasi_kode_template_key` TO `notification_schedules_template_code_key`;

ALTER TABLE `antrean_notifikasi`
  CHANGE COLUMN `kode_template` `template_code` VARCHAR(32) NOT NULL,
  CHANGE COLUMN `tujuan_id` `recipient_id` VARCHAR(64) NOT NULL,
  CHANGE COLUMN `tanggal_jadwal` `scheduled_date` DATE NOT NULL,
  CHANGE COLUMN `log_wa_id` `wa_log_id` BIGINT NULL;

RENAME TABLE `antrean_notifikasi` TO `notification_queue`;

ALTER TABLE `notification_queue`
  RENAME INDEX `antrean_notifikasi_kode_template_tujuan_id_tanggal_jadwal_key` TO `notification_queue_template_code_recipient_id_scheduled_d_key`,
  RENAME INDEX `antrean_notifikasi_tanggal_jadwal_idx` TO `notification_queue_scheduled_date_idx`;
