<?php
declare(strict_types=1);

namespace App\Domain\Recruitment;

use App\Domain\Identity\Role;
use DateTimeImmutable;

/** Satu baris riwayat persetujuan MRF (audit trail). */
final class ApprovalEntry
{
    public function __construct(
        public readonly int $actorId,
        public readonly string $actorName,
        public readonly Role $actorRole,
        public readonly ApprovalAction $action,
        public readonly ?string $comment,
        public readonly MrfStatus $fromStatus,
        public readonly MrfStatus $toStatus,
        public readonly DateTimeImmutable $createdAt,
    ) {}
}
