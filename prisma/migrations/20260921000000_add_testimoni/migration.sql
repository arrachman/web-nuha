-- CreateTable
CREATE TABLE `testimoni` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(120) NOT NULL,
    `inisial` VARCHAR(4) NOT NULL,
    `ket` VARCHAR(160) NOT NULL,
    `kata` VARCHAR(500) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
