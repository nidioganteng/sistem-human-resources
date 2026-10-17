-- Tambah status 'approved' dan kolom revision_comment ke tabel offering_letters.
-- Jalankan di database produksi lewat phpMyAdmin sebelum deploy.
ALTER TABLE offering_letters
    MODIFY COLUMN status ENUM('draft','pending_ceo','revision','approved','sent','accepted','declined','expired') NOT NULL DEFAULT 'draft',
    ADD COLUMN revision_comment TEXT NULL AFTER status;
