-- Satu pegawai bisa bertugas di lebih dari satu unit.
CREATE TABLE `pegawai_unit` (
    `pegawai_id` BIGINT NOT NULL,
    `unit_id` INTEGER NOT NULL,
    `jabatan` VARCHAR(120) NULL,
    `nip` VARCHAR(32) NULL,
    `utama` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pegawai_unit_unit_id_idx`(`unit_id`),
    PRIMARY KEY (`pegawai_id`, `unit_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `pegawai_unit` ADD CONSTRAINT `pegawai_unit_pegawai_id_fkey`
    FOREIGN KEY (`pegawai_id`) REFERENCES `pegawai`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `pegawai_unit` ADD CONSTRAINT `pegawai_unit_unit_id_fkey`
    FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Isi dari penugasan tunggal yang sudah ada; itu menjadi unit utama.
INSERT INTO `pegawai_unit` (`pegawai_id`, `unit_id`, `jabatan`, `nip`, `utama`)
SELECT `id`, `unit_id`, `jabatan`, `nip`, true FROM `pegawai` WHERE `unit_id` IS NOT NULL;
