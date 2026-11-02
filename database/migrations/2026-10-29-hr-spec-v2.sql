-- Resumable DDL: MySQL commits DDL statements individually.
ALTER TABLE employees MODIFY employment_status ENUM('PKWT','PKWTT','FREELANCE') NOT NULL;
SET @v2_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employees' AND COLUMN_NAME='private_data'), 'SELECT 1', 'ALTER TABLE employees ADD COLUMN private_data MEDIUMTEXT NULL');
PREPARE v2_stmt FROM @v2_ddl;
EXECUTE v2_stmt;
DEALLOCATE PREPARE v2_stmt;

SET @v2_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employees' AND COLUMN_NAME='nik_hash'), 'SELECT 1', 'ALTER TABLE employees ADD COLUMN nik_hash CHAR(64) NULL UNIQUE');
PREPARE v2_stmt FROM @v2_ddl;
EXECUTE v2_stmt;
DEALLOCATE PREPARE v2_stmt;

SET @v2_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employees' AND COLUMN_NAME='barcode_active'), 'SELECT 1', 'ALTER TABLE employees ADD COLUMN barcode_active TINYINT(1) NOT NULL DEFAULT 1');
PREPARE v2_stmt FROM @v2_ddl;
EXECUTE v2_stmt;
DEALLOCATE PREPARE v2_stmt;

SET @v2_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='offering_letters' AND COLUMN_NAME='hr_signature_path'), 'SELECT 1', 'ALTER TABLE offering_letters ADD COLUMN hr_signature_path VARCHAR(255) NULL');
PREPARE v2_stmt FROM @v2_ddl;
EXECUTE v2_stmt;
DEALLOCATE PREPARE v2_stmt;

SET @v2_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='offering_letters' AND COLUMN_NAME='ceo_signature_path'), 'SELECT 1', 'ALTER TABLE offering_letters ADD COLUMN ceo_signature_path VARCHAR(255) NULL');
PREPARE v2_stmt FROM @v2_ddl;
EXECUTE v2_stmt;
DEALLOCATE PREPARE v2_stmt;

SET @v2_ddl = IF(EXISTS(SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='employees' AND CONSTRAINT_NAME='fk_emp_app'), 'ALTER TABLE employees DROP FOREIGN KEY fk_emp_app', 'SELECT 1');
PREPARE v2_stmt FROM @v2_ddl;
EXECUTE v2_stmt;
DEALLOCATE PREPARE v2_stmt;

SET @v2_ddl = IF(EXISTS(SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='employees' AND CONSTRAINT_NAME='fk_emp_app_v2'), 'SELECT 1', 'ALTER TABLE employees ADD CONSTRAINT fk_emp_app_v2 FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE SET NULL');
PREPARE v2_stmt FROM @v2_ddl;
EXECUTE v2_stmt;
DEALLOCATE PREPARE v2_stmt;

ALTER TABLE employee_documents MODIFY doc_type ENUM('ktp','kk','npwp','bpjs','ijazah','foto','lainnya') NOT NULL;
CREATE TABLE IF NOT EXISTS hr_notifications (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, recipient_id BIGINT UNSIGNED NOT NULL,
 kind VARCHAR(60) NOT NULL, title VARCHAR(190) NOT NULL, payload MEDIUMTEXT NOT NULL,
 read_at DATETIME NULL, created_at DATETIME NOT NULL, INDEX idx_notifications (recipient_id, read_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS email_outbox (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, recipient VARCHAR(190) NOT NULL,
 subject VARCHAR(255) NOT NULL, payload MEDIUMTEXT NOT NULL,
 status ENUM('pending','processing','sent','failed') NOT NULL DEFAULT 'pending', attempts INT NOT NULL DEFAULT 0,
 available_at DATETIME NOT NULL, locked_at DATETIME NULL, last_error TEXT NULL, sent_at DATETIME NULL, created_at DATETIME NOT NULL,
 INDEX idx_outbox (status, available_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS employee_change_requests (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, employee_id BIGINT UNSIGNED NOT NULL,
 requested_by BIGINT UNSIGNED NOT NULL, reviewed_by BIGINT UNSIGNED NULL,
 status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
 snapshot_hash CHAR(64) NOT NULL,
 pending_employee_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status = 'pending' THEN employee_id ELSE NULL END) STORED UNIQUE, payload MEDIUMTEXT NOT NULL, comment TEXT NULL,
 created_at DATETIME NOT NULL, reviewed_at DATETIME NULL,
 INDEX idx_change_status (status, employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS employee_records (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, employee_id BIGINT UNSIGNED NOT NULL,
 category ENUM('discipline','career','offboarding') NOT NULL, kind VARCHAR(40) NOT NULL,
 status ENUM('recorded','open','completed') NOT NULL DEFAULT 'recorded', payload MEDIUMTEXT NOT NULL,
 created_by BIGINT UNSIGNED NOT NULL, created_at DATETIME NOT NULL, completed_at DATETIME NULL,
 INDEX idx_emp_records (employee_id, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS talent_pool (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, applicant_id BIGINT UNSIGNED NULL UNIQUE,
 payload MEDIUMTEXT NOT NULL, added_by BIGINT UNSIGNED NOT NULL, created_at DATETIME NOT NULL,
 expires_at DATETIME NOT NULL, INDEX idx_talent_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS vacancy_archives (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, vacancy_id BIGINT UNSIGNED NOT NULL,
 path VARCHAR(255) NOT NULL, checksum CHAR(64) NOT NULL, manifest_hash CHAR(64) NOT NULL, status ENUM('ready','purged') NOT NULL DEFAULT 'ready',
 created_by BIGINT UNSIGNED NOT NULL, created_at DATETIME NOT NULL, purged_at DATETIME NULL,
 INDEX idx_archive_vacancy (vacancy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS applicant_documents (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, applicant_id BIGINT UNSIGNED NOT NULL,
 doc_type VARCHAR(40) NOT NULL, file_path VARCHAR(255) NOT NULL, created_at DATETIME NOT NULL,
 INDEX idx_app_docs (applicant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Payroll must use the authenticated API once private fields are encrypted.
CREATE OR REPLACE VIEW v_simatra_employees AS
 SELECT id, position, employment_status FROM employees
 WHERE validated_at IS NOT NULL AND status <> 'inactive';
