-- Fase 1 + Fase 2: skema untuk mengakomodasi data client (lihat docs/RENCANA-IMPORT.md)

-- 1. TahunAjaran (model baru)
CREATE TABLE `tahun_ajaran` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `kode` VARCHAR(16) NOT NULL,
  `semester` VARCHAR(8) NOT NULL,
  `aktif` BOOLEAN NOT NULL DEFAULT false,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `tahun_ajaran_kode_semester_key`(`kode`, `semester`)
) DEFAULT CHARACTER SET utf8mb4;

-- 2. Kelas di-scope ke tahun ajaran
ALTER TABLE `kelas`
  ADD COLUMN `tahun_ajaran_id` INT NULL,
  ADD COLUMN `wali_kelas_id` BIGINT NULL;

-- Urutan penting: FK `kelas.unit_id` butuh index yang berawalan `unit_id`.
-- Index baru dibuat lebih dulu supaya FK itu tetap punya penopang saat
-- index lama dilepas; kalau dibalik, MySQL menolak dengan galat 1553.
CREATE INDEX `kelas_unit_id_idx` ON `kelas`(`unit_id`);
CREATE UNIQUE INDEX `kelas_unit_id_nama_tahun_ajaran_id_key`
  ON `kelas`(`unit_id`, `nama`, `tahun_ajaran_id`);
DROP INDEX `kelas_unit_id_nama_key` ON `kelas`;

ALTER TABLE `kelas`
  ADD CONSTRAINT `kelas_tahun_ajaran_id_fkey`
    FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `kelas_wali_kelas_id_fkey`
    FOREIGN KEY (`wali_kelas_id`) REFERENCES `pegawai`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. StatusHadir: tambah Terlambat & PulangCepat (nilai lama tetap urutannya)
ALTER TABLE `presensi`
  MODIFY COLUMN `status` ENUM('Hadir', 'Sakit', 'Izin', 'Alpa', 'Terlambat', 'PulangCepat')
    NOT NULL DEFAULT 'Hadir';

-- 4. Santri.nis jadi opsional (unique tetap ada)
ALTER TABLE `santri`
  MODIFY COLUMN `nis` VARCHAR(32) NULL;

-- 5. FK guru: Kelas.waliKelasId sudah dibuat di atas; tambah JadwalPelajaran.pegawaiId
ALTER TABLE `jadwal_pelajaran`
  ADD COLUMN `pegawai_id` BIGINT NULL;

ALTER TABLE `jadwal_pelajaran`
  ADD CONSTRAINT `jadwal_pelajaran_pegawai_id_fkey`
    FOREIGN KEY (`pegawai_id`) REFERENCES `pegawai`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Pegawai: kolom tambahan dari DATA GURU.xlsx & SK Pembagian Tugas
ALTER TABLE `pegawai`
  ADD COLUMN `pendidikan_terakhir` VARCHAR(120) NULL,
  ADD COLUMN `mapel_diampu` VARCHAR(255) NULL,
  ADD COLUMN `tugas_tambahan` VARCHAR(255) NULL,
  ADD COLUMN `jam_mengajar` INT NOT NULL DEFAULT 0,
  ADD COLUMN `tmp_tgl_lahir` VARCHAR(120) NULL;

-- 7. ProfilKesehatan (model baru, 1-1 ke Santri)
CREATE TABLE `profil_kesehatan` (
  `santri_id` BIGINT NOT NULL,
  `berat_kg` DECIMAL(5, 2) NULL,
  `tinggi_cm` DECIMAL(5, 2) NULL,
  `riwayat_penyakit` VARCHAR(255) NULL,
  `kebutuhan_khusus` VARCHAR(255) NULL,

  PRIMARY KEY (`santri_id`)
) DEFAULT CHARACTER SET utf8mb4;

ALTER TABLE `profil_kesehatan`
  ADD CONSTRAINT `profil_kesehatan_santri_id_fkey`
    FOREIGN KEY (`santri_id`) REFERENCES `santri`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. Orang: alamat terstruktur (Form Pendataan SMP)
ALTER TABLE `orang`
  ADD COLUMN `rt` VARCHAR(8) NULL,
  ADD COLUMN `rw` VARCHAR(8) NULL,
  ADD COLUMN `kelurahan` VARCHAR(120) NULL,
  ADD COLUMN `kecamatan` VARCHAR(120) NULL,
  ADD COLUMN `kabupaten` VARCHAR(120) NULL,
  ADD COLUMN `no_kk` VARCHAR(32) NULL,
  ADD COLUMN `anak_ke` INT NULL,
  ADD COLUMN `jumlah_saudara` INT NULL,
  ADD COLUMN `hobi` VARCHAR(255) NULL,
  ADD COLUMN `cita_cita` VARCHAR(160) NULL,
  ADD COLUMN `asal_sekolah` VARCHAR(160) NULL;

-- 9. RelasiWali: NIK, TTL, pendidikan, pendapatan, peran ayah/ibu/wali
ALTER TABLE `relasi_wali`
  ADD COLUMN `nik` VARCHAR(32) NULL,
  ADD COLUMN `ttl` VARCHAR(120) NULL,
  ADD COLUMN `pendidikan` VARCHAR(120) NULL,
  ADD COLUMN `pendapatan` VARCHAR(64) NULL,
  ADD COLUMN `peran` VARCHAR(16) NULL;

-- 10. JadwalDiniyah (Fase 2 — Madrasah Diniyah, model terpisah dari JadwalPelajaran)
CREATE TABLE `jadwal_diniyah` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `hari` VARCHAR(16) NOT NULL,
  `jenjang` VARCHAR(32) NOT NULL,
  `kitab` VARCHAR(160) NOT NULL,
  `ustadz` VARCHAR(160) NOT NULL,
  `tempat` VARCHAR(120) NOT NULL,
  `urutan` INT NOT NULL DEFAULT 0,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4;
