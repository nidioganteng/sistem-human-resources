<?php
declare(strict_types=1);

namespace App\Domain\Recruitment;

enum ApprovalAction: string
{
    case Submit  = 'submit';
    case Approve = 'approve';
    case Revise  = 'revise';
    case Cancel  = 'cancel';

    public function label(): string
    {
        return match ($this) {
            self::Submit  => 'Diajukan',
            self::Approve => 'Disetujui',
            self::Revise  => 'Diminta revisi',
            self::Cancel  => 'Dibatalkan',
        };
    }
}
