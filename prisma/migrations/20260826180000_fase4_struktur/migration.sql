-- Fase 4: struktur organisasi dari SK sebagai DATA, bukan peran RBAC.
-- Migrasi aditif murni — tabel baru saja, nol DROP/TRUNCATE, nol perubahan
-- pada tabel yang sudah ada.
CREATE TABLE `jabatan_struktural` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `sk_nomor` VARCHAR(64) NOT NULL,
    `urutan` INTEGER NOT NULL DEFAULT 0,
    `jabatan` VARCHAR(160) NOT NULL,
    `lingkup` VARCHAR(32) NOT NULL,
    `divisi` VARCHAR(120) NULL,
    `periode_mulai` DATE NOT NULL,
    `periode_selesai` DATE NOT NULL,
    `pegawai_id` BIGINT NULL,
    `nama_mentah` VARCHAR(160) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `jabatan_struktural_lingkup_idx`(`lingkup`),
    UNIQUE INDEX `jabatan_struktural_sk_nomor_urutan_key`(`sk_nomor`, `urutan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `jabatan_struktural` ADD CONSTRAINT `jabatan_struktural_pegawai_id_fkey`
    FOREIGN KEY (`pegawai_id`) REFERENCES `pegawai`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
