<?php
declare(strict_types=1);

namespace App\Domain\Identity;

enum DivisionType: string
{
    case Teknis    = 'teknis';     // Arsitektur, Sipil, dll. (MRF berjenjang PIC > Manajer > CEO)
    case NonTeknis = 'non_teknis'; // Administrasi, Keuangan (MRF langsung ke CEO)
}
