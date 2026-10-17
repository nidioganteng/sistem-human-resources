<?php
declare(strict_types=1);

namespace App\Domain\Recruitment;

use App\Domain\Identity\Role;
use App\Domain\Identity\User;
use App\Domain\Shared\DomainRuleViolation;
use App\Domain\Shared\NotAllowed;
use DateTimeImmutable;

final class OfferingLetter
{
    private function __construct(
        private ?int $id,
        private int $applicantId,
        private int $draftedBy,
        private ?int $approvedBy,
        private string $position,
        private float $salary,
        private ?DateTimeImmutable $startDate,
        private string $body,
        private OfferingLetterStatus $status,
        private ?string $revisionComment,
        private ?string $responseToken,
        private ?DateTimeImmutable $sentAt,
        private ?DateTimeImmutable $respondBefore,
        private ?DateTimeImmutable $respondedAt,
        private DateTimeImmutable $createdAt,
        private DateTimeImmutable $updatedAt,
    ) {}

    public static function open(
        User $actor,
        int $applicantId,
        string $position,
        float $salary,
        ?DateTimeImmutable $startDate,
        string $body,
    ): self {
        if ($actor->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat membuat Offering Letter.');
        }

        $now = new DateTimeImmutable();

        return new self(
            null, $applicantId, $actor->id, null,
            $position, $salary, $startDate, $body,
            OfferingLetterStatus::Draft, null, null, null, null, null,
            $now, $now,
        );
    }

    public function update(
        User $actor,
        string $position,
        float $salary,
        ?DateTimeImmutable $startDate,
        string $body,
    ): void {
        if ($actor->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat mengubah Offering Letter.');
        }
        if ($this->status !== OfferingLetterStatus::Draft && $this->status !== OfferingLetterStatus::Revision) {
            throw new DomainRuleViolation('Offering Letter hanya dapat diubah saat berstatus draft atau revisi.');
        }

        $this->position  = $position;
        $this->salary    = $salary;
        $this->startDate = $startDate;
        $this->body      = $body;
        $this->updatedAt = new DateTimeImmutable();
    }

    public function submit(User $actor): void
    {
        if ($actor->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat mengajukan Offering Letter ke CEO.');
        }
        if ($this->status !== OfferingLetterStatus::Draft && $this->status !== OfferingLetterStatus::Revision) {
            throw new DomainRuleViolation('Offering Letter hanya dapat diajukan saat berstatus draft atau revisi.');
        }

        $this->status          = OfferingLetterStatus::PendingCeo;
        $this->revisionComment = null;
        $this->updatedAt       = new DateTimeImmutable();
    }

    public function approve(User $actor): void
    {
        if ($actor->role !== Role::SuperAdmin) {
            throw new NotAllowed('Hanya CEO yang dapat menyetujui Offering Letter.');
        }
        if ($this->status !== OfferingLetterStatus::PendingCeo) {
            throw new DomainRuleViolation('Offering Letter ini tidak sedang menunggu persetujuan CEO.');
        }

        $this->status     = OfferingLetterStatus::Approved;
        $this->approvedBy = $actor->id;
        $this->updatedAt  = new DateTimeImmutable();
    }

    public function revise(User $actor, string $comment): void
    {
        if ($actor->role !== Role::SuperAdmin) {
            throw new NotAllowed('Hanya CEO yang dapat meminta revisi Offering Letter.');
        }
        if ($this->status !== OfferingLetterStatus::PendingCeo) {
            throw new DomainRuleViolation('Offering Letter ini tidak sedang menunggu persetujuan CEO.');
        }

        $comment = trim($comment);
        if ($comment === '') {
            throw new DomainRuleViolation('Catatan revisi wajib diisi agar HR tahu apa yang diperbaiki.');
        }

        $this->status          = OfferingLetterStatus::Revision;
        $this->revisionComment = $comment;
        $this->updatedAt       = new DateTimeImmutable();
    }

    public function markSent(
        string $token,
        DateTimeImmutable $sentAt,
        DateTimeImmutable $respondBefore,
    ): void {
        if ($this->status !== OfferingLetterStatus::Approved) {
            throw new DomainRuleViolation('Offering Letter hanya dapat dikirim setelah disetujui CEO.');
        }

        $this->status        = OfferingLetterStatus::Sent;
        $this->responseToken = $token;
        $this->sentAt        = $sentAt;
        $this->respondBefore = $respondBefore;
        $this->updatedAt     = new DateTimeImmutable();
    }

    public function recordResponse(string $action): void
    {
        if ($this->status !== OfferingLetterStatus::Sent) {
            throw new DomainRuleViolation('Offering Letter ini tidak sedang dalam status terkirim.');
        }

        $this->status      = match ($action) {
            'accept'  => OfferingLetterStatus::Accepted,
            'decline' => OfferingLetterStatus::Declined,
            default   => throw new DomainRuleViolation('Aksi respons tidak valid.'),
        };
        $this->respondedAt = new DateTimeImmutable();
        $this->updatedAt   = new DateTimeImmutable();
    }

    public function expire(): void
    {
        if ($this->status !== OfferingLetterStatus::Sent) {
            throw new DomainRuleViolation('Hanya Offering Letter berstatus terkirim yang dapat kedaluwarsa.');
        }

        $this->status    = OfferingLetterStatus::Expired;
        $this->updatedAt = new DateTimeImmutable();
    }

    public function assignId(int $id): void { $this->id = $id; }

    public function id(): ?int { return $this->id; }
    public function applicantId(): int { return $this->applicantId; }
    public function draftedBy(): int { return $this->draftedBy; }
    public function approvedBy(): ?int { return $this->approvedBy; }
    public function position(): string { return $this->position; }
    public function salary(): float { return $this->salary; }
    public function startDate(): ?DateTimeImmutable { return $this->startDate; }
    public function body(): string { return $this->body; }
    public function status(): OfferingLetterStatus { return $this->status; }
    public function revisionComment(): ?string { return $this->revisionComment; }
    public function responseToken(): ?string { return $this->responseToken; }
    public function sentAt(): ?DateTimeImmutable { return $this->sentAt; }
    public function respondBefore(): ?DateTimeImmutable { return $this->respondBefore; }
    public function respondedAt(): ?DateTimeImmutable { return $this->respondedAt; }
    public function createdAt(): DateTimeImmutable { return $this->createdAt; }
    public function updatedAt(): DateTimeImmutable { return $this->updatedAt; }

    public static function reconstitute(
        int $id,
        int $applicantId,
        int $draftedBy,
        ?int $approvedBy,
        string $position,
        float $salary,
        ?DateTimeImmutable $startDate,
        string $body,
        OfferingLetterStatus $status,
        ?string $revisionComment,
        ?string $responseToken,
        ?DateTimeImmutable $sentAt,
        ?DateTimeImmutable $respondBefore,
        ?DateTimeImmutable $respondedAt,
        DateTimeImmutable $createdAt,
        DateTimeImmutable $updatedAt,
    ): self {
        return new self(
            $id, $applicantId, $draftedBy, $approvedBy,
            $position, $salary, $startDate, $body,
            $status, $revisionComment, $responseToken,
            $sentAt, $respondBefore, $respondedAt,
            $createdAt, $updatedAt,
        );
    }
}
