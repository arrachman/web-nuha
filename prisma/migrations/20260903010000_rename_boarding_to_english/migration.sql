-- Rename boarding schema objects without recreating tables or losing data.
-- Enum values are translated in-place through temporary compatible enum definitions.

ALTER TABLE `kamar` DROP FOREIGN KEY `kamar_asrama_id_fkey`;
ALTER TABLE `santri` DROP FOREIGN KEY `santri_kamar_id_fkey`;
ALTER TABLE `hafalan` DROP FOREIGN KEY `hafalan_santri_id_fkey`;
ALTER TABLE `tazir` DROP FOREIGN KEY `tazir_santri_id_fkey`;
ALTER TABLE `izin` DROP FOREIGN KEY `izin_santri_id_fkey`;
ALTER TABLE `presensi` DROP FOREIGN KEY `presensi_santri_id_fkey`;

ALTER TABLE `asrama`
  CHANGE COLUMN `nama` `name` VARCHAR(120) NOT NULL,
  CHANGE COLUMN `jk` `gender` ENUM('L', 'P') NOT NULL,
  CHANGE COLUMN `kapasitas` `capacity` INT NOT NULL DEFAULT 0,
  CHANGE COLUMN `musyrif` `supervisor` VARCHAR(160) NULL,
  RENAME INDEX `asrama_nama_key` TO `dormitories_name_key`;

ALTER TABLE `kamar`
  CHANGE COLUMN `asrama_id` `dormitory_id` INT NOT NULL,
  CHANGE COLUMN `kode` `code` VARCHAR(16) NOT NULL,
  CHANGE COLUMN `kapasitas` `capacity` INT NOT NULL DEFAULT 0,
  RENAME INDEX `kamar_asrama_id_kode_key` TO `rooms_dormitory_id_code_key`;

ALTER TABLE `santri`
  CHANGE COLUMN `kamar_id` `room_id` INT NULL;

ALTER TABLE `halaqah`
  CHANGE COLUMN `nama` `name` VARCHAR(120) NOT NULL,
  CHANGE COLUMN `ustadz` `teacher` VARCHAR(160) NOT NULL,
  CHANGE COLUMN `waktu` `schedule` VARCHAR(64) NOT NULL,
  CHANGE COLUMN `tempat` `location` VARCHAR(120) NOT NULL,
  CHANGE COLUMN `jenjang` `education_level` VARCHAR(64) NOT NULL,
  CHANGE COLUMN `anggota` `member_count` INT NOT NULL DEFAULT 0;

ALTER TABLE `hafalan`
  CHANGE COLUMN `santri_id` `student_id` BIGINT NOT NULL,
  CHANGE COLUMN `tgl` `date` DATE NOT NULL,
  CHANGE COLUMN `surat` `chapter` VARCHAR(64) NOT NULL,
  CHANGE COLUMN `ayat` `verses` VARCHAR(32) NOT NULL,
  CHANGE COLUMN `jenis` `type` VARCHAR(32) NOT NULL,
  CHANGE COLUMN `nilai` `score` VARCHAR(32) NOT NULL,
  CHANGE COLUMN `penguji` `examiner` VARCHAR(160) NOT NULL,
  RENAME INDEX `hafalan_santri_id_tgl_idx` TO `memorization_records_student_id_date_idx`;

ALTER TABLE `tazir`
  CHANGE COLUMN `santri_id` `student_id` BIGINT NOT NULL,
  CHANGE COLUMN `tgl` `date` DATE NOT NULL,
  CHANGE COLUMN `pelanggaran` `violation` VARCHAR(255) NOT NULL,
  CHANGE COLUMN `poin` `points` INT NOT NULL DEFAULT 0,
  CHANGE COLUMN `sanksi` `sanction` VARCHAR(255) NULL,
  CHANGE COLUMN `petugas` `officer` VARCHAR(160) NOT NULL,
  RENAME INDEX `tazir_santri_id_tgl_idx` TO `discipline_records_student_id_date_idx`;

ALTER TABLE `izin`
  CHANGE COLUMN `kode` `code` VARCHAR(24) NOT NULL,
  CHANGE COLUMN `santri_id` `student_id` BIGINT NOT NULL,
  CHANGE COLUMN `jenis` `type` VARCHAR(64) NOT NULL,
  CHANGE COLUMN `alasan` `reason` VARCHAR(255) NOT NULL,
  CHANGE COLUMN `penjemput` `pickup_by` VARCHAR(160) NULL,
  CHANGE COLUMN `keluar_at` `departed_at` DATETIME(3) NOT NULL,
  CHANGE COLUMN `kembali_at` `returned_at` DATETIME(3) NULL,
  MODIFY COLUMN `status` ENUM('Menunggu', 'Disetujui', 'Ditolak', 'Selesai', 'Pending', 'Approved', 'Rejected', 'Completed') NOT NULL DEFAULT 'Menunggu',
  RENAME INDEX `izin_kode_key` TO `leave_permits_code_key`,
  RENAME INDEX `izin_status_idx` TO `leave_permits_status_idx`;

