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
    ): self {
        $now = new DateTimeImmutable();

        return new self(
            null, $vacancyId, $fullName, $email, $phone,
            $cvPath, $portfolioPath, $now,
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
        DateTimeImmutable $consentAt,
        ApplicantStatus $status,
        ?int $screenedBy,
        DateTimeImmutable $createdAt,
        DateTimeImmutable $updatedAt,
    ): self {
        return new self(
            $id, $vacancyId, $fullName, $email, $phone,
            $cvPath, $portfolioPath, $consentAt,
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
    public function consentAt(): DateTimeImmutable { return $this->consentAt; }
    public function status(): ApplicantStatus { return $this->status; }
    public function screenedBy(): ?int { return $this->screenedBy; }
    public function createdAt(): DateTimeImmutable { return $this->createdAt; }
    public function updatedAt(): DateTimeImmutable { return $this->updatedAt; }
}
