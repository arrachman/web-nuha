-- AlterTable
ALTER TABLE `invoices` ADD COLUMN `rincian` JSON NULL;

-- CreateTable
CREATE TABLE `tarif_iuran` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(32) NOT NULL,
    `label` VARCHAR(120) NOT NULL,
    `nominal` DECIMAL(14, 2) NOT NULL,
    `rekening` VARCHAR(64) NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `tarif_iuran_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tarif_santri_override` (
    `santri_id` BIGINT NOT NULL,
    `total_bulanan` DECIMAL(14, 2) NOT NULL,
    `keterangan` VARCHAR(255) NULL,

    PRIMARY KEY (`santri_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `utilitas_unit` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `sektor` ENUM('PLN', 'PDAM') NOT NULL,
    `nama` VARCHAR(120) NOT NULL,
    `idpel` VARCHAR(32) NOT NULL,
    `tarif_daya` VARCHAR(32) NULL,
    `koefisien` DECIMAL(12, 2) NULL,
    `golongan` VARCHAR(64) NULL,
    `abodemen` DECIMAL(14, 2) NULL,
    `is_token` BOOLEAN NOT NULL DEFAULT false,
    `tagih_ke_putri` BOOLEAN NOT NULL DEFAULT false,
    `aktif` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `utilitas_unit_sektor_idpel_key`(`sektor`, `idpel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `utilitas_tagihan` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `unit_id` BIGINT NOT NULL,
    `periode` VARCHAR(7) NOT NULL,
    `volume` DECIMAL(12, 2) NULL,
    `total` DECIMAL(14, 2) NOT NULL,
    `status` ENUM('Belum', 'Lunas') NOT NULL DEFAULT 'Belum',

    INDEX `utilitas_tagihan_periode_idx`(`periode`),
    UNIQUE INDEX `utilitas_tagihan_unit_id_periode_key`(`unit_id`, `periode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tarif_santri_override` ADD CONSTRAINT `tarif_santri_override_santri_id_fkey` FOREIGN KEY (`santri_id`) REFERENCES `santri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `utilitas_tagihan` ADD CONSTRAINT `utilitas_tagihan_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `utilitas_unit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

