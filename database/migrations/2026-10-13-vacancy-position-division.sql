-- Migration: Tambah kolom position dan division ke tabel vacancies
-- Jalankan di database yang sudah ada (phpMyAdmin atau mysql CLI).
-- Schema.sql sudah diperbarui; migration ini hanya untuk database yang sudah punya tabel vacancies lama.

ALTER TABLE vacancies
    ADD COLUMN position VARCHAR(150) NOT NULL DEFAULT '' AFTER mrf_id,
    ADD COLUMN division VARCHAR(80)  NOT NULL DEFAULT '' AFTER position;
