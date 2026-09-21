-- Rename staff/payroll schema objects (Pegawai -> Staff and dependents) to
-- English without recreating tables or losing data. Table `jadwal_pelajaran`,
-- `jadwal_piket`, `jurnal_mengajar` keep their names — only their staff FK
-- column changes.

-- 1. Drop every foreign key that touches a table/column being renamed.
ALTER TABLE `arsip_sk` DROP FOREIGN KEY `arsip_sk_pegawai_id_fkey`;
ALTER TABLE `beban_jam` DROP FOREIGN KEY `beban_jam_pegawai_id_fkey`;
ALTER TABLE `jabatan_struktural` DROP FOREIGN KEY `jabatan_struktural_pegawai_id_fkey`;
ALTER TABLE `payroll_slips` DROP FOREIGN KEY `payroll_slips_pegawai_id_fkey`;
ALTER TABLE `pegawai` DROP FOREIGN KEY `pegawai_person_id_fkey`;
ALTER TABLE `pegawai` DROP FOREIGN KEY `pegawai_unit_id_fkey`;
ALTER TABLE `pegawai_unit` DROP FOREIGN KEY `pegawai_unit_pegawai_id_fkey`;
ALTER TABLE `pegawai_unit` DROP FOREIGN KEY `pegawai_unit_unit_id_fkey`;
ALTER TABLE `presensi_pegawai` DROP FOREIGN KEY `presensi_pegawai_pegawai_id_fkey`;
ALTER TABLE `salary_components` DROP FOREIGN KEY `salary_components_pegawai_id_fkey`;
ALTER TABLE `unit` DROP FOREIGN KEY `unit_kepala_pegawai_id_fkey`;
ALTER TABLE `kelas` DROP FOREIGN KEY `kelas_wali_kelas_id_fkey`;
ALTER TABLE `jadwal_pelajaran` DROP FOREIGN KEY `jadwal_pelajaran_pegawai_id_fkey`;
ALTER TABLE `jadwal_piket` DROP FOREIGN KEY `jadwal_piket_pegawai_id_fkey`;
ALTER TABLE `jurnal_mengajar` DROP FOREIGN KEY `jurnal_mengajar_pegawai_id_fkey`;

-- 2. Rename columns/indexes in place (before the table rename, so old FK
--    names below still reference the pre-rename table names).
ALTER TABLE `pegawai`
  CHANGE `nip` `employee_number` VARCHAR(32) NOT NULL,
  CHANGE `jabatan` `position` VARCHAR(120) NOT NULL,
  CHANGE `rekening` `bank_account` VARCHAR(64) NULL,
  CHANGE `pendidikan_terakhir` `last_education` VARCHAR(120) NULL,
  CHANGE `mapel_diampu` `subjects_taught` VARCHAR(255) NULL,
  CHANGE `tugas_tambahan` `additional_duties` VARCHAR(255) NULL,
  CHANGE `jam_mengajar` `teaching_hours` INTEGER NOT NULL DEFAULT 0,
  CHANGE `tmp_tgl_lahir` `birth_place_date` VARCHAR(120) NULL,
  RENAME INDEX `pegawai_nip_key` TO `staff_employee_number_key`,
  RENAME INDEX `pegawai_person_id_key` TO `staff_person_id_key`;

ALTER TABLE `pegawai_unit`
  CHANGE `pegawai_id` `staff_id` BIGINT NOT NULL,
  CHANGE `jabatan` `position` VARCHAR(120) NULL,
  CHANGE `nip` `employee_number` VARCHAR(32) NULL,
  CHANGE `utama` `is_primary` TINYINT(1) NOT NULL DEFAULT 0,
  RENAME INDEX `pegawai_unit_unit_id_idx` TO `staff_units_unit_id_idx`;

ALTER TABLE `jabatan_struktural`
  CHANGE `sk_nomor` `decree_number` VARCHAR(64) NOT NULL,
  CHANGE `urutan` `order` INTEGER NOT NULL DEFAULT 0,
  CHANGE `jabatan` `position` VARCHAR(160) NOT NULL,
  CHANGE `lingkup` `scope` VARCHAR(32) NOT NULL,
  CHANGE `divisi` `division` VARCHAR(120) NULL,
  CHANGE `periode_mulai` `start_period` DATE NOT NULL,
  CHANGE `periode_selesai` `end_period` DATE NOT NULL,
  CHANGE `pegawai_id` `staff_id` BIGINT NULL,
  CHANGE `nama_mentah` `source_name` VARCHAR(160) NOT NULL,
  RENAME INDEX `jabatan_struktural_lingkup_idx` TO `structural_positions_scope_idx`,
  RENAME INDEX `jabatan_struktural_sk_nomor_urutan_key` TO `structural_positions_decree_number_order_key`;

