<?php
declare(strict_types=1);

namespace App\Domain\Recruitment;

use App\Domain\Identity\Role;
use App\Domain\Identity\User;
use App\Domain\Shared\DomainRuleViolation;
use App\Domain\Shared\NotAllowed;
use DateTimeImmutable;

/**
 * Aggregate Lowongan.
 * HR membuka lowongan dari MRF yang sudah disetujui CEO, lalu menutupnya secara manual.
 */
final class Vacancy
{
    private function __construct(
        private ?int $id,
        private int $mrfId,
        private string $position,
        private string $division,
        private string $publicToken,
        private VacancyStatus $status,
        private int $openedBy,
        private DateTimeImmutable $openedAt,
        private ?DateTimeImmutable $closedAt,
    ) {}

    public static function open(
        User $hr,
        int $mrfId,
        string $position,
        string $division,
        string $publicToken,
    ): self {
        if ($hr->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat membuka lowongan.');
        }

        return new self(
            null, $mrfId, $position, $division,
            $publicToken, VacancyStatus::Open,
            $hr->id, new DateTimeImmutable(), null,
        );
    }

    public static function reconstitute(
        int $id,
        int $mrfId,
        string $position,
        string $division,
        string $publicToken,
        VacancyStatus $status,
        int $openedBy,
        DateTimeImmutable $openedAt,
        ?DateTimeImmutable $closedAt,
    ): self {
        return new self(
            $id, $mrfId, $position, $division,
            $publicToken, $status, $openedBy, $openedAt, $closedAt,
        );
    }

    public function close(User $actor): void
    {
        if ($actor->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat menutup lowongan.');
        }
        if ($this->status === VacancyStatus::Closed) {
            throw new DomainRuleViolation('Lowongan sudah ditutup.');
        }

        $this->status   = VacancyStatus::Closed;
        $this->closedAt = new DateTimeImmutable();
    }

    public function reopen(User $actor): void
    {
        if ($actor->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat membuka kembali lowongan.');
        }
        if ($this->status === VacancyStatus::Open) {
            throw new DomainRuleViolation('Lowongan sudah terbuka.');
        }

        $this->status   = VacancyStatus::Open;
        $this->closedAt = null;
    }

    public function archive(User $actor): void
    {
        if ($actor->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat mengarsipkan lowongan.');
        }
        if ($this->status !== VacancyStatus::Closed) {
            throw new DomainRuleViolation('Hanya lowongan yang sudah ditutup yang dapat diarsipkan.');
        }

        $this->status = VacancyStatus::Archived;
    }

    public function canBeDeleted(): bool
    {
        return $this->status === VacancyStatus::Closed;
    }

    public function isOpen(): bool
    {
        return $this->status === VacancyStatus::Open;
    }

    public function assignId(int $id): void
    {
        $this->id = $id;
    }

    public function id(): ?int { return $this->id; }
    public function mrfId(): int { return $this->mrfId; }
    public function position(): string { return $this->position; }
    public function division(): string { return $this->division; }
    public function publicToken(): string { return $this->publicToken; }
    public function status(): VacancyStatus { return $this->status; }
    public function openedBy(): int { return $this->openedBy; }
    public function openedAt(): DateTimeImmutable { return $this->openedAt; }
    public function closedAt(): ?DateTimeImmutable { return $this->closedAt; }
}
