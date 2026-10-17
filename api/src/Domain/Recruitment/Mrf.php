<?php
declare(strict_types=1);

namespace App\Domain\Recruitment;

use App\Domain\Identity\DivisionType;
use App\Domain\Identity\Role;
use App\Domain\Identity\User;
use App\Domain\Shared\DomainRuleViolation;
use App\Domain\Shared\NotAllowed;
use DateTimeImmutable;

/**
 * Aggregate MRF (Manpower Requisition Form).
 *
 * Alur persetujuan:
 *   PIC (divisi teknis)  : draft > menunggu Manajer > menunggu CEO > disetujui
 *   Manajer (semua divisi): draft > menunggu CEO > disetujui
 * Penolakan = "revisi": kembali ke pembuat dengan komentar, lalu diajukan ulang dari awal.
 * Setelah disetujui CEO, MRF baru terlihat oleh HR.
 */
final class Mrf
{
    /** @var ApprovalEntry[] entri yang belum disimpan */
    private array $newEntries = [];

    /** @param ApprovalEntry[] $history */
    private function __construct(
        private ?int $id,
        private ?string $code,
        private int $requesterId,
        private string $requesterName,
        private Role $requesterRole,
        private string $division,
        private DivisionType $divisionType,
        private MrfSpec $spec,
        private MrfStatus $status,
        private DateTimeImmutable $createdAt,
        private DateTimeImmutable $updatedAt,
        private array $history,
    ) {}

    public static function create(User $requester, MrfSpec $spec): self
    {
        if (!$requester->hasRole(Role::Manajer, Role::Pic)) {
            throw new NotAllowed('Hanya Manajer atau PIC yang dapat membuat MRF.');
        }
        if ($requester->division === null || $requester->divisionType === null) {
            throw new DomainRuleViolation('Akun Anda belum memiliki divisi. Hubungi admin.');
        }
        if ($requester->role === Role::Pic && $requester->divisionType !== DivisionType::Teknis) {
            throw new NotAllowed('PIC hanya dapat membuat MRF untuk divisi teknis. Divisi non-teknis diajukan oleh Manajer.');
        }

        $now = new DateTimeImmutable();

        return new self(
            null, null, $requester->id, $requester->name, $requester->role,
            $requester->division, $requester->divisionType, $spec,
            MrfStatus::Draft, $now, $now, [],
        );
    }

    /** @param ApprovalEntry[] $history */
    public static function reconstitute(
        int $id, string $code, int $requesterId, string $requesterName, Role $requesterRole,
        string $division, DivisionType $divisionType, MrfSpec $spec, MrfStatus $status,
        DateTimeImmutable $createdAt, DateTimeImmutable $updatedAt, array $history,
    ): self {
        return new self(
            $id, $code, $requesterId, $requesterName, $requesterRole,
            $division, $divisionType, $spec, $status, $createdAt, $updatedAt, $history,
        );
    }

    // ── Pertanyaan kewenangan (dipakai juga oleh tampilan untuk menampilkan tombol) ──

    public function canBeViewedBy(User $u): bool
    {
        return match ($u->role) {
            Role::SuperAdmin => $this->status !== MrfStatus::Draft || $this->requesterId === $u->id,
            Role::Hr         => $this->status === MrfStatus::Approved,
            Role::Manajer    => $u->division === $this->division
                                && ($this->status !== MrfStatus::Draft || $this->requesterId === $u->id),
            Role::Pic        => $this->requesterId === $u->id,
        };
    }

    public function canBeEditedBy(User $u): bool
    {
        return $u->id === $this->requesterId && $this->status->isEditable();
    }

    public function canBeRecalledBy(User $u): bool
    {
        return $u->id === $this->requesterId
            && ($this->status === MrfStatus::PendingManager || $this->status === MrfStatus::PendingCeo);
    }

    public function canBeDecidedBy(User $u): bool
    {
        return match ($this->status) {
            MrfStatus::PendingManager => $u->role === Role::Manajer && $u->division === $this->division,
            MrfStatus::PendingCeo     => $u->role === Role::SuperAdmin,
            default                   => false,
        };
    }

    public function needsActionFrom(User $u): bool
    {
        return $this->canBeEditedBy($u) || $this->canBeDecidedBy($u);
    }

    // ── Perubahan keadaan ──

    public function updateSpec(User $actor, MrfSpec $spec): void
    {
        $this->assertEditableBy($actor);
        $this->spec      = $spec;
        $this->updatedAt = new DateTimeImmutable();
    }

