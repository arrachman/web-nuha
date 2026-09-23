-- AlterTable
ALTER TABLE `tugas_lms` MODIFY `deadline` DATETIME NOT NULL;

-- CreateTable
CREATE TABLE `job_postings` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(24) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `type` ENUM('Guru', 'Staf', 'Asatidz', 'Musyrif') NOT NULL,
    `unit_id` INTEGER NOT NULL,
    `subject` VARCHAR(160) NULL,
    `quota` INTEGER NOT NULL DEFAULT 1,
    `employment_type` VARCHAR(32) NOT NULL,
    `gender_req` ENUM('L', 'P') NULL,
    `min_education` VARCHAR(64) NOT NULL,
    `description` TEXT NOT NULL,
    `requirements` TEXT NOT NULL,
    `benefits` TEXT NULL,
    `open_at` DATETIME(3) NOT NULL,
    `close_at` DATETIME(3) NOT NULL,
    `status` ENUM('Draft', 'PendingApproval', 'Open', 'Closed', 'Cancelled') NOT NULL DEFAULT 'Draft',
    `created_by` BIGINT NOT NULL,
    `approved_by` BIGINT NULL,
    `approved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `job_postings_code_key`(`code`),
    INDEX `job_postings_status_idx`(`status`),
    INDEX `job_postings_unit_id_idx`(`unit_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_required_documents` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `job_id` BIGINT NOT NULL,
    `code` VARCHAR(32) NOT NULL,
    `label` VARCHAR(160) NOT NULL,
    `required` BOOLEAN NOT NULL DEFAULT true,
    `max_size_kb` INTEGER NOT NULL DEFAULT 2048,
    `accept` VARCHAR(64) NOT NULL DEFAULT 'pdf,jpg,png',

    UNIQUE INDEX `job_required_documents_job_id_code_key`(`job_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_stages` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `job_id` BIGINT NOT NULL,
    `order` INTEGER NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `weight` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `job_stages_job_id_order_key`(`job_id`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_applications` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `number` VARCHAR(24) NOT NULL,
    `job_id` BIGINT NOT NULL,
    `status` ENUM('Submitted', 'Screening', 'Shortlisted', 'Test', 'Interview', 'Offered', 'Hired', 'Rejected', 'Withdrawn', 'Reserve') NOT NULL DEFAULT 'Submitted',
    `nik` VARCHAR(16) NOT NULL,
    `full_name` VARCHAR(160) NOT NULL,
    `gelar` VARCHAR(60) NULL,
    `gender` ENUM('L', 'P') NOT NULL,
    `birth_place` VARCHAR(120) NOT NULL,
    `birth_date` DATE NOT NULL,
    `phone` VARCHAR(32) NOT NULL,
    `email` VARCHAR(160) NULL,
    `address_line` VARCHAR(255) NOT NULL,
    `region_id` BIGINT NULL,
    `marital_status` VARCHAR(32) NULL,
    `last_education` VARCHAR(80) NOT NULL,
    `major` VARCHAR(120) NULL,
    `institution` VARCHAR(160) NOT NULL,
    `graduation_year` INTEGER NOT NULL,
    `gpa` DECIMAL(3, 2) NULL,
    `pesantren_history` TEXT NULL,
    `quran_memorization` INTEGER NULL,
    `kitab_ability` VARCHAR(120) NULL,
    `experience_text` TEXT NULL,
    `expected_salary` INTEGER NULL,
    `consent_at` DATETIME(3) NOT NULL,
    `total_score` DECIMAL(5, 2) NULL,
    `person_id` BIGINT NULL,
    `status_token` VARCHAR(64) NOT NULL,
    `submitted_ip` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `job_applications_number_key`(`number`),
    UNIQUE INDEX `job_applications_status_token_key`(`status_token`),
    INDEX `job_applications_status_idx`(`status`),
    INDEX `job_applications_region_id_idx`(`region_id`),
    UNIQUE INDEX `job_applications_job_id_nik_key`(`job_id`, `nik`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `application_documents` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `application_id` BIGINT NOT NULL,
    `code` VARCHAR(32) NOT NULL,
    `file_id` BIGINT NOT NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `verified_by` BIGINT NULL,
    `note` VARCHAR(255) NULL,

    INDEX `application_documents_application_id_idx`(`application_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `application_educations` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `application_id` BIGINT NOT NULL,
    `level` VARCHAR(40) NOT NULL,
    `institution` VARCHAR(160) NOT NULL,
    `major` VARCHAR(120) NULL,
    `graduation_year` INTEGER NULL,

    INDEX `application_educations_application_id_idx`(`application_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `application_experiences` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `application_id` BIGINT NOT NULL,
    `institution` VARCHAR(160) NOT NULL,
    `position` VARCHAR(120) NOT NULL,
    `from_year` INTEGER NULL,
    `to_year` INTEGER NULL,

    INDEX `application_experiences_application_id_idx`(`application_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `application_scores` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `application_id` BIGINT NOT NULL,
    `stage_id` BIGINT NOT NULL,
    `evaluator_id` BIGINT NOT NULL,
    `score` DECIMAL(5, 2) NOT NULL,
    `note` TEXT NULL,

    UNIQUE INDEX `application_scores_application_id_stage_id_evaluator_id_key`(`application_id`, `stage_id`, `evaluator_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `application_events` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `application_id` BIGINT NOT NULL,
    `from_status` ENUM('Submitted', 'Screening', 'Shortlisted', 'Test', 'Interview', 'Offered', 'Hired', 'Rejected', 'Withdrawn', 'Reserve') NULL,
    `to_status` ENUM('Submitted', 'Screening', 'Shortlisted', 'Test', 'Interview', 'Offered', 'Hired', 'Rejected', 'Withdrawn', 'Reserve') NOT NULL,
    `note` VARCHAR(255) NULL,
    `schedule_at` DATETIME(3) NULL,
    `location` VARCHAR(160) NULL,
    `actor_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `application_events_application_id_idx`(`application_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `application_evaluators` (
    `application_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `stage_id` BIGINT NOT NULL,

    PRIMARY KEY (`application_id`, `user_id`, `stage_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `job_postings` ADD CONSTRAINT `job_postings_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_required_documents` ADD CONSTRAINT `job_required_documents_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `job_postings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_stages` ADD CONSTRAINT `job_stages_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `job_postings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_applications` ADD CONSTRAINT `job_applications_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `job_postings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_applications` ADD CONSTRAINT `job_applications_region_id_fkey` FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_applications` ADD CONSTRAINT `job_applications_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_documents` ADD CONSTRAINT `application_documents_application_id_fkey` FOREIGN KEY (`application_id`) REFERENCES `job_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_documents` ADD CONSTRAINT `application_documents_file_id_fkey` FOREIGN KEY (`file_id`) REFERENCES `file_objects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_educations` ADD CONSTRAINT `application_educations_application_id_fkey` FOREIGN KEY (`application_id`) REFERENCES `job_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_experiences` ADD CONSTRAINT `application_experiences_application_id_fkey` FOREIGN KEY (`application_id`) REFERENCES `job_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_scores` ADD CONSTRAINT `application_scores_application_id_fkey` FOREIGN KEY (`application_id`) REFERENCES `job_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_scores` ADD CONSTRAINT `application_scores_stage_id_fkey` FOREIGN KEY (`stage_id`) REFERENCES `job_stages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_events` ADD CONSTRAINT `application_events_application_id_fkey` FOREIGN KEY (`application_id`) REFERENCES `job_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_evaluators` ADD CONSTRAINT `application_evaluators_application_id_fkey` FOREIGN KEY (`application_id`) REFERENCES `job_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_evaluators` ADD CONSTRAINT `application_evaluators_stage_id_fkey` FOREIGN KEY (`stage_id`) REFERENCES `job_stages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

