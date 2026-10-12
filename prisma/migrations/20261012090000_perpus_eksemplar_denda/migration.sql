-- Perpustakaan: eksemplar satuan (book_copies) + denda & perpanjangan di book_loans.
CREATE TABLE `book_copies` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `book_id` BIGINT NOT NULL,
    `unit_id` INTEGER NOT NULL,
    `kode` VARCHAR(40) NOT NULL,
    `kondisi` VARCHAR(16) NOT NULL DEFAULT 'Baik',
    `status` VARCHAR(16) NOT NULL DEFAULT 'Tersedia',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `book_copies_unit_id_kode_key`(`unit_id`, `kode`),
    INDEX `book_copies_book_id_idx`(`book_id`),
    INDEX `book_copies_unit_id_status_idx`(`unit_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `book_loans` ADD COLUMN `copy_id` BIGINT NULL;
ALTER TABLE `book_loans` ADD COLUMN `denda` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `book_loans` ADD COLUMN `denda_dibayar` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `book_loans` ADD COLUMN `jumlah_perpanjang` INTEGER NOT NULL DEFAULT 0;
CREATE INDEX `book_loans_copy_id_idx` ON `book_loans`(`copy_id`);

ALTER TABLE `book_copies` ADD CONSTRAINT `book_copies_book_id_fkey` FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `book_copies` ADD CONSTRAINT `book_copies_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `book_loans` ADD CONSTRAINT `book_loans_copy_id_fkey` FOREIGN KEY (`copy_id`) REFERENCES `book_copies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
