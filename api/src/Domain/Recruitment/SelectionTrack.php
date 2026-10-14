<?php
declare(strict_types=1);

namespace App\Domain\Recruitment;

enum SelectionTrack: string
{
    case Fast   = 'fast';   // langsung wawancara
    case Normal = 'normal'; // uji kompetensi lalu wawancara
}
