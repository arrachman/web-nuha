-- AlterTable
ALTER TABLE `jadwal_pelajaran` ADD COLUMN `unit_id` INTEGER NULL;
-- Jadwal lama tidak mencatat unit. Turunkan dari kelas yang namanya cocok;
-- baris yang tak cocok sengaja dibiarkan NULL, bukan ditebak.
UPDATE `jadwal_pelajaran` j
  JOIN `kelas` k ON k.`nama` = j.`kelas`
  SET j.`unit_id` = k.`unit_id`
  WHERE j.`unit_id` IS NULL;
-- CreateTable
CREATE TABLE `ujian` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(24) NOT NULL,
    `nama` VARCHAR(160) NOT NULL,
    `jenis` VARCHAR(32) NOT NULL,
    `unit_id` INTEGER NOT NULL,
    `tahun_ajaran` VARCHAR(16) NOT NULL,
    `semester` VARCHAR(16) NOT NULL,
    `mulai` DATE NOT NULL,
    `selesai` DATE NOT NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'Draf',
    `catatan` VARCHAR(255) NULL,
    UNIQUE INDEX `ujian_kode_key`(`kode`),
    INDEX `ujian_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- CreateTable
CREATE TABLE `jadwal_ujian` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ujian_id` INTEGER NOT NULL,
    `mapel_id` INTEGER NOT NULL,
    `kelas_id` INTEGER NOT NULL,
    `tgl` DATE NOT NULL,
    `waktu` VARCHAR(32) NOT NULL,
    `durasi` INTEGER NOT NULL DEFAULT 90,
    `ruang` VARCHAR(64) NULL,
    `pengawas` VARCHAR(160) NULL,
    UNIQUE INDEX `jadwal_ujian_ujian_id_mapel_id_kelas_id_key`(`ujian_id`, `mapel_id`, `kelas_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- CreateTable
CREATE TABLE `nilai_ujian` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `jadwal_id` INTEGER NOT NULL,
    `santri_id` BIGINT NOT NULL,
    `nilai` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `hadir` BOOLEAN NOT NULL DEFAULT true,
    `catatan` VARCHAR(255) NULL,
    UNIQUE INDEX `nilai_ujian_jadwal_id_santri_id_key`(`jadwal_id`, `santri_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- CreateIndex
CREATE INDEX `jadwal_pelajaran_guru_idx` ON `jadwal_pelajaran`(`guru`);
-- AddForeignKey
ALTER TABLE `jadwal_pelajaran` ADD CONSTRAINT `jadwal_pelajaran_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `ujian` ADD CONSTRAINT `ujian_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `jadwal_ujian` ADD CONSTRAINT `jadwal_ujian_ujian_id_fkey` FOREIGN KEY (`ujian_id`) REFERENCES `ujian`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `jadwal_ujian` ADD CONSTRAINT `jadwal_ujian_mapel_id_fkey` FOREIGN KEY (`mapel_id`) REFERENCES `mata_pelajaran`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `jadwal_ujian` ADD CONSTRAINT `jadwal_ujian_kelas_id_fkey` FOREIGN KEY (`kelas_id`) REFERENCES `kelas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `nilai_ujian` ADD CONSTRAINT `nilai_ujian_jadwal_id_fkey` FOREIGN KEY (`jadwal_id`) REFERENCES `jadwal_ujian`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `nilai_ujian` ADD CONSTRAINT `nilai_ujian_santri_id_fkey` FOREIGN KEY (`santri_id`) REFERENCES `santri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
