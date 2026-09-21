-- Reconcile two technical Region column names missed by the original in-place English rename.
ALTER TABLE `regions`
  CHANGE COLUMN `kode` `code` VARCHAR(20) NOT NULL,
  CHANGE COLUMN `populasi` `population` INT NULL;
