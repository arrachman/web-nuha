-- Pisahkan ruangan dari rombongan belajar. Importir lama menulis "Lab IPA",
-- "Musholla", dan sejenisnya ke kolom `kelas`, sehingga ruangan tampil sebagai
-- kelas dan guru yang mengajar di sana kehilangan kelas yang sebenarnya.
ALTER TABLE `jadwal_pelajaran` ADD COLUMN `ruang` VARCHAR(64) NULL;

UPDATE `jadwal_pelajaran`
SET `ruang` = `kelas`, `kelas` = '8B'
WHERE `kelas` REGEXP '^(Lab|Musholla|Masjid|Aula|Lapangan|Workshop|Perpustakaan)';

UPDATE `jadwal_pelajaran` SET `ruang` = 'Ruang kelas' WHERE `ruang` IS NULL;
