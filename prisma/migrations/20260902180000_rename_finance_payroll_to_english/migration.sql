-- Rename finance and payroll schema objects without recreating tables or losing data.

ALTER TABLE `pembayaran`
  DROP FOREIGN KEY `pembayaran_tagihan_id_fkey`;

ALTER TABLE `komponen_gaji`
  DROP FOREIGN KEY `komponen_gaji_pegawai_id_fkey`;

ALTER TABLE `slip_gaji`
  DROP FOREIGN KEY `slip_gaji_pegawai_id_fkey`;

ALTER TABLE `tagihan`
  DROP FOREIGN KEY `tagihan_santri_id_fkey`;

ALTER TABLE `komponen_gaji`
  CHANGE `pokok` `base_salary` DECIMAL(14, 2) NOT NULL DEFAULT 0,
  CHANGE `tunj_jab` `position_allowance` DECIMAL(14, 2) NOT NULL DEFAULT 0,
  CHANGE `tunj_kel` `family_allowance` DECIMAL(14, 2) NOT NULL DEFAULT 0,
  CHANGE `jam_mengajar` `teaching_hours` INTEGER NOT NULL DEFAULT 0,
  CHANGE `tarif_jam` `hourly_rate` DECIMAL(14, 2) NOT NULL DEFAULT 0,
  CHANGE `koperasi` `cooperative` DECIMAL(14, 2) NOT NULL DEFAULT 0,
  CHANGE `pph` `income_tax` DECIMAL(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE `slip_gaji`
  CHANGE `bruto` `gross_amount` DECIMAL(14, 2) NOT NULL,
  CHANGE `potongan` `deduction` DECIMAL(14, 2) NOT NULL,
  CHANGE `netto` `net_amount` DECIMAL(14, 2) NOT NULL,
  CHANGE `dibayar_at` `paid_at` DATETIME(3) NULL,
  CHANGE `revisi` `revision_count` INTEGER NOT NULL DEFAULT 0,
  CHANGE `diterbitkan_oleh` `issued_by` BIGINT NULL,
  CHANGE `catatan_revisi` `revision_note` VARCHAR(255) NULL,
  RENAME INDEX `slip_gaji_pegawai_id_periode_key` TO `payroll_slips_pegawai_id_periode_key`;

ALTER TABLE `tagihan`
  CHANGE `kode` `code` VARCHAR(24) NOT NULL,
  CHANGE `jenis` `type` VARCHAR(120) NOT NULL,
  CHANGE `periode` `period` VARCHAR(24) NOT NULL,
  CHANGE `nominal` `amount` DECIMAL(14, 2) NOT NULL,
  CHANGE `dibayar` `paid_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
  CHANGE `jatuh_tempo` `due_date` DATE NOT NULL,
  RENAME INDEX `tagihan_kode_key` TO `invoices_code_key`,
  RENAME INDEX `tagihan_periode_idx` TO `invoices_period_idx`;

ALTER TABLE `pembayaran`
  CHANGE `tagihan_id` `invoice_id` BIGINT NOT NULL,
  CHANGE `tgl` `date` DATE NOT NULL,
  CHANGE `nominal` `amount` DECIMAL(14, 2) NOT NULL,
  CHANGE `metode` `method` VARCHAR(64) NOT NULL,
  CHANGE `ref` `reference` VARCHAR(64) NULL,
  RENAME INDEX `pembayaran_tagihan_id_fkey` TO `payments_invoice_id_fkey`;

ALTER TABLE `transaksi_kas`
  CHANGE `kode` `code` VARCHAR(24) NOT NULL,
  CHANGE `tgl` `date` DATE NOT NULL,
  CHANGE `uraian` `description` VARCHAR(255) NOT NULL,
  CHANGE `kategori` `category` VARCHAR(64) NOT NULL,
  CHANGE `metode` `method` VARCHAR(64) NOT NULL,
  CHANGE `arah` `direction` ENUM('Inbound', 'Outbound') NOT NULL,
  CHANGE `nominal` `amount` DECIMAL(14, 2) NOT NULL,
  RENAME INDEX `transaksi_kas_kode_key` TO `cash_transactions_code_key`,
  RENAME INDEX `transaksi_kas_tgl_idx` TO `cash_transactions_date_idx`;

RENAME TABLE
  `komponen_gaji` TO `salary_components`,
  `slip_gaji` TO `payroll_slips`,
  `tagihan` TO `invoices`,
  `pembayaran` TO `payments`,
  `transaksi_kas` TO `cash_transactions`;

ALTER TABLE `salary_components`
  ADD CONSTRAINT `salary_components_pegawai_id_fkey`
    FOREIGN KEY (`pegawai_id`) REFERENCES `pegawai`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `payroll_slips`
  ADD CONSTRAINT `payroll_slips_pegawai_id_fkey`
    FOREIGN KEY (`pegawai_id`) REFERENCES `pegawai`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `invoices`
  ADD CONSTRAINT `invoices_santri_id_fkey`
    FOREIGN KEY (`santri_id`) REFERENCES `santri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `payments`
  ADD CONSTRAINT `payments_invoice_id_fkey`
    FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
