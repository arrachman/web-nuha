-- AlterTable
ALTER TABLE `tugas_lms` MODIFY `deadline` DATETIME NOT NULL;

-- CreateTable
CREATE TABLE `app_settings` (
    `key` VARCHAR(64) NOT NULL,
    `value` TEXT NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_locations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(32) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `type` ENUM('Kampus', 'Gedung', 'Lantai', 'Ruang', 'Area') NOT NULL,
    `parent_id` INTEGER NULL,
    `unit_id` INTEGER NULL,
    `room_usage` VARCHAR(32) NULL,
    `area_m2` DECIMAL(8, 2) NULL,
    `capacity` INTEGER NULL,
    `condition` ENUM('Baik', 'RusakRingan', 'RusakBerat', 'Hilang') NULL,
    `kelas_id` INTEGER NULL,
    `room_id` INTEGER NULL,
    `pic_staff_id` BIGINT NULL,
    `qr_token` VARCHAR(32) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `asset_locations_code_key`(`code`),
    UNIQUE INDEX `asset_locations_qr_token_key`(`qr_token`),
    INDEX `asset_locations_parent_id_idx`(`parent_id`),
    INDEX `asset_locations_unit_id_idx`(`unit_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(24) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `kib_group` VARCHAR(1) NOT NULL,
    `parent_id` INTEGER NULL,
    `useful_life_years` INTEGER NULL,
    `is_consumable` BOOLEAN NOT NULL DEFAULT false,
    `needs_maintenance` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `asset_categories_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `funding_sources` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(24) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `restricted_disposal` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `funding_sources_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(160) NOT NULL,
    `phone` VARCHAR(32) NULL,
    `address` VARCHAR(255) NULL,
    `npwp` VARCHAR(32) NULL,
    `note` VARCHAR(255) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assets` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `inventory_code` VARCHAR(48) NOT NULL,
    `qr_token` VARCHAR(32) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `category_id` INTEGER NOT NULL,
    `owner_unit_id` INTEGER NOT NULL,
    `location_id` INTEGER NULL,
    `holder_staff_id` BIGINT NULL,
    `brand` VARCHAR(80) NULL,
    `model` VARCHAR(80) NULL,
    `specification` TEXT NULL,
    `serial_number` VARCHAR(80) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unit_of_measure` VARCHAR(24) NOT NULL DEFAULT 'unit',
    `acquisition_date` DATE NOT NULL,
    `acquisition_method` VARCHAR(32) NOT NULL,
    `acquisition_cost` DECIMAL(15, 2) NOT NULL,
    `is_estimated_value` BOOLEAN NOT NULL DEFAULT false,
    `funding_source_id` INTEGER NOT NULL,
    `donor_name` VARCHAR(160) NULL,
    `vendor_id` INTEGER NULL,
    `procurement_id` BIGINT NULL,
    `cash_transaction_id` BIGINT NULL,
    `useful_life_years` INTEGER NULL,
    `residual_value` DECIMAL(15, 2) NULL,
    `warranty_until` DATE NULL,
    `condition` ENUM('Baik', 'RusakRingan', 'RusakBerat', 'Hilang') NOT NULL DEFAULT 'Baik',
    `status` ENUM('Aktif', 'Dipinjam', 'DalamPerbaikan', 'TidakDipakai', 'MenungguPenghapusan', 'Dihapus') NOT NULL DEFAULT 'Aktif',
    `is_borrowable` BOOLEAN NOT NULL DEFAULT false,
    `attributes` JSON NULL,
    `note` TEXT NULL,
    `created_by` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `assets_inventory_code_key`(`inventory_code`),
    UNIQUE INDEX `assets_qr_token_key`(`qr_token`),
    INDEX `assets_owner_unit_id_idx`(`owner_unit_id`),
    INDEX `assets_location_id_idx`(`location_id`),
    INDEX `assets_category_id_idx`(`category_id`),
    INDEX `assets_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_files` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `asset_id` BIGINT NOT NULL,
    `file_id` BIGINT NOT NULL,
    `kind` VARCHAR(24) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `asset_files_asset_id_idx`(`asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `procurements` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(24) NOT NULL,
    `unit_id` INTEGER NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `reason` TEXT NOT NULL,
    `status` VARCHAR(32) NOT NULL,
    `estimated_total` DECIMAL(15, 2) NOT NULL,
    `funding_source_id` INTEGER NOT NULL,
    `requested_by` BIGINT NOT NULL,
    `received_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `procurements_code_key`(`code`),
    INDEX `procurements_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `procurement_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `procurement_id` BIGINT NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `category_id` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `estimated_price` DECIMAL(15, 2) NOT NULL,
    `actual_price` DECIMAL(15, 2) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_movements` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `asset_id` BIGINT NOT NULL,
    `type` VARCHAR(32) NOT NULL,
    `from_location_id` INTEGER NULL,
    `to_location_id` INTEGER NULL,
    `from_unit_id` INTEGER NULL,
    `to_unit_id` INTEGER NULL,
    `from_holder_id` BIGINT NULL,
    `to_holder_id` BIGINT NULL,
    `date` DATETIME(3) NOT NULL,
    `reason` VARCHAR(255) NULL,
    `bast_file_id` BIGINT NULL,
    `actor_id` BIGINT NOT NULL,

    INDEX `asset_movements_asset_id_idx`(`asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_loans` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(24) NOT NULL,
    `borrower_user_id` BIGINT NOT NULL,
    `borrower_unit_id` INTEGER NULL,
    `purpose` VARCHAR(255) NOT NULL,
    `start_at` DATETIME(3) NOT NULL,
    `end_at` DATETIME(3) NOT NULL,
    `status` VARCHAR(24) NOT NULL,
    `approved_by` BIGINT NULL,
    `returned_at` DATETIME(3) NULL,
    `return_condition` ENUM('Baik', 'RusakRingan', 'RusakBerat', 'Hilang') NULL,
    `return_note` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `asset_loans_code_key`(`code`),
    INDEX `asset_loans_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_loan_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `loan_id` BIGINT NOT NULL,
    `asset_id` BIGINT NULL,
    `location_id` INTEGER NULL,

    INDEX `asset_loan_items_asset_id_idx`(`asset_id`),
    INDEX `asset_loan_items_location_id_idx`(`location_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `damage_reports` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(24) NOT NULL,
    `asset_id` BIGINT NULL,
    `location_id` INTEGER NULL,
    `reporter_user_id` BIGINT NOT NULL,
    `description` TEXT NOT NULL,
    `severity` VARCHAR(16) NOT NULL,
    `photo_file_id` BIGINT NULL,
    `status` VARCHAR(24) NOT NULL,
    `assigned_to` BIGINT NULL,
    `vendor_id` INTEGER NULL,
    `cost` DECIMAL(15, 2) NULL,
    `resolved_at` DATETIME(3) NULL,
    `resolution_note` VARCHAR(255) NULL,
    `cash_transaction_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `damage_reports_code_key`(`code`),
    INDEX `damage_reports_status_idx`(`status`),
    INDEX `damage_reports_asset_id_idx`(`asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maintenance_tasks` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `asset_id` BIGINT NULL,
    `location_id` INTEGER NULL,
    `title` VARCHAR(160) NOT NULL,
    `interval_days` INTEGER NULL,
    `due_date` DATE NOT NULL,
    `remind_days_before` INTEGER NOT NULL DEFAULT 7,
    `assigned_to` BIGINT NULL,
    `status` VARCHAR(16) NOT NULL,
    `last_done_at` DATETIME(3) NULL,
    `cost` DECIMAL(15, 2) NULL,
    `reminded_at` DATETIME(3) NULL,

    INDEX `maintenance_tasks_due_date_idx`(`due_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_opnames` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(24) NOT NULL,
    `unit_id` INTEGER NULL,
    `location_id` INTEGER NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closed_at` DATETIME(3) NULL,
    `status` VARCHAR(16) NOT NULL,
    `created_by` BIGINT NOT NULL,

    UNIQUE INDEX `stock_opnames_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_opname_lines` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `opname_id` BIGINT NOT NULL,
    `asset_id` BIGINT NOT NULL,
    `expected_location_id` INTEGER NULL,
    `found` BOOLEAN NULL,
    `condition_found` ENUM('Baik', 'RusakRingan', 'RusakBerat', 'Hilang') NULL,
    `location_found_id` INTEGER NULL,
    `note` VARCHAR(255) NULL,
    `checked_at` DATETIME(3) NULL,
    `checked_by` BIGINT NULL,

    UNIQUE INDEX `stock_opname_lines_opname_id_asset_id_key`(`opname_id`, `asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_disposals` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(24) NOT NULL,
    `reason` VARCHAR(32) NOT NULL,
    `method` VARCHAR(32) NOT NULL,
    `status` VARCHAR(24) NOT NULL,
    `note` TEXT NULL,
    `needs_nazhir` BOOLEAN NOT NULL DEFAULT false,
    `ba_file_id` BIGINT NULL,
    `proceeds_cash_transaction_id` BIGINT NULL,
    `requested_by` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `asset_disposals_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_disposal_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `disposal_id` BIGINT NOT NULL,
    `asset_id` BIGINT NOT NULL,
    `book_value` DECIMAL(15, 2) NOT NULL,
    `sale_value` DECIMAL(15, 2) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `approval_steps` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `entity` VARCHAR(24) NOT NULL,
    `entity_id` BIGINT NOT NULL,
    `order` INTEGER NOT NULL,
    `role_key` VARCHAR(32) NOT NULL,
    `unit_id` INTEGER NULL,
    `decided_by` BIGINT NULL,
    `decision` VARCHAR(8) NULL,
    `note` VARCHAR(255) NULL,
    `decided_at` DATETIME(3) NULL,

    INDEX `approval_steps_entity_entity_id_idx`(`entity`, `entity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consumable_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(160) NOT NULL,
    `unit_of_measure` VARCHAR(24) NOT NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `min_stock` INTEGER NOT NULL DEFAULT 0,
    `unit_id` INTEGER NULL,
    `storage` VARCHAR(120) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consumable_movements` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `item_id` INTEGER NOT NULL,
    `direction` VARCHAR(8) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `purpose` VARCHAR(160) NULL,
    `actor_id` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `asset_locations` ADD CONSTRAINT `asset_locations_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `asset_locations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_locations` ADD CONSTRAINT `asset_locations_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `assets_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `asset_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `assets_owner_unit_id_fkey` FOREIGN KEY (`owner_unit_id`) REFERENCES `unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `assets_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `asset_locations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `assets_holder_staff_id_fkey` FOREIGN KEY (`holder_staff_id`) REFERENCES `staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `assets_funding_source_id_fkey` FOREIGN KEY (`funding_source_id`) REFERENCES `funding_sources`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `assets_vendor_id_fkey` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `assets_procurement_id_fkey` FOREIGN KEY (`procurement_id`) REFERENCES `procurements`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_files` ADD CONSTRAINT `asset_files_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_files` ADD CONSTRAINT `asset_files_file_id_fkey` FOREIGN KEY (`file_id`) REFERENCES `file_objects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procurements` ADD CONSTRAINT `procurements_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procurements` ADD CONSTRAINT `procurements_funding_source_id_fkey` FOREIGN KEY (`funding_source_id`) REFERENCES `funding_sources`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procurements` ADD CONSTRAINT `procurements_requested_by_fkey` FOREIGN KEY (`requested_by`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procurement_items` ADD CONSTRAINT `procurement_items_procurement_id_fkey` FOREIGN KEY (`procurement_id`) REFERENCES `procurements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_movements` ADD CONSTRAINT `asset_movements_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_loans` ADD CONSTRAINT `asset_loans_borrower_user_id_fkey` FOREIGN KEY (`borrower_user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_loan_items` ADD CONSTRAINT `asset_loan_items_loan_id_fkey` FOREIGN KEY (`loan_id`) REFERENCES `asset_loans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_loan_items` ADD CONSTRAINT `asset_loan_items_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_loan_items` ADD CONSTRAINT `asset_loan_items_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `asset_locations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `damage_reports` ADD CONSTRAINT `damage_reports_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `damage_reports` ADD CONSTRAINT `damage_reports_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `asset_locations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `damage_reports` ADD CONSTRAINT `damage_reports_reporter_user_id_fkey` FOREIGN KEY (`reporter_user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `damage_reports` ADD CONSTRAINT `damage_reports_assigned_to_fkey` FOREIGN KEY (`assigned_to`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `damage_reports` ADD CONSTRAINT `damage_reports_vendor_id_fkey` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_tasks` ADD CONSTRAINT `maintenance_tasks_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_opname_lines` ADD CONSTRAINT `stock_opname_lines_opname_id_fkey` FOREIGN KEY (`opname_id`) REFERENCES `stock_opnames`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_opname_lines` ADD CONSTRAINT `stock_opname_lines_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_disposal_items` ADD CONSTRAINT `asset_disposal_items_disposal_id_fkey` FOREIGN KEY (`disposal_id`) REFERENCES `asset_disposals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_disposal_items` ADD CONSTRAINT `asset_disposal_items_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consumable_movements` ADD CONSTRAINT `consumable_movements_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `consumable_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

