ALTER TABLE `pengumuman`
  CHANGE COLUMN `tgl` `date` DATE NOT NULL,
  CHANGE COLUMN `judul` `title` VARCHAR(200) NOT NULL,
  CHANGE COLUMN `isi` `content` TEXT NOT NULL;

RENAME TABLE `pengumuman` TO `announcements`;

ALTER TABLE `announcements`
  RENAME INDEX `pengumuman_tgl_idx` TO `announcements_date_idx`;

ALTER TABLE `agenda`
  CHANGE COLUMN `tgl` `date` DATE NOT NULL,
  CHANGE COLUMN `jam` `time` VARCHAR(16) NULL,
  CHANGE COLUMN `judul` `title` VARCHAR(200) NOT NULL;

ALTER TABLE `agenda`
  RENAME INDEX `agenda_tgl_idx` TO `agenda_date_idx`;
