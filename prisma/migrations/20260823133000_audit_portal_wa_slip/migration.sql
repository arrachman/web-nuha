-- AlterTable
ALTER TABLE `log_wa` ADD COLUMN `error` VARCHAR(255) NULL,
    ADD COLUMN `message_id` VARCHAR(96) NULL;

-- AlterTable
ALTER TABLE `slip_gaji` ADD COLUMN `catatan_revisi` VARCHAR(255) NULL,
    ADD COLUMN `diterbitkan_oleh` BIGINT NULL,
    ADD COLUMN `revisi` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `status` VARCHAR(16) NOT NULL DEFAULT 'Draft',
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `tugas_lms` MODIFY `deadline` DATETIME NOT NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `username` VARCHAR(64) NULL;

-- CreateTable
CREATE TABLE `audit_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `aksi` VARCHAR(48) NOT NULL,
    `entitas` VARCHAR(48) NOT NULL,
    `entitas_id` VARCHAR(64) NULL,
    `ringkasan` VARCHAR(255) NOT NULL,
    `perubahan` JSON NULL,
    `aktor_id` BIGINT NULL,
    `aktor_nama` VARCHAR(160) NOT NULL DEFAULT 'anonim',
    `ip` VARCHAR(64) NULL,
    `waktu` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_log_waktu_idx`(`waktu`),
    INDEX `audit_log_entitas_entitas_id_idx`(`entitas`, `entitas_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `user_username_key` ON `user`(`username`);