UPDATE `izin`
SET `status` = CASE `status`
  WHEN 'Menunggu' THEN 'Pending'
  WHEN 'Disetujui' THEN 'Approved'
  WHEN 'Ditolak' THEN 'Rejected'
  WHEN 'Selesai' THEN 'Completed'
  ELSE `status`
END;

ALTER TABLE `izin`
  MODIFY COLUMN `status` ENUM('Pending', 'Approved', 'Rejected', 'Completed') NOT NULL DEFAULT 'Pending';

ALTER TABLE `presensi`
  CHANGE COLUMN `santri_id` `student_id` BIGINT NOT NULL,
  CHANGE COLUMN `tgl` `date` DATE NOT NULL,
  CHANGE COLUMN `sesi` `session` VARCHAR(32) NOT NULL,
  CHANGE COLUMN `ket` `note` VARCHAR(255) NULL,
  MODIFY COLUMN `status` ENUM('Hadir', 'Sakit', 'Izin', 'Alpa', 'Terlambat', 'PulangCepat', 'Present', 'Sick', 'Excused', 'Absent', 'Late', 'EarlyDeparture') NOT NULL DEFAULT 'Hadir',
  RENAME INDEX `presensi_santri_id_tgl_sesi_key` TO `attendance_records_student_id_date_session_key`;

UPDATE `presensi`
SET `status` = CASE `status`
  WHEN 'Hadir' THEN 'Present'
  WHEN 'Sakit' THEN 'Sick'
  WHEN 'Izin' THEN 'Excused'
  WHEN 'Alpa' THEN 'Absent'
  WHEN 'Terlambat' THEN 'Late'
  WHEN 'PulangCepat' THEN 'EarlyDeparture'
  ELSE `status`
END;

ALTER TABLE `presensi`
  MODIFY COLUMN `status` ENUM('Present', 'Sick', 'Excused', 'Absent', 'Late', 'EarlyDeparture') NOT NULL DEFAULT 'Present';

ALTER TABLE `presensi_pegawai`
  MODIFY COLUMN `status` ENUM('Hadir', 'Sakit', 'Izin', 'Alpa', 'Terlambat', 'PulangCepat', 'Present', 'Sick', 'Excused', 'Absent', 'Late', 'EarlyDeparture') NOT NULL DEFAULT 'Hadir';

UPDATE `presensi_pegawai`
SET `status` = CASE `status`
  WHEN 'Hadir' THEN 'Present'
  WHEN 'Sakit' THEN 'Sick'
  WHEN 'Izin' THEN 'Excused'
  WHEN 'Alpa' THEN 'Absent'
  WHEN 'Terlambat' THEN 'Late'
  WHEN 'PulangCepat' THEN 'EarlyDeparture'
  ELSE `status`
END;

ALTER TABLE `presensi_pegawai`
  MODIFY COLUMN `status` ENUM('Present', 'Sick', 'Excused', 'Absent', 'Late', 'EarlyDeparture') NOT NULL DEFAULT 'Present';

RENAME TABLE
  `asrama` TO `dormitories`,
  `kamar` TO `rooms`,
  `halaqah` TO `study_circles`,
  `hafalan` TO `memorization_records`,
  `tazir` TO `discipline_records`,
  `izin` TO `leave_permits`,
  `presensi` TO `attendance_records`;

ALTER TABLE `rooms`
  ADD CONSTRAINT `rooms_dormitory_id_fkey`
    FOREIGN KEY (`dormitory_id`) REFERENCES `dormitories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `santri`
  ADD CONSTRAINT `santri_room_id_fkey`
    FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `memorization_records`
  ADD CONSTRAINT `memorization_records_student_id_fkey`
    FOREIGN KEY (`student_id`) REFERENCES `santri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `discipline_records`
  ADD CONSTRAINT `discipline_records_student_id_fkey`
    FOREIGN KEY (`student_id`) REFERENCES `santri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `leave_permits`
  ADD CONSTRAINT `leave_permits_student_id_fkey`
    FOREIGN KEY (`student_id`) REFERENCES `santri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `attendance_records`
  ADD CONSTRAINT `attendance_records_student_id_fkey`
    FOREIGN KEY (`student_id`) REFERENCES `santri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
