-- Tambah nilai 'recalled' ke ENUM action di tabel mrf_approvals.
-- Diperlukan untuk fitur Tarik Kembali MRF.

ALTER TABLE mrf_approvals
  MODIFY COLUMN action ENUM('submit','approve','revise','cancel','recalled') NOT NULL;