    public function submit(User $actor): void
    {
        $this->assertEditableBy($actor);

        $from = $this->status;
        $to   = $this->requesterRole === Role::Pic ? MrfStatus::PendingManager : MrfStatus::PendingCeo;

        $this->transition($actor, ApprovalAction::Submit, null, $from, $to);
    }

    public function approve(User $actor, ?string $comment = null): void
    {
        $this->assertDecidableBy($actor);

        $from = $this->status;
        $to   = $from === MrfStatus::PendingManager ? MrfStatus::PendingCeo : MrfStatus::Approved;

        $this->transition($actor, ApprovalAction::Approve, $this->clean($comment), $from, $to);
    }

    public function requestRevision(User $actor, string $comment): void
    {
        $this->assertDecidableBy($actor);

        $comment = $this->clean($comment);
        if ($comment === null) {
            throw new DomainRuleViolation('Catatan revisi wajib diisi agar pembuat tahu apa yang diperbaiki.');
        }

        $this->transition($actor, ApprovalAction::Revise, $comment, $this->status, MrfStatus::Revision);
    }

    public function cancel(User $actor): void
    {
        $this->assertEditableBy($actor);
        $this->transition($actor, ApprovalAction::Cancel, null, $this->status, MrfStatus::Cancelled);
    }

    public function recall(User $actor): void
    {
        if ($actor->id !== $this->requesterId) {
            throw new NotAllowed('Hanya pembuat MRF yang dapat menarik kembali.');
        }
        if ($this->status !== MrfStatus::PendingManager && $this->status !== MrfStatus::PendingCeo) {
            throw new DomainRuleViolation('MRF hanya dapat ditarik saat menunggu persetujuan Manajer atau CEO.');
        }
        $this->transition($actor, ApprovalAction::Recalled, null, $this->status, MrfStatus::Draft);
    }

    // ── Dipanggil repository ──

    public function assignIdentity(int $id, string $code): void
    {
        $this->id   = $id;
        $this->code = $code;
    }

    /** @return ApprovalEntry[] */
    public function pullNewEntries(): array
    {
        $entries          = $this->newEntries;
        $this->newEntries = [];

        return $entries;
    }

    // ── Getter ──

    public function id(): ?int { return $this->id; }
    public function code(): ?string { return $this->code; }
    public function requesterId(): int { return $this->requesterId; }
    public function requesterName(): string { return $this->requesterName; }
    public function requesterRole(): Role { return $this->requesterRole; }
    public function division(): string { return $this->division; }
    public function divisionType(): DivisionType { return $this->divisionType; }
    public function spec(): MrfSpec { return $this->spec; }
    public function status(): MrfStatus { return $this->status; }
    public function createdAt(): DateTimeImmutable { return $this->createdAt; }
    public function updatedAt(): DateTimeImmutable { return $this->updatedAt; }

    /** @return ApprovalEntry[] */
    public function history(): array { return $this->history; }

    // ── Internal ──

    private function assertEditableBy(User $actor): void
    {
        if ($actor->id !== $this->requesterId) {
            throw new NotAllowed('Hanya pembuat MRF yang dapat mengubah atau mengajukannya.');
        }
        if (!$this->status->isEditable()) {
            throw new DomainRuleViolation('MRF berstatus "' . $this->status->label() . '" tidak dapat diubah.');
        }
    }

    private function assertDecidableBy(User $actor): void
    {
        if (!in_array($this->status, [MrfStatus::PendingManager, MrfStatus::PendingCeo], true)) {
            throw new DomainRuleViolation('MRF ini tidak sedang menunggu persetujuan.');
        }
        if (!$this->canBeDecidedBy($actor)) {
            throw new NotAllowed('Anda tidak berwenang memutuskan MRF pada tahap ini.');
        }
    }

    private function transition(User $actor, ApprovalAction $action, ?string $comment, MrfStatus $from, MrfStatus $to): void
    {
        $now             = new DateTimeImmutable();
        $this->status    = $to;
        $this->updatedAt = $now;

        $entry = new ApprovalEntry($actor->id, $actor->name, $actor->role, $action, $comment, $from, $to, $now);
        $this->newEntries[] = $entry;
        $this->history[]    = $entry;
    }

    private function clean(?string $s): ?string
    {
        $s = $s === null ? '' : trim($s);

        return $s === '' ? null : $s;
    }
}
