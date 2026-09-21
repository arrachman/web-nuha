-- Satu santri bisa menempati lebih dari satu rombel: sekolah formal di SMP/MA
-- sekaligus mengaji di Madin. `santri.unit_id/kelas_id` tetap ada sebagai
-- penempatan utama; tabel ini jadi sumber kebenaran "ada di kelas mana saja".
CREATE TABLE `santri_kelas` (
    `santri_id` BIGINT NOT NULL,
    `kelas_id` INTEGER NOT NULL,
    `unit_id` INTEGER NOT NULL,
    `utama` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `santri_kelas_kelas_id_idx`(`kelas_id`),
    INDEX `santri_kelas_unit_id_idx`(`unit_id`),
    PRIMARY KEY (`santri_id`, `kelas_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `santri_kelas` ADD CONSTRAINT `santri_kelas_santri_id_fkey`
    FOREIGN KEY (`santri_id`) REFERENCES `santri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `santri_kelas` ADD CONSTRAINT `santri_kelas_kelas_id_fkey`
    FOREIGN KEY (`kelas_id`) REFERENCES `kelas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `santri_kelas` ADD CONSTRAINT `santri_kelas_unit_id_fkey`
    FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Isi dari penempatan tunggal yang sudah ada; itu menjadi rombel utama.
-- `unit_id` diambil dari kelasnya (bukan dari `santri.unit_id`) supaya
-- invarian "unit_id = unit kelasnya" terjaga sejak baris pertama.
INSERT INTO `santri_kelas` (`santri_id`, `kelas_id`, `unit_id`, `utama`)
SELECT s.`id`, s.`kelas_id`, k.`unit_id`, true
FROM `santri` s
JOIN `kelas` k ON k.`id` = s.`kelas_id`
WHERE s.`kelas_id` IS NOT NULL;
