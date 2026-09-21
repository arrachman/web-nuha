-- CreateTable
CREATE TABLE `orang` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nik` VARCHAR(32) NULL,
    `nama` VARCHAR(160) NOT NULL,
    `jk` ENUM('L', 'P') NOT NULL,
    `tgl_lahir` DATE NULL,
    `tmp_lahir` VARCHAR(120) NULL,
    `alamat` VARCHAR(255) NULL,
    `hp` VARCHAR(32) NULL,
    `email` VARCHAR(160) NULL,
    `foto_url` VARCHAR(255) NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `orang_nik_key`(`nik`),
    UNIQUE INDEX `orang_email_key`(`email`),
    INDEX `orang_nama_idx`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `peran` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(32) NOT NULL,
    `nama` VARCHAR(120) NOT NULL,
    `deskripsi` VARCHAR(255) NULL,

    UNIQUE INDEX `peran_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `orang_id` BIGINT NOT NULL,
    `email` VARCHAR(160) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `unit_scope` VARCHAR(64) NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_orang_id_key`(`orang_id`),
    UNIQUE INDEX `user_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_peran` (
    `user_id` BIGINT NOT NULL,
    `peran_id` INTEGER NOT NULL,

    PRIMARY KEY (`user_id`, `peran_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `menu` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(32) NOT NULL,
    `label` VARCHAR(120) NOT NULL,
    `icon` VARCHAR(255) NULL,
    `urutan` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `menu_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `menu_peran` (
    `menu_id` INTEGER NOT NULL,
    `peran_id` INTEGER NOT NULL,

    PRIMARY KEY (`menu_id`, `peran_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `relasi_wali` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `wali_id` BIGINT NOT NULL,
    `anak_id` BIGINT NOT NULL,
    `hubungan` VARCHAR(48) NOT NULL,
    `pekerjaan` VARCHAR(120) NULL,
    `utama` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `relasi_wali_wali_id_anak_id_key`(`wali_id`, `anak_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `unit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(24) NOT NULL,
    `nama` VARCHAR(160) NOT NULL,
    `deskripsi` VARCHAR(255) NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `unit_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kelas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `unit_id` INTEGER NOT NULL,
    `nama` VARCHAR(32) NOT NULL,
    `tingkat` VARCHAR(16) NOT NULL,
    `wali_kelas` VARCHAR(160) NULL,

    UNIQUE INDEX `kelas_unit_id_nama_key`(`unit_id`, `nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asrama` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(120) NOT NULL,
    `jk` ENUM('L', 'P') NOT NULL,
    `kapasitas` INTEGER NOT NULL DEFAULT 0,
    `musyrif` VARCHAR(160) NULL,

    UNIQUE INDEX `asrama_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kamar` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asrama_id` INTEGER NOT NULL,
    `kode` VARCHAR(16) NOT NULL,
    `kapasitas` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `kamar_asrama_id_kode_key`(`asrama_id`, `kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `santri` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `orang_id` BIGINT NOT NULL,
    `nis` VARCHAR(32) NOT NULL,
    `nisn` VARCHAR(32) NULL,
    `unit_id` INTEGER NULL,
    `kelas_id` INTEGER NULL,
    `kamar_id` INTEGER NULL,
    `status` ENUM('Mukim', 'Kalong', 'Alumni', 'Keluar') NOT NULL DEFAULT 'Mukim',
    `program` VARCHAR(64) NULL,
    `tahun_masuk` VARCHAR(8) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `santri_orang_id_key`(`orang_id`),
    UNIQUE INDEX `santri_nis_key`(`nis`),
    UNIQUE INDEX `santri_nisn_key`(`nisn`),
    INDEX `santri_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pegawai` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `orang_id` BIGINT NOT NULL,
    `nip` VARCHAR(32) NOT NULL,
    `unit_id` INTEGER NULL,
    `jabatan` VARCHAR(120) NOT NULL,
    `status` VARCHAR(32) NOT NULL,
    `rekening` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pegawai_orang_id_key`(`orang_id`),
    UNIQUE INDEX `pegawai_nip_key`(`nip`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `komponen_gaji` (
    `pegawai_id` BIGINT NOT NULL,
    `pokok` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `tunj_jab` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `tunj_kel` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `jam_mengajar` INTEGER NOT NULL DEFAULT 0,
    `tarif_jam` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `transport` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `bpjs` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `koperasi` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `pph` DECIMAL(14, 2) NOT NULL DEFAULT 0,

    PRIMARY KEY (`pegawai_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `slip_gaji` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `pegawai_id` BIGINT NOT NULL,
    `periode` VARCHAR(16) NOT NULL,
    `bruto` DECIMAL(14, 2) NOT NULL,
    `potongan` DECIMAL(14, 2) NOT NULL,
    `netto` DECIMAL(14, 2) NOT NULL,
    `dibayar_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `slip_gaji_pegawai_id_periode_key`(`pegawai_id`, `periode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `halaqah` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(120) NOT NULL,
    `ustadz` VARCHAR(160) NOT NULL,
    `waktu` VARCHAR(64) NOT NULL,
    `tempat` VARCHAR(120) NOT NULL,
    `jenjang` VARCHAR(64) NOT NULL,
    `anggota` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hafalan` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `santri_id` BIGINT NOT NULL,
    `tgl` DATE NOT NULL,
    `surat` VARCHAR(64) NOT NULL,
    `ayat` VARCHAR(32) NOT NULL,
    `jenis` VARCHAR(32) NOT NULL,
    `nilai` VARCHAR(32) NOT NULL,
    `penguji` VARCHAR(160) NOT NULL,

    INDEX `hafalan_santri_id_tgl_idx`(`santri_id`, `tgl`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tazir` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `santri_id` BIGINT NOT NULL,
    `tgl` DATE NOT NULL,
    `pelanggaran` VARCHAR(255) NOT NULL,
    `poin` INTEGER NOT NULL DEFAULT 0,
    `sanksi` VARCHAR(255) NULL,
    `petugas` VARCHAR(160) NOT NULL,

    INDEX `tazir_santri_id_tgl_idx`(`santri_id`, `tgl`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `izin` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(24) NOT NULL,
    `santri_id` BIGINT NOT NULL,
    `jenis` VARCHAR(64) NOT NULL,
    `alasan` VARCHAR(255) NOT NULL,
    `penjemput` VARCHAR(160) NULL,
    `keluar_at` DATETIME(3) NOT NULL,
    `kembali_at` DATETIME(3) NULL,
    `status` ENUM('Menunggu', 'Disetujui', 'Ditolak', 'Selesai') NOT NULL DEFAULT 'Menunggu',

    UNIQUE INDEX `izin_kode_key`(`kode`),
    INDEX `izin_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `presensi` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `santri_id` BIGINT NOT NULL,
    `tgl` DATE NOT NULL,
    `sesi` VARCHAR(32) NOT NULL,
    `status` ENUM('Hadir', 'Sakit', 'Izin', 'Alpa') NOT NULL DEFAULT 'Hadir',
    `ket` VARCHAR(255) NULL,

    UNIQUE INDEX `presensi_santri_id_tgl_sesi_key`(`santri_id`, `tgl`, `sesi`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kegiatan_harian` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jam` VARCHAR(16) NOT NULL,
    `nama` VARCHAR(160) NOT NULL,
    `ket` VARCHAR(255) NULL,
    `urutan` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mata_pelajaran` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(24) NOT NULL,
    `nama` VARCHAR(160) NOT NULL,
    `jp` INTEGER NOT NULL DEFAULT 0,
    `kelompok` VARCHAR(64) NOT NULL,

    UNIQUE INDEX `mata_pelajaran_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nilai` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `santri_id` BIGINT NOT NULL,
    `mapel_id` INTEGER NOT NULL,
    `periode` VARCHAR(24) NOT NULL,
    `tugas` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `uts` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `uas` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `akhir` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `predikat` VARCHAR(8) NULL,

    UNIQUE INDEX `nilai_santri_id_mapel_id_periode_key`(`santri_id`, `mapel_id`, `periode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jadwal_pelajaran` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hari` VARCHAR(16) NOT NULL,
    `jam_ke` INTEGER NOT NULL,
    `waktu` VARCHAR(32) NOT NULL,
    `mapel` VARCHAR(160) NOT NULL,
    `guru` VARCHAR(160) NULL,
    `kelas` VARCHAR(32) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rekam_medis` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `santri_id` BIGINT NOT NULL,
    `tgl` DATE NOT NULL,
    `jam` VARCHAR(16) NULL,
    `keluhan` VARCHAR(255) NOT NULL,
    `diagnosis` VARCHAR(255) NULL,
    `terapi` VARCHAR(255) NULL,
    `tindak_lanjut` VARCHAR(120) NULL,
    `petugas` VARCHAR(160) NOT NULL,

    INDEX `rekam_medis_santri_id_tgl_idx`(`santri_id`, `tgl`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `obat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(160) NOT NULL,
    `satuan` VARCHAR(32) NOT NULL,
    `kategori` VARCHAR(64) NULL,
    `stok` INTEGER NOT NULL DEFAULT 0,
    `stok_min` INTEGER NOT NULL DEFAULT 0,
    `kadaluarsa` VARCHAR(32) NULL,

    UNIQUE INDEX `obat_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tagihan` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(24) NOT NULL,
    `santri_id` BIGINT NOT NULL,
    `jenis` VARCHAR(120) NOT NULL,
    `periode` VARCHAR(24) NOT NULL,
    `nominal` DECIMAL(14, 2) NOT NULL,
    `dibayar` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `jatuh_tempo` DATE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tagihan_kode_key`(`kode`),
    INDEX `tagihan_periode_idx`(`periode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pembayaran` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `tagihan_id` BIGINT NOT NULL,
    `tgl` DATE NOT NULL,
    `nominal` DECIMAL(14, 2) NOT NULL,
    `metode` VARCHAR(64) NOT NULL,
    `ref` VARCHAR(64) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transaksi_kas` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(24) NOT NULL,
    `tgl` DATE NOT NULL,
    `uraian` VARCHAR(255) NOT NULL,
    `kategori` VARCHAR(64) NOT NULL,
    `metode` VARCHAR(64) NOT NULL,
    `arah` ENUM('Masuk', 'Keluar') NOT NULL,
    `nominal` DECIMAL(14, 2) NOT NULL,

    UNIQUE INDEX `transaksi_kas_kode_key`(`kode`),
    INDEX `transaksi_kas_tgl_idx`(`tgl`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pendaftar` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `no_reg` VARCHAR(32) NOT NULL,
    `nama` VARCHAR(160) NOT NULL,
    `jk` ENUM('L', 'P') NULL,
    `pilihan` VARCHAR(64) NOT NULL,
    `asal_sekolah` VARCHAR(160) NULL,
    `hp_wali` VARCHAR(32) NULL,
    `tgl_daftar` DATE NOT NULL,
    `nilai` DECIMAL(5, 2) NULL,
    `status` ENUM('Baru', 'Verifikasi', 'Seleksi', 'Lulus', 'TidakLulus', 'DaftarUlang') NOT NULL DEFAULT 'Baru',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `pendaftar_no_reg_key`(`no_reg`),
    INDEX `pendaftar_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `berkas_pendaftar` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `pendaftar_id` BIGINT NOT NULL,
    `nama` VARCHAR(120) NOT NULL,
    `file_url` VARCHAR(255) NULL,
    `wajib` BOOLEAN NOT NULL DEFAULT true,
    `terverifikasi` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kunjungan` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `santri_id` BIGINT NOT NULL,
    `nama_wali` VARCHAR(160) NOT NULL,
    `hubungan` VARCHAR(48) NULL,
    `tgl` DATE NOT NULL,
    `jam_masuk` VARCHAR(16) NULL,
    `jam_keluar` VARCHAR(16) NULL,
    `keperluan` VARCHAR(255) NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'Terjadwal',

    INDEX `kunjungan_tgl_idx`(`tgl`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `template_wa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(24) NOT NULL,
    `role` VARCHAR(64) NOT NULL,
    `judul` VARCHAR(160) NOT NULL,
    `pemicu` VARCHAR(255) NOT NULL,
    `waktu` VARCHAR(120) NULL,
    `isi` TEXT NOT NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `template_wa_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `log_wa` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `template_id` INTEGER NULL,
    `tujuan` VARCHAR(160) NOT NULL,
    `nomor` VARCHAR(32) NOT NULL,
    `isi` TEXT NOT NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'Terkirim',
    `waktu` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `log_wa_waktu_idx`(`waktu`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pengumuman` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `tgl` DATE NOT NULL,
    `judul` VARCHAR(200) NOT NULL,
    `isi` TEXT NOT NULL,
    `target` VARCHAR(64) NOT NULL DEFAULT 'Semua',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pengumuman_tgl_idx`(`tgl`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agenda` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `tgl` DATE NOT NULL,
    `jam` VARCHAR(16) NULL,
    `judul` VARCHAR(200) NOT NULL,
    `unit` VARCHAR(64) NULL,

    INDEX `agenda_tgl_idx`(`tgl`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_orang_id_fkey` FOREIGN KEY (`orang_id`) REFERENCES `orang`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_peran` ADD CONSTRAINT `user_peran_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_peran` ADD CONSTRAINT `user_peran_peran_id_fkey` FOREIGN KEY (`peran_id`) REFERENCES `peran`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menu_peran` ADD CONSTRAINT `menu_peran_menu_id_fkey` FOREIGN KEY (`menu_id`) REFERENCES `menu`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menu_peran` ADD CONSTRAINT `menu_peran_peran_id_fkey` FOREIGN KEY (`peran_id`) REFERENCES `peran`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `relasi_wali` ADD CONSTRAINT `relasi_wali_wali_id_fkey` FOREIGN KEY (`wali_id`) REFERENCES `orang`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `relasi_wali` ADD CONSTRAINT `relasi_wali_anak_id_fkey` FOREIGN KEY (`anak_id`) REFERENCES `orang`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kelas` ADD CONSTRAINT `kelas_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kamar` ADD CONSTRAINT `kamar_asrama_id_fkey` FOREIGN KEY (`asrama_id`) REFERENCES `asrama`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `santri` ADD CONSTRAINT `santri_orang_id_fkey` FOREIGN KEY (`orang_id`) REFERENCES `orang`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `santri` ADD CONSTRAINT `santri_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `santri` ADD CONSTRAINT `santri_kelas_id_fkey` FOREIGN KEY (`kelas_id`) REFERENCES `kelas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `santri` ADD CONSTRAINT `santri_kamar_id_fkey` FOREIGN KEY (`kamar_id`) REFERENCES `kamar`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pegawai` ADD CONSTRAINT `pegawai_orang_id_fkey` FOREIGN KEY (`orang_id`) REFERENCES `orang`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pegawai` ADD CONSTRAINT `pegawai_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `komponen_gaji` ADD CONSTRAINT `komponen_gaji_pegawai_id_fkey` FOREIGN KEY (`pegawai_id`) REFERENCES `pegawai`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `slip_gaji` ADD CONSTRAINT `slip_gaji_pegawai_id_fkey` FOREIGN KEY (`pegawai_id`) REFERENCES `pegawai`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hafalan` ADD CONSTRAINT `hafalan_santri_id_fkey` FOREIGN KEY (`santri_id`) REFERENCES `santri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tazir` ADD CONSTRAINT `tazir_santri_id_fkey` FOREIGN KEY (`santri_id`) REFERENCES `santri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `izin` ADD CONSTRAINT `izin_santri_id_fkey` FOREIGN KEY (`santri_id`) REFERENCES `santri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `presensi` ADD CONSTRAINT `presensi_santri_id_fkey` FOREIGN KEY (`santri_id`) REFERENCES `santri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nilai` ADD CONSTRAINT `nilai_santri_id_fkey` FOREIGN KEY (`santri_id`) REFERENCES `santri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nilai` ADD CONSTRAINT `nilai_mapel_id_fkey` FOREIGN KEY (`mapel_id`) REFERENCES `mata_pelajaran`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rekam_medis` ADD CONSTRAINT `rekam_medis_santri_id_fkey` FOREIGN KEY (`santri_id`) REFERENCES `santri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tagihan` ADD CONSTRAINT `tagihan_santri_id_fkey` FOREIGN KEY (`santri_id`) REFERENCES `santri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pembayaran` ADD CONSTRAINT `pembayaran_tagihan_id_fkey` FOREIGN KEY (`tagihan_id`) REFERENCES `tagihan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `berkas_pendaftar` ADD CONSTRAINT `berkas_pendaftar_pendaftar_id_fkey` FOREIGN KEY (`pendaftar_id`) REFERENCES `pendaftar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kunjungan` ADD CONSTRAINT `kunjungan_santri_id_fkey` FOREIGN KEY (`santri_id`) REFERENCES `santri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `log_wa` ADD CONSTRAINT `log_wa_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `template_wa`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
