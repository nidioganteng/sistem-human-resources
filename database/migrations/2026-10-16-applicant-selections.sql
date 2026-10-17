-- Migrasi: tambah tabel applicant_selections
-- Tanggal: 2026-10-16
-- Dijalankan di phpMyAdmin atau via CLI.

CREATE TABLE IF NOT EXISTS applicant_selections (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  applicant_id  BIGINT UNSIGNED NOT NULL,
  stage         ENUM('competency_test','interview') NOT NULL,
  result        ENUM('pass','fail') NOT NULL,
  notes         TEXT NULL,
  recorded_by   BIGINT UNSIGNED NOT NULL,
  recorded_at   DATETIME NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_sel_app  FOREIGN KEY (applicant_id) REFERENCES applicants(id),
  CONSTRAINT fk_sel_user FOREIGN KEY (recorded_by)  REFERENCES users(id),
  INDEX idx_sel_app (applicant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
