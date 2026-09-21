-- Seluruh santri/siswa pondok berstatus mukim; status "Kalong" dihapus.
UPDATE `santri` SET `status` = 'Mukim' WHERE `status` = 'Kalong';

ALTER TABLE `santri` MODIFY `status` ENUM('Mukim', 'Alumni', 'Keluar') NOT NULL DEFAULT 'Mukim';
