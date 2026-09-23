-- AlterTable
ALTER TABLE `attendance_records` ADD COLUMN `recorded_by` BIGINT NULL,
    ADD COLUMN `source` VARCHAR(16) NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `dormitories` ADD COLUMN `supervisor_staff_id` BIGINT NULL;

-- AlterTable
ALTER TABLE `leave_permits` ADD COLUMN `expected_return_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `medical_records` ADD COLUMN `follow_up_status` VARCHAR(16) NULL;

-- AlterTable
ALTER TABLE `staff_attendances` ADD COLUMN `check_in_accuracy_m` INTEGER NULL,
    ADD COLUMN `check_in_at` DATETIME(3) NULL,
    ADD COLUMN `check_in_distance_m` INTEGER NULL,
    ADD COLUMN `check_in_lat` DECIMAL(10, 7) NULL,
    ADD COLUMN `check_in_lng` DECIMAL(10, 7) NULL,
    ADD COLUMN `check_in_photo_id` BIGINT NULL,
    ADD COLUMN `check_out_accuracy_m` INTEGER NULL,
    ADD COLUMN `check_out_at` DATETIME(3) NULL,
    ADD COLUMN `check_out_distance_m` INTEGER NULL,
    ADD COLUMN `check_out_lat` DECIMAL(10, 7) NULL,
    ADD COLUMN `check_out_lng` DECIMAL(10, 7) NULL,
    ADD COLUMN `check_out_photo_id` BIGINT NULL,
    ADD COLUMN `early_departure` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `inaccurate_location` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `ip` VARCHAR(64) NULL,
    ADD COLUMN `late_minutes` INTEGER NULL,
    ADD COLUMN `outside_geofence` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `outside_reason` VARCHAR(255) NULL,
    ADD COLUMN `review_note` VARCHAR(255) NULL,
    ADD COLUMN `review_status` VARCHAR(16) NULL,
    ADD COLUMN `source` VARCHAR(16) NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN `unit_id` INTEGER NULL,
    ADD COLUMN `user_agent` VARCHAR(255) NULL,
    ADD COLUMN `verified_by` BIGINT NULL;

-- AlterTable
ALTER TABLE `tugas_lms` MODIFY `deadline` DATETIME NOT NULL;

-- AlterTable
ALTER TABLE `unit` ADD COLUMN `radius_presensi_m` INTEGER NOT NULL DEFAULT 150;

-- CreateTable
CREATE TABLE `attendance_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(32) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `unit_id` INTEGER NULL,
    `grouping` VARCHAR(8) NOT NULL DEFAULT 'KELAS',
    `jam_mulai` VARCHAR(5) NOT NULL,
    `batas_terlambat` VARCHAR(5) NOT NULL,
    `hari_aktif` INTEGER NOT NULL DEFAULT 63,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `order` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `attendance_sessions_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_schedules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `unit_id` INTEGER NOT NULL,
    `staff_id` BIGINT NULL,
    `hari` INTEGER NOT NULL,
    `jam_masuk` VARCHAR(5) NOT NULL,
    `jam_pulang` VARCHAR(5) NOT NULL,
    `toleransi_menit` INTEGER NOT NULL DEFAULT 15,

    INDEX `work_schedules_unit_id_hari_idx`(`unit_id`, `hari`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `holidays` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `unit_id` INTEGER NULL,

    INDEX `holidays_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `staff_leaves` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `staff_id` BIGINT NOT NULL,
    `jenis` VARCHAR(16) NOT NULL,
    `dari` DATE NOT NULL,
    `sampai` DATE NOT NULL,
    `alasan` VARCHAR(255) NOT NULL,
    `lampiran_id` BIGINT NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'Diajukan',
    `approved_by` BIGINT NULL,
    `note` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `staff_leaves_staff_id_dari_idx`(`staff_id`, `dari`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `attendance_records_date_session_idx` ON `attendance_records`(`date`, `session`);

-- CreateIndex
CREATE INDEX `staff_attendances_date_idx` ON `staff_attendances`(`date`);