ALTER TABLE `payroll_slips`
  CHANGE `pegawai_id` `staff_id` BIGINT NOT NULL,
  CHANGE `periode` `period` VARCHAR(16) NOT NULL,
  RENAME INDEX `payroll_slips_pegawai_id_periode_key` TO `pay_slips_staff_id_period_key`;

ALTER TABLE `presensi_pegawai`
  CHANGE `pegawai_id` `staff_id` BIGINT NOT NULL,
  CHANGE `tgl` `date` DATE NOT NULL,
  CHANGE `jam_masuk` `check_in` VARCHAR(16) NULL,
  CHANGE `jam_pulang` `check_out` VARCHAR(16) NULL,
  CHANGE `ket` `notes` VARCHAR(255) NULL,
  RENAME INDEX `presensi_pegawai_pegawai_id_tgl_key` TO `staff_attendances_staff_id_date_key`;

ALTER TABLE `beban_jam`
  CHANGE `pegawai_id` `staff_id` BIGINT NOT NULL,
  CHANGE `mapel` `subject` VARCHAR(160) NULL,
  CHANGE `jumlah_jam` `hours` INTEGER NULL,
  CHANGE `keterangan` `notes` VARCHAR(255) NULL,
  RENAME INDEX `beban_jam_pegawai_id_idx` TO `teaching_loads_staff_id_idx`;

ALTER TABLE `arsip_sk`
  CHANGE `nomor` `number` VARCHAR(64) NOT NULL,
  CHANGE `judul` `title` VARCHAR(200) NOT NULL,
  CHANGE `tgl` `date` DATE NOT NULL,
  CHANGE `jenis` `type` VARCHAR(64) NOT NULL,
  CHANGE `pegawai_id` `staff_id` BIGINT NULL,
  RENAME INDEX `arsip_sk_jenis_idx` TO `decree_archives_type_idx`;

ALTER TABLE `salary_components`
  CHANGE `pegawai_id` `staff_id` BIGINT NOT NULL;

ALTER TABLE `unit`
  CHANGE `kepala_pegawai_id` `head_staff_id` BIGINT NULL;

ALTER TABLE `kelas`
  CHANGE `wali_kelas_id` `homeroom_staff_id` BIGINT NULL;

ALTER TABLE `jadwal_pelajaran`
  CHANGE `pegawai_id` `staff_id` BIGINT NULL;

ALTER TABLE `jadwal_piket`
  CHANGE `pegawai_id` `staff_id` BIGINT NULL;

ALTER TABLE `jurnal_mengajar`
  CHANGE `pegawai_id` `staff_id` BIGINT NULL,
  RENAME INDEX `jurnal_mengajar_pegawai_id_tgl_idx` TO `jurnal_mengajar_staff_id_tgl_idx`;

-- 3. Rename the tables themselves.
RENAME TABLE
  `pegawai` TO `staff`,
  `pegawai_unit` TO `staff_units`,
  `jabatan_struktural` TO `structural_positions`,
  `payroll_slips` TO `pay_slips`,
  `presensi_pegawai` TO `staff_attendances`,
  `beban_jam` TO `teaching_loads`,
  `arsip_sk` TO `decree_archives`;

-- 4. Recreate foreign keys against the new table/column names.
ALTER TABLE `staff`
  ADD CONSTRAINT `staff_person_id_fkey`
    FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `staff_unit_id_fkey`
    FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `staff_units`
  ADD CONSTRAINT `staff_units_staff_id_fkey`
    FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `staff_units_unit_id_fkey`
    FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `structural_positions`
  ADD CONSTRAINT `structural_positions_staff_id_fkey`
    FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `pay_slips`
  ADD CONSTRAINT `pay_slips_staff_id_fkey`
    FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `staff_attendances`
  ADD CONSTRAINT `staff_attendances_staff_id_fkey`
    FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `teaching_loads`
  ADD CONSTRAINT `teaching_loads_staff_id_fkey`
    FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `decree_archives`
  ADD CONSTRAINT `decree_archives_staff_id_fkey`
    FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `salary_components`
  ADD CONSTRAINT `salary_components_staff_id_fkey`
    FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `unit`
  ADD CONSTRAINT `unit_head_staff_id_fkey`
    FOREIGN KEY (`head_staff_id`) REFERENCES `staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `kelas`
  ADD CONSTRAINT `kelas_homeroom_staff_id_fkey`
    FOREIGN KEY (`homeroom_staff_id`) REFERENCES `staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `jadwal_pelajaran`
  ADD CONSTRAINT `jadwal_pelajaran_staff_id_fkey`
    FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `jadwal_piket`
  ADD CONSTRAINT `jadwal_piket_staff_id_fkey`
    FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `jurnal_mengajar`
  ADD CONSTRAINT `jurnal_mengajar_staff_id_fkey`
    FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
