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
}
