-- Preserve existing applicants while adding an optional normalized village relation.
ALTER TABLE `applicants`
  ADD COLUMN `region_id` BIGINT NULL,
  ADD INDEX `applicants_region_id_idx` (`region_id`),
  ADD CONSTRAINT `applicants_region_id_fkey`
    FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
