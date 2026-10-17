-- Tambah kolom pesan opsional dari pelamar (link web portofolio, dll.)
ALTER TABLE applicants
    ADD COLUMN message TEXT NULL AFTER portfolio_path;
