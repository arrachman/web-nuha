-- CreateTable
CREATE TABLE `riwayat_pendidikan` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `orang_id` BIGINT NOT NULL,
    `unit_id` INTEGER NOT NULL,
    `kelas_nama` VARCHAR(32) NOT NULL,
    `tingkat` VARCHAR(16) NOT NULL,
    `tahun_ajaran_id` INTEGER NOT NULL,
    `status` ENUM('Mukim', 'Alumni', 'Keluar') NOT NULL DEFAULT 'Alumni',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `riwayat_pendidikan_orang_id_unit_id_tahun_ajaran_id_key`(`orang_id`, `unit_id`, `tahun_ajaran_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `riwayat_pendidikan` ADD CONSTRAINT `riwayat_pendidikan_orang_id_fkey` FOREIGN KEY (`orang_id`) REFERENCES `orang`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `riwayat_pendidikan` ADD CONSTRAINT `riwayat_pendidikan_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `riwayat_pendidikan` ADD CONSTRAINT `riwayat_pendidikan_tahun_ajaran_id_fkey` FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
