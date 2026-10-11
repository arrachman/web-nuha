-- CreateTable: books (koleksi buku perpustakaan per unit)
CREATE TABLE `books` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `unit_id` INTEGER NOT NULL,
    `kode` VARCHAR(32) NOT NULL,
    `judul` VARCHAR(255) NOT NULL,
    `penulis` VARCHAR(160) NULL,
    `penerbit` VARCHAR(160) NULL,
    `tahun_terbit` INTEGER NULL,
    `isbn` VARCHAR(32) NULL,
    `kategori` VARCHAR(64) NULL,
    `rak` VARCHAR(64) NULL,
    `jumlah` INTEGER NOT NULL DEFAULT 1,
    `keterangan` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: book_loans (peminjaman buku)
CREATE TABLE `book_loans` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `book_id` BIGINT NOT NULL,
    `unit_id` INTEGER NOT NULL,
    `tipe_peminjam` VARCHAR(16) NOT NULL,
    `santri_id` BIGINT NULL,
    `staff_id` BIGINT NULL,
    `nama_peminjam` VARCHAR(160) NOT NULL,
    `tanggal_pinjam` DATE NOT NULL,
    `tanggal_jatuh_tempo` DATE NOT NULL,
    `tanggal_kembali` DATE NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'Dipinjam',
    `catatan` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `books_unit_id_kode_key` ON `books`(`unit_id`, `kode`);

-- CreateIndex
CREATE INDEX `books_unit_id_idx` ON `books`(`unit_id`);

-- CreateIndex
CREATE INDEX `book_loans_unit_id_status_idx` ON `book_loans`(`unit_id`, `status`);

-- CreateIndex
CREATE INDEX `book_loans_book_id_idx` ON `book_loans`(`book_id`);

-- AddForeignKey
ALTER TABLE `books` ADD CONSTRAINT `books_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `book_loans` ADD CONSTRAINT `book_loans_book_id_fkey` FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `book_loans` ADD CONSTRAINT `book_loans_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `book_loans` ADD CONSTRAINT `book_loans_santri_id_fkey` FOREIGN KEY (`santri_id`) REFERENCES `santri`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `book_loans` ADD CONSTRAINT `book_loans_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
