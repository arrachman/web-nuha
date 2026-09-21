-- AlterTable
ALTER TABLE `mata_pelajaran` ADD COLUMN `guru` VARCHAR(160) NULL,
    ADD COLUMN `kkm` INTEGER NOT NULL DEFAULT 75,
    ADD COLUMN `kurikulum` VARCHAR(64) NULL;

-- CreateTable
CREATE TABLE `perangkat_ajar` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(24) NOT NULL,
    `mapel` VARCHAR(160) NOT NULL,
    `kelas` VARCHAR(32) NOT NULL,
    `jenis` VARCHAR(64) NOT NULL,
    `topik` VARCHAR(200) NOT NULL,
    `pertemuan` INTEGER NOT NULL DEFAULT 0,
    `guru` VARCHAR(160) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'Draf',

    UNIQUE INDEX `perangkat_ajar_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `capaian_pembelajaran` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(24) NOT NULL,
    `mapel_id` INTEGER NULL,
    `mapel` VARCHAR(160) NOT NULL,
    `fase` VARCHAR(32) NOT NULL,
    `capaian` TEXT NOT NULL,

    UNIQUE INDEX `capaian_pembelajaran_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_soal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(24) NOT NULL,
    `mapel` VARCHAR(160) NOT NULL,
    `topik` VARCHAR(200) NOT NULL,
    `tipe` VARCHAR(64) NOT NULL,
    `level` VARCHAR(64) NOT NULL,
    `butir` INTEGER NOT NULL DEFAULT 0,
    `dipakai` INTEGER NOT NULL DEFAULT 0,
    `penulis` VARCHAR(160) NOT NULL,

    UNIQUE INDEX `bank_soal_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kursus_lms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(24) NOT NULL,
    `nama` VARCHAR(160) NOT NULL,
    `guru` VARCHAR(160) NOT NULL,
    `modul` INTEGER NOT NULL DEFAULT 0,
    `selesai` INTEGER NOT NULL DEFAULT 0,
    `tugas_aktif` INTEGER NOT NULL DEFAULT 0,
    `nilai` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `kursus_lms_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `materi_lms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kursus_id` INTEGER NOT NULL,
    `judul` VARCHAR(200) NOT NULL,
    `tipe` VARCHAR(64) NOT NULL,
    `status` VARCHAR(64) NOT NULL,
    `tgl` DATE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tugas_lms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(24) NOT NULL,
    `kursus_id` INTEGER NOT NULL,
    `judul` VARCHAR(200) NOT NULL,
    `deadline` DATETIME NOT NULL,
    `status` VARCHAR(64) NOT NULL,

    UNIQUE INDEX `tugas_lms_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `jadwal_pelajaran_hari_jam_ke_kelas_key` ON `jadwal_pelajaran`(`hari`, `jam_ke`, `kelas`);

-- AddForeignKey
ALTER TABLE `capaian_pembelajaran` ADD CONSTRAINT `capaian_pembelajaran_mapel_id_fkey` FOREIGN KEY (`mapel_id`) REFERENCES `mata_pelajaran`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materi_lms` ADD CONSTRAINT `materi_lms_kursus_id_fkey` FOREIGN KEY (`kursus_id`) REFERENCES `kursus_lms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tugas_lms` ADD CONSTRAINT `tugas_lms_kursus_id_fkey` FOREIGN KEY (`kursus_id`) REFERENCES `kursus_lms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

