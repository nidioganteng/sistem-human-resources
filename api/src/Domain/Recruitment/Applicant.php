<?php
declare(strict_types=1);

namespace App\Domain\Recruitment;

use App\Domain\Identity\Role;
use App\Domain\Identity\User;
use App\Domain\Shared\DomainRuleViolation;
use App\Domain\Shared\NotAllowed;
use DateTimeImmutable;

/** Entity pelamar. Dibuat lewat pendaftaran publik, dikelola HR saat screening. */
final class Applicant
{
    private function __construct(
        private ?int $id,
        private int $vacancyId,
        private string $fullName,
        private string $email,
        private string $phone,
        private string $cvPath,
        private ?string $portfolioPath,
        private ?string $message,
        private DateTimeImmutable $consentAt,
        private ApplicantStatus $status,
        private ?int $screenedBy,
        private DateTimeImmutable $createdAt,
        private DateTimeImmutable $updatedAt,
    ) {}

    public static function register(
        int $vacancyId,
        string $fullName,
        string $email,
        string $phone,
        string $cvPath,
        ?string $portfolioPath,
        ?string $message,
    ): self {
        $now = new DateTimeImmutable();

        return new self(
            null, $vacancyId, $fullName, $email, $phone,
            $cvPath, $portfolioPath, $message, $now,
            ApplicantStatus::New, null, $now, $now,
        );
    }

    public static function reconstitute(
        int $id,
        int $vacancyId,
        string $fullName,
        string $email,
        string $phone,
        string $cvPath,
        ?string $portfolioPath,
        ?string $message,
        DateTimeImmutable $consentAt,
        ApplicantStatus $status,
        ?int $screenedBy,
        DateTimeImmutable $createdAt,
        DateTimeImmutable $updatedAt,
    ): self {
        return new self(
            $id, $vacancyId, $fullName, $email, $phone,
            $cvPath, $portfolioPath, $message, $consentAt,
            $status, $screenedBy, $createdAt, $updatedAt,
        );
    }

    /**
     * HR menolak pelamar pada tahap screening awal.
     * Data pelamar akan dihapus oleh use case setelah memanggil method ini.
     */
    public function reject(User $hr): void
    {
        if ($hr->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat melakukan screening.');
        }
        if ($this->status !== ApplicantStatus::New) {
            throw new DomainRuleViolation('Pelamar ini tidak lagi dalam tahap screening awal.');
        }

        $this->status     = ApplicantStatus::ScreenRejected;
        $this->screenedBy = $hr->id;
        $this->updatedAt  = new DateTimeImmutable();
    }

    /** CEO (super_admin) memberi shortlist pada pelamar yang sudah mengisi Form Pelamar. */
    public function shortlist(User $actor): void
    {
        if ($actor->role !== Role::SuperAdmin) {
            throw new NotAllowed('Hanya CEO yang dapat melakukan shortlist kandidat.');
        }
        if ($this->status !== ApplicantStatus::FormSubmitted) {
            throw new DomainRuleViolation('Shortlist hanya dapat dilakukan pada pelamar berstatus Form Terisi.');
        }

        $this->status    = ApplicantStatus::Shortlisted;
        $this->updatedAt = new DateTimeImmutable();
    }

    /** HR atau CEO memanggil kandidat ke tahap seleksi. */
    public function callToSelection(User $actor): void
    {
        if (!$actor->hasRole(Role::Hr, Role::SuperAdmin)) {
            throw new NotAllowed('Hanya HR atau CEO yang dapat memanggil kandidat ke seleksi.');
        }
        if ($this->status !== ApplicantStatus::Shortlisted) {
            throw new DomainRuleViolation('Pemanggilan seleksi hanya dapat dilakukan pada kandidat berstatus Shortlist.');
        }

        $this->status    = ApplicantStatus::Selection;
        $this->updatedAt = new DateTimeImmutable();
    }

