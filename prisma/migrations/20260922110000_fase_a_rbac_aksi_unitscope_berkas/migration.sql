-- DropForeignKey
ALTER TABLE `teaching_loads` DROP FOREIGN KEY `beban_jam_academic_year_id_fkey`;

-- AlterTable
ALTER TABLE `health_profiles` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `tugas_lms` MODIFY `deadline` DATETIME NOT NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `must_change_password` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `password_changed_at` DATETIME(3) NULL,
    ADD COLUMN `session_version` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `wa_logs` MODIFY `sent_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateTable
CREATE TABLE `permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(64) NOT NULL,
    `label` VARCHAR(160) NOT NULL,
    `menu_key` VARCHAR(32) NOT NULL,

    UNIQUE INDEX `permissions_key_key`(`key`),
    INDEX `permissions_menu_key_idx`(`menu_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `role_id` INTEGER NOT NULL,
    `permission_id` INTEGER NOT NULL,

    PRIMARY KEY (`role_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `login_attempts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `identifier` VARCHAR(160) NOT NULL,
    `ip` VARCHAR(64) NULL,
    `success` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `login_attempts_identifier_created_at_idx`(`identifier`, `created_at`),
    INDEX `login_attempts_ip_created_at_idx`(`ip`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `file_objects` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `domain` VARCHAR(32) NOT NULL,
    `path` VARCHAR(255) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `mime` VARCHAR(80) NOT NULL,
    `size_bytes` INTEGER NOT NULL,
    `sha256` CHAR(64) NOT NULL,
    `uploaded_by` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    INDEX `file_objects_domain_idx`(`domain`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_units` (
    `user_id` BIGINT NOT NULL,
    `unit_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_units_unit_id_idx`(`unit_id`),
    PRIMARY KEY (`user_id`, `unit_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_units` ADD CONSTRAINT `user_units_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_units` ADD CONSTRAINT `user_units_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teaching_loads` ADD CONSTRAINT `teaching_loads_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `notification_queue` RENAME INDEX `notification_queue_template_code_recipient_id_scheduled_d_key` TO `notification_queue_template_code_recipient_id_scheduled_date_key`;

-- RenameIndex
ALTER TABLE `wa_templates` RENAME INDEX `template_wa_kode_key` TO `wa_templates_code_key`;

