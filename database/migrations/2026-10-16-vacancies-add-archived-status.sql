-- Migrasi: tambah nilai 'archived' pada kolom status tabel vacancies
-- Jalankan di phpMyAdmin Hostinger setelah deploy

ALTER TABLE vacancies
    MODIFY COLUMN status ENUM('open','closed','archived') NOT NULL DEFAULT 'open';