    /**
     * HR atau CEO mencatat hasil satu tahap seleksi.
     * Jika gagal, status langsung berubah ke not_selected.
     * Jika lulus, status tetap selection; use case yang menentukan apakah lanjut ke offer_pending.
     */
    public function recordSelectionResult(User $actor, string $stage, string $result): void
    {
        if (!$actor->hasRole(Role::Hr, Role::SuperAdmin)) {
            throw new NotAllowed('Hanya HR atau CEO yang dapat mencatat hasil seleksi.');
        }
        if ($this->status !== ApplicantStatus::Selection) {
            throw new DomainRuleViolation('Pencatatan hasil seleksi hanya dapat dilakukan pada kandidat berstatus Seleksi.');
        }
        if (!in_array($stage, ['competency_test', 'interview'], true)) {
            throw new DomainRuleViolation('Tahap seleksi tidak valid.');
        }
        if (!in_array($result, ['pass', 'fail'], true)) {
            throw new DomainRuleViolation('Hasil seleksi tidak valid.');
        }

        if ($result === 'fail') {
            $this->status = ApplicantStatus::NotSelected;
        }

        $this->updatedAt = new DateTimeImmutable();
    }

    /**
     * Dipanggil use case setelah memastikan kondisi lulus + track terpenuhi untuk offer.
     * Hanya boleh dipanggil ketika status masih selection (sebelum save).
     */
    public function advanceToOffer(): void
    {
        if ($this->status !== ApplicantStatus::Selection) {
            throw new DomainRuleViolation('Hanya kandidat berstatus Seleksi yang dapat dilanjutkan ke Penawaran.');
        }

        $this->status    = ApplicantStatus::OfferPending;
        $this->updatedAt = new DateTimeImmutable();
    }

    /** Dipanggil use case saat HR mengirim Offering Letter ke kandidat. */
    public function advanceToOffered(): void
    {
        if ($this->status !== ApplicantStatus::OfferPending) {
            throw new DomainRuleViolation('Hanya kandidat berstatus offer_pending yang dapat dilanjutkan ke Offered.');
        }

        $this->status    = ApplicantStatus::Offered;
        $this->updatedAt = new DateTimeImmutable();
    }

    /** Kandidat menerima penawaran. */
    public function acceptOffer(): void
    {
        if ($this->status !== ApplicantStatus::Offered) {
            throw new DomainRuleViolation('Hanya kandidat berstatus offered yang dapat menerima penawaran.');
        }

        $this->status    = ApplicantStatus::Accepted;
        $this->updatedAt = new DateTimeImmutable();
    }

    /** Kandidat menolak penawaran. */
    public function declineOffer(): void
    {
        if ($this->status !== ApplicantStatus::Offered) {
            throw new DomainRuleViolation('Hanya kandidat berstatus offered yang dapat menolak penawaran.');
        }

        $this->status    = ApplicantStatus::Declined;
        $this->updatedAt = new DateTimeImmutable();
    }

    /** HR menyetujui pelamar dan mengirim tautan Form Pelamar. */
    public function approvePending(User $hr): void
    {
        if ($hr->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat melakukan screening.');
        }
        if ($this->status !== ApplicantStatus::New) {
            throw new DomainRuleViolation('Pelamar ini tidak lagi dalam tahap screening awal.');
        }

        $this->status     = ApplicantStatus::FormPending;
        $this->screenedBy = $hr->id;
        $this->updatedAt  = new DateTimeImmutable();
    }

    public function assignId(int $id): void { $this->id = $id; }

    public function id(): ?int { return $this->id; }
    public function vacancyId(): int { return $this->vacancyId; }
    public function fullName(): string { return $this->fullName; }
    public function email(): string { return $this->email; }
    public function phone(): string { return $this->phone; }
    public function cvPath(): string { return $this->cvPath; }
    public function portfolioPath(): ?string { return $this->portfolioPath; }
    public function message(): ?string { return $this->message; }
    public function consentAt(): DateTimeImmutable { return $this->consentAt; }
    public function status(): ApplicantStatus { return $this->status; }
    public function screenedBy(): ?int { return $this->screenedBy; }
    public function createdAt(): DateTimeImmutable { return $this->createdAt; }
    public function updatedAt(): DateTimeImmutable { return $this->updatedAt; }
}
