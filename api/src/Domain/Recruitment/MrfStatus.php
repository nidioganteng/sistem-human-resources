<?php
declare(strict_types=1);

namespace App\Domain\Recruitment;

enum MrfStatus: string
{
    case Draft          = 'draft';
    case PendingManager = 'pending_manager';
    case PendingCeo     = 'pending_ceo';
    case Revision       = 'revision';
    case Approved       = 'approved';
    case Cancelled      = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Draft          => 'Draft',
            self::PendingManager => 'Menunggu Manajer',
            self::PendingCeo     => 'Menunggu CEO',
            self::Revision       => 'Perlu revisi',
            self::Approved       => 'Disetujui',
            self::Cancelled      => 'Dibatalkan',
        };
    }

    public function isEditable(): bool
    {
        return $this === self::Draft || $this === self::Revision;
    }
}
