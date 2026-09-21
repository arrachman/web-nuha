-- AlterTable
ALTER TABLE `orang` ADD COLUMN `desa_id` BIGINT NULL,
    ADD COLUMN `kode_pos` CHAR(5) NULL;

-- AlterTable
ALTER TABLE `profil_lembaga` ADD COLUMN `desa_id` BIGINT NULL,
    ADD COLUMN `latitude` DECIMAL(10, 7) NULL,
    ADD COLUMN `longitude` DECIMAL(10, 7) NULL;

-- AlterTable
ALTER TABLE `unit` ADD COLUMN `desa_id` BIGINT NULL,
    ADD COLUMN `latitude` DECIMAL(10, 7) NULL,
    ADD COLUMN `longitude` DECIMAL(10, 7) NULL;

-- CreateTable
CREATE TABLE `negara` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `iso2` CHAR(2) NOT NULL,
    `iso3` CHAR(3) NOT NULL,
    `kode_numerik` CHAR(3) NULL,
    `nama` VARCHAR(100) NOT NULL,
    `nama_lokal` VARCHAR(100) NULL,
    `kode_telepon` VARCHAR(8) NULL,
    `kode_mata_uang` CHAR(3) NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `negara_iso2_key`(`iso2`),
    UNIQUE INDEX `negara_iso3_key`(`iso3`),
    INDEX `negara_nama_idx`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wilayah` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `negara_id` INTEGER NOT NULL,
    `induk_id` BIGINT NULL,
    `tingkat` ENUM('Provinsi', 'Kota', 'Kecamatan', 'Desa') NOT NULL,
    `kode` VARCHAR(20) NOT NULL,
    `nama` VARCHAR(120) NOT NULL,
    `label_tipe` VARCHAR(30) NULL,
    `provinsi_id` BIGINT NULL,
    `kota_id` BIGINT NULL,
    `kecamatan_id` BIGINT NULL,
    `kedalaman` INTEGER NOT NULL DEFAULT 1,
    `nama_lengkap` VARCHAR(400) NULL,
    `kode_pos` CHAR(5) NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `luas_km2` DECIMAL(12, 4) NULL,
    `populasi` INTEGER NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `diganti_dengan_id` BIGINT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    INDEX `wilayah_induk_id_tingkat_aktif_idx`(`induk_id`, `tingkat`, `aktif`),
    INDEX `wilayah_tingkat_aktif_idx`(`tingkat`, `aktif`),
    INDEX `wilayah_provinsi_id_kota_id_kecamatan_id_idx`(`provinsi_id`, `kota_id`, `kecamatan_id`),
    INDEX `wilayah_kode_pos_idx`(`kode_pos`),
    UNIQUE INDEX `wilayah_negara_id_kode_key`(`negara_id`, `kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alias_wilayah` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `wilayah_id` BIGINT NOT NULL,
    `alias` VARCHAR(120) NOT NULL,
    `jenis` ENUM('NamaLama', 'EjaanLain', 'Singkatan', 'BahasaLokal') NOT NULL,

    INDEX `alias_wilayah_alias_idx`(`alias`),
    UNIQUE INDEX `alias_wilayah_wilayah_id_alias_key`(`wilayah_id`, `alias`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alamat_luar_negeri` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `orang_id` BIGINT NOT NULL,
    `negara_id` INTEGER NOT NULL,
    `alamat_baris_1` VARCHAR(255) NOT NULL,
    `alamat_baris_2` VARCHAR(255) NULL,
    `kota` VARCHAR(120) NULL,
    `negara_bagian` VARCHAR(120) NULL,
    `kode_pos` VARCHAR(20) NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `alamat_luar_negeri_orang_id_key`(`orang_id`),
    INDEX `alamat_luar_negeri_negara_id_idx`(`negara_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `orang_desa_id_idx` ON `orang`(`desa_id`);

-- CreateIndex
CREATE INDEX `profil_lembaga_desa_id_idx` ON `profil_lembaga`(`desa_id`);

-- CreateIndex
CREATE INDEX `unit_desa_id_idx` ON `unit`(`desa_id`);

-- AddForeignKey
ALTER TABLE `wilayah` ADD CONSTRAINT `wilayah_negara_id_fkey` FOREIGN KEY (`negara_id`) REFERENCES `negara`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wilayah` ADD CONSTRAINT `wilayah_induk_id_fkey` FOREIGN KEY (`induk_id`) REFERENCES `wilayah`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wilayah` ADD CONSTRAINT `wilayah_provinsi_id_fkey` FOREIGN KEY (`provinsi_id`) REFERENCES `wilayah`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wilayah` ADD CONSTRAINT `wilayah_kota_id_fkey` FOREIGN KEY (`kota_id`) REFERENCES `wilayah`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wilayah` ADD CONSTRAINT `wilayah_kecamatan_id_fkey` FOREIGN KEY (`kecamatan_id`) REFERENCES `wilayah`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wilayah` ADD CONSTRAINT `wilayah_diganti_dengan_id_fkey` FOREIGN KEY (`diganti_dengan_id`) REFERENCES `wilayah`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alias_wilayah` ADD CONSTRAINT `alias_wilayah_wilayah_id_fkey` FOREIGN KEY (`wilayah_id`) REFERENCES `wilayah`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alamat_luar_negeri` ADD CONSTRAINT `alamat_luar_negeri_orang_id_fkey` FOREIGN KEY (`orang_id`) REFERENCES `orang`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alamat_luar_negeri` ADD CONSTRAINT `alamat_luar_negeri_negara_id_fkey` FOREIGN KEY (`negara_id`) REFERENCES `negara`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orang` ADD CONSTRAINT `orang_desa_id_fkey` FOREIGN KEY (`desa_id`) REFERENCES `wilayah`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unit` ADD CONSTRAINT `unit_desa_id_fkey` FOREIGN KEY (`desa_id`) REFERENCES `wilayah`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profil_lembaga` ADD CONSTRAINT `profil_lembaga_desa_id_fkey` FOREIGN KEY (`desa_id`) REFERENCES `wilayah`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
