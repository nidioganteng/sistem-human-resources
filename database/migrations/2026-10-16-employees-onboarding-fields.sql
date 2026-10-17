-- Tambah kolom onboarding ke tabel employees.
-- Jalankan lewat phpMyAdmin Hostinger sebelum deploy kode baru.

ALTER TABLE employees
  ADD COLUMN onboarding_token CHAR(64) NULL UNIQUE AFTER applicant_id,
  ADD COLUMN token_expires_at DATETIME NULL AFTER onboarding_token,
  ADD COLUMN email VARCHAR(190) NULL AFTER full_name,
  ADD COLUMN phone VARCHAR(30) NULL AFTER email,
  ADD COLUMN personal_data JSON NULL AFTER phone;
