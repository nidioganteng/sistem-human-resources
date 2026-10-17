<?php
declare(strict_types=1);

namespace App\Domain\Recruitment;

enum VacancyStatus: string
{
    case Open     = 'open';
    case Closed   = 'closed';
    case Archived = 'archived';
}
