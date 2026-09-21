-- Pisahkan status keaktifan santri dari hasil pendidikan per lembaga.
-- Tahap transisi mempertahankan nilai enum lama sampai seluruh baris dipetakan.
ALTER TABLE `santri`
  MODIFY `status` ENUM('Mukim', 'Alumni', 'Keluar', 'Aktif', 'TidakAktif') NOT NULL DEFAULT 'Aktif';
UPDATE `santri`
SET `status` = CASE
  WHEN `status` = 'Mukim' THEN 'Aktif'
  ELSE 'TidakAktif'
END;
ALTER TABLE `santri`
  MODIFY `status` ENUM('Aktif', 'TidakAktif') NOT NULL DEFAULT 'Aktif';

ALTER TABLE `riwayat_pendidikan`
  MODIFY `status` ENUM('Mukim', 'Alumni', 'Keluar', 'Aktif', 'Lulus', 'TidakAktif') NOT NULL DEFAULT 'Lulus';
UPDATE `riwayat_pendidikan`
SET `status` = CASE
  WHEN `status` = 'Mukim' THEN 'Aktif'
  WHEN `status` = 'Alumni' THEN 'Lulus'
  ELSE 'TidakAktif'
END;
ALTER TABLE `riwayat_pendidikan`
  MODIFY `status` ENUM('Aktif', 'Lulus', 'TidakAktif') NOT NULL DEFAULT 'Lulus';
