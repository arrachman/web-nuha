-- CreateTable
CREATE TABLE `utang_pondok` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(24) NOT NULL,
    `kreditur` VARCHAR(160) NOT NULL,
    `keterangan` VARCHAR(255) NOT NULL,
    `pokok` DECIMAL(14, 2) NOT NULL,
    `tanggal` DATE NOT NULL,
    `jatuh_tempo` DATE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

UNIQUE INDEX `utang_pondok_kode_key`(`kode`),
    INDEX `utang_pondok_jatuh_tempo_idx`(`jatuh_tempo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `utang_pembayaran` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `utang_id` BIGINT NOT NULL,
    `tanggal` DATE NOT NULL,
    `jumlah` DECIMAL(14, 2) NOT NULL,
    `metode` VARCHAR(64) NOT NULL,
    `cash_transaction_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

INDEX `utang_pembayaran_utang_id_idx`(`utang_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `utang_pembayaran` ADD CONSTRAINT `utang_pembayaran_utang_id_fkey` FOREIGN KEY (`utang_id`) REFERENCES `utang_pondok`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
