-- Kunci idempoten importir piket: satu shift per (hari, jam mulai).
-- Tabel masih kosong saat migrasi ini dibuat, jadi tidak ada risiko bentrok.
CREATE UNIQUE INDEX `jadwal_piket_hari_waktu_mulai_key` ON `jadwal_piket`(`hari`, `waktu_mulai`);
