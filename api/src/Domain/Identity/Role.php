<?php
declare(strict_types=1);

namespace App\Domain\Identity;

enum Role: string
{
    case SuperAdmin = 'super_admin'; // CEO
    case Hr         = 'hr';
    case Manajer    = 'manajer';
    case Pic        = 'pic';

    public function label(): string
    {
        return match ($this) {
            self::SuperAdmin => 'CEO (Super Admin)',
            self::Hr         => 'HR',
            self::Manajer    => 'Manajer',
            self::Pic        => 'PIC',
        };
    }
}
