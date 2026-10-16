-- Sistem HR Gaharu Sempana Group: skema MySQL
-- Impor lewat phpMyAdmin Hostinger ke database khusus HR (bukan database Sidamon atau Simatra).
-- Tabel yang SUDAH dipakai kode: users, mrfs, mrf_approvals.
-- Tabel lain disiapkan untuk modul berikutnya dan akan disesuaikan saat modulnya dibangun.

SET NAMES utf8mb4;

-- ── Pengguna ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(120) NOT NULL,
    email          VARCHAR(190) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    role           ENUM('super_admin','hr','manajer','pic') NOT NULL,
    division       VARCHAR(80) NULL,                       -- mis. Arsitektur, Sipil, Administrasi, Keuangan
    division_type  ENUM('teknis','non_teknis') NULL,       -- menentukan alur MRF
    signature_path VARCHAR(255) NULL,                      -- tanda tangan HR/CEO untuk Offering Letter
    is_active      TINYINT(1) NOT NULL DEFAULT 1,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_role_division (role, division)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── MRF (Manpower Requisition Form) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mrfs (
    id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    code              VARCHAR(30) NULL UNIQUE,             -- MRF/2026/0001, diisi setelah insert
    requester_id      BIGINT UNSIGNED NOT NULL,
    requester_role    ENUM('manajer','pic') NOT NULL,      -- peran saat membuat (menentukan jalur persetujuan)
    division          VARCHAR(80) NOT NULL,
    division_type     ENUM('teknis','non_teknis') NOT NULL,
    position          VARCHAR(150) NOT NULL,
    responsibilities  TEXT NOT NULL,
    education         TEXT NOT NULL,
    skills            TEXT NOT NULL,
    experience        TEXT NOT NULL,
    headcount         SMALLINT UNSIGNED NOT NULL,
    employment_status ENUM('PKWT','PKWTT') NOT NULL,
    selection_track   ENUM('fast','normal') NOT NULL,
    status            ENUM('draft','pending_manager','pending_ceo','revision','approved','cancelled') NOT NULL DEFAULT 'draft',
    created_at        DATETIME NOT NULL,
    updated_at        DATETIME NOT NULL,
    CONSTRAINT fk_mrfs_requester FOREIGN KEY (requester_id) REFERENCES users(id),
    INDEX idx_mrfs_status (status),
    INDEX idx_mrfs_division (division, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Riwayat persetujuan: tidak pernah diubah atau dihapus (audit trail).
CREATE TABLE IF NOT EXISTS mrf_approvals (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    mrf_id      BIGINT UNSIGNED NOT NULL,
    actor_id    BIGINT UNSIGNED NOT NULL,
    actor_role  ENUM('super_admin','hr','manajer','pic') NOT NULL,
    action      ENUM('submit','approve','revise','cancel') NOT NULL,
    comment     TEXT NULL,
    from_status VARCHAR(20) NOT NULL,
    to_status   VARCHAR(20) NOT NULL,
    created_at  DATETIME NOT NULL,
    CONSTRAINT fk_appr_mrf   FOREIGN KEY (mrf_id)   REFERENCES mrfs(id),
    CONSTRAINT fk_appr_actor FOREIGN KEY (actor_id) REFERENCES users(id),
    INDEX idx_appr_mrf (mrf_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Lowongan dan pelamar (modul berikutnya) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS vacancies (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    mrf_id       BIGINT UNSIGNED NOT NULL,
    position     VARCHAR(150) NOT NULL,                    -- disalin dari MRF saat lowongan dibuka
    division     VARCHAR(80)  NOT NULL,
    public_token CHAR(32) NOT NULL UNIQUE,                 -- bagian tautan pendaftaran di poster Instagram
    status       ENUM('open','closed','archived') NOT NULL DEFAULT 'open',
    opened_by    BIGINT UNSIGNED NOT NULL,
    opened_at    DATETIME NOT NULL,
    closed_at    DATETIME NULL,
    CONSTRAINT fk_vac_mrf  FOREIGN KEY (mrf_id)    REFERENCES mrfs(id),
    CONSTRAINT fk_vac_user FOREIGN KEY (opened_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS applicants (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    vacancy_id     BIGINT UNSIGNED NOT NULL,
    full_name      VARCHAR(150) NOT NULL,
    email          VARCHAR(190) NOT NULL,
    phone          VARCHAR(30) NOT NULL,
    cv_path        VARCHAR(255) NOT NULL,                  -- PDF maks. 2 MB, disimpan di luar public_html
    portfolio_path VARCHAR(255) NULL,
    message        TEXT NULL,                              -- pesan opsional dari pelamar (mis. link web portofolio)
    consent_at     DATETIME NOT NULL,                      -- persetujuan penyimpanan data
    status         ENUM('new','screen_rejected','form_pending','form_submitted','shortlisted','not_selected',
                        'selection','offer_pending','offered','accepted','declined','expired','hired') NOT NULL DEFAULT 'new',
    screened_by    BIGINT UNSIGNED NULL,
    created_at     DATETIME NOT NULL,
    updated_at     DATETIME NOT NULL,
    UNIQUE KEY uq_applicant_vacancy_email (vacancy_id, email),   -- satu email, satu lamaran per lowongan
    CONSTRAINT fk_app_vac FOREIGN KEY (vacancy_id) REFERENCES vacancies(id),
    INDEX idx_app_status (vacancy_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS applicant_forms (
    applicant_id   BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    token          CHAR(64) NOT NULL UNIQUE,               -- tautan Form Pelamar di email
    expires_at     DATETIME NOT NULL,
    submitted_at   DATETIME NULL,
    data           JSON NULL,                              -- identitas, pendidikan, pengalaman, bahasa, soft skill, organisasi, 5 pertanyaan
    expected_salary DECIMAL(15,2) NULL,
    photo_path     VARCHAR(255) NULL,                      -- opsional, maks. 500 KB
    signature_path VARCHAR(255) NULL,
    CONSTRAINT fk_form_app FOREIGN KEY (applicant_id) REFERENCES applicants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS applicant_selections (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    applicant_id  BIGINT UNSIGNED NOT NULL,
    stage         ENUM('competency_test','interview') NOT NULL,
    result        ENUM('pass','fail') NOT NULL,
    notes         TEXT NULL,
    recorded_by   BIGINT UNSIGNED NOT NULL,
    recorded_at   DATETIME NOT NULL,
    CONSTRAINT fk_sel_app  FOREIGN KEY (applicant_id) REFERENCES applicants(id),
    CONSTRAINT fk_sel_user FOREIGN KEY (recorded_by)  REFERENCES users(id),
    INDEX idx_sel_app (applicant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS offering_letters (
    id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    applicant_id     BIGINT UNSIGNED NOT NULL,
    drafted_by       BIGINT UNSIGNED NOT NULL,             -- HR
    approved_by      BIGINT UNSIGNED NULL,                 -- CEO
    position         VARCHAR(150) NOT NULL,
    salary           DECIMAL(15,2) NOT NULL,
    start_date       DATE NULL,
    body             MEDIUMTEXT NULL,
    status           ENUM('draft','pending_ceo','revision','sent','accepted','declined','expired') NOT NULL DEFAULT 'draft',
    response_token   CHAR(64) NULL UNIQUE,
    sent_at          DATETIME NULL,
    respond_before   DATETIME NULL,
    responded_at     DATETIME NULL,
    created_at       DATETIME NOT NULL,
    updated_at       DATETIME NOT NULL,
    CONSTRAINT fk_off_app  FOREIGN KEY (applicant_id) REFERENCES applicants(id),
    CONSTRAINT fk_off_hr   FOREIGN KEY (drafted_by)   REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Karyawan ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
    id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    applicant_id      BIGINT UNSIGNED NULL,
    nik               CHAR(16) NULL UNIQUE,
    full_name         VARCHAR(150) NOT NULL,
    position          VARCHAR(150) NOT NULL,
    division          VARCHAR(80) NULL,
    employment_status ENUM('PKWT','PKWTT') NOT NULL,
    salary            DECIMAL(15,2) NULL,
    contract_start    DATE NULL,
    contract_end      DATE NULL,
    status            ENUM('onboarding','active','inactive') NOT NULL DEFAULT 'onboarding',
    validated_at      DATETIME NULL,                       -- diisi HR setelah berkas lengkap; baru setelah itu terlihat oleh Simatra
    validated_by      BIGINT UNSIGNED NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_emp_app FOREIGN KEY (applicant_id) REFERENCES applicants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employee_documents (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    employee_id  BIGINT UNSIGNED NOT NULL,
    doc_type     ENUM('ktp','npwp','bpjs','ijazah','foto','lainnya') NOT NULL,
    file_path    VARCHAR(255) NOT NULL,
    uploaded_at  DATETIME NOT NULL,
    CONSTRAINT fk_doc_emp FOREIGN KEY (employee_id) REFERENCES employees(id),
    INDEX idx_doc_emp (employee_id, doc_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Perubahan data privat karyawan yang sudah divalidasi (memicu notifikasi ke CEO).
CREATE TABLE IF NOT EXISTS audit_logs (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    actor_id    BIGINT UNSIGNED NOT NULL,
    entity      VARCHAR(40) NOT NULL,
    entity_id   BIGINT UNSIGNED NOT NULL,
    action      VARCHAR(40) NOT NULL,
    old_values  JSON NULL,
    new_values  JSON NULL,
    created_at  DATETIME NOT NULL,
    INDEX idx_audit_entity (entity, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── View untuk Simatra (read-only) ──────────────────────────────────────────
-- Simatra hanya membaca kolom yang ia perlukan, dan hanya karyawan yang sudah divalidasi HR.
-- Pembatasan hak: buat user MySQL khusus (hPanel > Databases > Management) lalu, jika hPanel/phpMyAdmin
-- mengizinkan, beri hak SELECT hanya pada view ini:
--   GRANT SELECT ON `nama_db_hr`.`v_simatra_employees` TO 'simatra_ro'@'localhost';
-- Jika Hostinger tidak mengizinkan hak per-objek, pakai endpoint API read-only dengan token (lihat README).
CREATE OR REPLACE VIEW v_simatra_employees AS
    SELECT id, nik, full_name, position, employment_status, salary
    FROM employees
    WHERE validated_at IS NOT NULL AND status <> 'inactive';
