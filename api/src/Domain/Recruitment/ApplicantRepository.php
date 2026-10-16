<?php
declare(strict_types=1);

namespace App\Domain\Recruitment;

use DateTimeImmutable;

interface ApplicantRepository
{
    public function save(Applicant $a): void;
    public function find(int $id): ?Applicant;

    /** @return Applicant[] */
    public function findByVacancy(int $vacancyId): array;

    public function existsByEmailAndVacancy(string $email, int $vacancyId): bool;

    /** Hapus record pelamar dari database. Berkas di storage dihapus terpisah oleh use case. */
    public function delete(int $id): void;

    /**
     * Simpan token Form Pelamar di tabel applicant_forms.
     * Dipanggil use case setelah approvePending berhasil.
     */
    public function saveFormToken(int $applicantId, string $token, DateTimeImmutable $expiresAt): void;

    /**
     * Cari baris applicant_forms berdasarkan token.
     * Mengembalikan array dengan key: applicant_id, expires_at, submitted_at.
     * Mengembalikan null jika tidak ditemukan.
     *
     * @return array{applicant_id:int,expires_at:string,submitted_at:string|null}|null
     */
    public function findFormByToken(string $token): ?array;

    /**
     * Simpan data Form Pelamar yang sudah disubmit.
     * Set submitted_at, data JSON, expected_salary, photo_path, signature_path.
     * Juga update status applicants ke 'form_submitted'.
     */
    public function submitForm(
        int $applicantId,
        string $data,
        float $expectedSalary,
        ?string $photoPath,
        ?string $signaturePath,
    ): void;

    /**
     * Ambil isi Form Pelamar yang sudah disubmit.
     * Mengembalikan null jika belum ada form atau belum disubmit.
     *
     * @return array{data:string,expected_salary:float,photo_path:string|null,signature_path:string|null,submitted_at:string}|null
     */
    public function findFormData(int $applicantId): ?array;

    /** Simpan satu catatan hasil tahap seleksi ke applicant_selections. */
    public function saveSelectionRecord(
        int $applicantId,
        string $stage,
        string $result,
        ?string $notes,
        int $recordedBy,
    ): void;

    /**
     * Ambil semua catatan seleksi milik satu pelamar, urut dari terlama ke terbaru.
     *
     * @return array<int,array{id:int,stage:string,result:string,notes:string|null,recordedAt:string}>
     */
    public function findSelectionRecords(int $applicantId): array;
}
