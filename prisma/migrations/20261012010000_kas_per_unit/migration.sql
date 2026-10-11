-- Keuangan per unit: transaksi kas memiliki unit pemilik.
-- Null = kas umum/yayasan (baris historis & kas tanpa unit).
ALTER TABLE `cash_transactions` ADD COLUMN `unit_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `cash_transactions_unit_id_idx` ON `cash_transactions`(`unit_id`);

-- AddForeignKey
ALTER TABLE `cash_transactions` ADD CONSTRAINT `cash_transactions_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
