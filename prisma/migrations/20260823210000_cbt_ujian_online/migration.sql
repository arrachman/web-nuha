-- CreateTable
CREATE TABLE `soal` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `mapel_id` INTEGER NOT NULL,
    `penulis` VARCHAR(160) NOT NULL,
    `tipe` ENUM('PG', 'PGK', 'BS', 'Menjodohkan', 'IsianSingkat', 'Esai') NOT NULL DEFAULT 'PG',
    `level` VARCHAR(8) NOT NULL DEFAULT 'C1',
    `topik` VARCHAR(200) NULL,
    `stimulus` TEXT NULL,
    `pertanyaan` TEXT NOT NULL,
    `kunci` VARCHAR(255) NULL,
    `pembahasan` TEXT NULL,
    `bobot` DECIMAL(6, 2) NOT NULL DEFAULT 1,
    `irt_a` DECIMAL(6, 3) NULL,
    `irt_b` DECIMAL(6, 3) NULL,
    `irt_c` DECIMAL(6, 3) NULL,
    `p_diff` DECIMAL(6, 3) NULL,
    `d_index` DECIMAL(6, 3) NULL,
    `dipakai` INTEGER NOT NULL DEFAULT 0,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `soal_mapel_id_tipe_idx`(`mapel_id`, `tipe`),
    INDEX `soal_aktif_idx`(`aktif`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `opsi_soal` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `soal_id` BIGINT NOT NULL,
    `label` VARCHAR(4) NOT NULL,
    `teks` TEXT NOT NULL,
    `benar` BOOLEAN NOT NULL DEFAULT false,
    `urutan` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `opsi_soal_soal_id_label_key`(`soal_id`, `label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `paket_soal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(24) NOT NULL,
    `nama` VARCHAR(160) NOT NULL,
    `mapel_id` INTEGER NOT NULL,
    `jenis` VARCHAR(32) NOT NULL DEFAULT 'UTS',
    `durasi` INTEGER NOT NULL DEFAULT 90,
    `acak_soal` BOOLEAN NOT NULL DEFAULT true,
    `acak_opsi` BOOLEAN NOT NULL DEFAULT true,
    `tampil_hasil` BOOLEAN NOT NULL DEFAULT false,
    `kkm` INTEGER NOT NULL DEFAULT 75,
    `status` VARCHAR(24) NOT NULL DEFAULT 'Draf',
    `penulis` VARCHAR(160) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `paket_soal_kode_key`(`kode`),
    INDEX `paket_soal_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `butir_paket` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `paket_id` INTEGER NOT NULL,
    `soal_id` BIGINT NOT NULL,
    `urutan` INTEGER NOT NULL DEFAULT 0,
    `bobot` DECIMAL(6, 2) NOT NULL DEFAULT 1,

    UNIQUE INDEX `butir_paket_paket_id_soal_id_key`(`paket_id`, `soal_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sesi_cbt` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(24) NOT NULL,
    `paket_id` INTEGER NOT NULL,
    `kelas_id` INTEGER NOT NULL,
    `jadwal_id` INTEGER NULL,
    `mulai` DATETIME(3) NOT NULL,
    `selesai` DATETIME(3) NOT NULL,
    `token` VARCHAR(12) NOT NULL,
    `ip_prefix` VARCHAR(64) NULL,
    `wajib_exam_browser` BOOLEAN NOT NULL DEFAULT false,
    `batas_pelanggaran` INTEGER NOT NULL DEFAULT 3,
    `status` VARCHAR(24) NOT NULL DEFAULT 'Terjadwal',
    `pengawas` VARCHAR(160) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sesi_cbt_kode_key`(`kode`),
    INDEX `sesi_cbt_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `peserta_cbt` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `sesi_id` INTEGER NOT NULL,
    `santri_id` BIGINT NOT NULL,
    `no_peserta` VARCHAR(32) NOT NULL,
    `status` ENUM('Belum', 'Mengerjakan', 'Selesai', 'Dibekukan') NOT NULL DEFAULT 'Belum',
    `mulai_at` DATETIME(3) NULL,
    `selesai_at` DATETIME(3) NULL,
    `urutan` TEXT NULL,
    `skor` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `benar` INTEGER NOT NULL DEFAULT 0,
    `salah` INTEGER NOT NULL DEFAULT 0,
    `kosong` INTEGER NOT NULL DEFAULT 0,
    `theta` DECIMAL(6, 3) NULL,
    `pelanggaran` INTEGER NOT NULL DEFAULT 0,
    `ip_terakhir` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `peserta_cbt_status_idx`(`status`),
    UNIQUE INDEX `peserta_cbt_sesi_id_santri_id_key`(`sesi_id`, `santri_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jawaban_peserta` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `peserta_id` BIGINT NOT NULL,
    `soal_id` BIGINT NOT NULL,
    `jawaban` TEXT NULL,
    `ragu` BOOLEAN NOT NULL DEFAULT false,
    `benar` BOOLEAN NULL,
    `skor` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `dinilai_oleh` VARCHAR(160) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `jawaban_peserta_peserta_id_soal_id_key`(`peserta_id`, `soal_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `log_kecurangan` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `peserta_id` BIGINT NOT NULL,
    `jenis` VARCHAR(48) NOT NULL,
    `detail` VARCHAR(255) NULL,
    `at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `log_kecurangan_peserta_id_idx`(`peserta_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `soal` ADD CONSTRAINT `soal_mapel_id_fkey` FOREIGN KEY (`mapel_id`) REFERENCES `mata_pelajaran`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opsi_soal` ADD CONSTRAINT `opsi_soal_soal_id_fkey` FOREIGN KEY (`soal_id`) REFERENCES `soal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `paket_soal` ADD CONSTRAINT `paket_soal_mapel_id_fkey` FOREIGN KEY (`mapel_id`) REFERENCES `mata_pelajaran`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `butir_paket` ADD CONSTRAINT `butir_paket_paket_id_fkey` FOREIGN KEY (`paket_id`) REFERENCES `paket_soal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `butir_paket` ADD CONSTRAINT `butir_paket_soal_id_fkey` FOREIGN KEY (`soal_id`) REFERENCES `soal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sesi_cbt` ADD CONSTRAINT `sesi_cbt_paket_id_fkey` FOREIGN KEY (`paket_id`) REFERENCES `paket_soal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sesi_cbt` ADD CONSTRAINT `sesi_cbt_kelas_id_fkey` FOREIGN KEY (`kelas_id`) REFERENCES `kelas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sesi_cbt` ADD CONSTRAINT `sesi_cbt_jadwal_id_fkey` FOREIGN KEY (`jadwal_id`) REFERENCES `jadwal_ujian`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `peserta_cbt` ADD CONSTRAINT `peserta_cbt_sesi_id_fkey` FOREIGN KEY (`sesi_id`) REFERENCES `sesi_cbt`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `peserta_cbt` ADD CONSTRAINT `peserta_cbt_santri_id_fkey` FOREIGN KEY (`santri_id`) REFERENCES `santri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jawaban_peserta` ADD CONSTRAINT `jawaban_peserta_peserta_id_fkey` FOREIGN KEY (`peserta_id`) REFERENCES `peserta_cbt`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jawaban_peserta` ADD CONSTRAINT `jawaban_peserta_soal_id_fkey` FOREIGN KEY (`soal_id`) REFERENCES `soal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `log_kecurangan` ADD CONSTRAINT `log_kecurangan_peserta_id_fkey` FOREIGN KEY (`peserta_id`) REFERENCES `peserta_cbt`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

