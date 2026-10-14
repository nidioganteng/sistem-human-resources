<?php
declare(strict_types=1);

namespace App\Application\Recruitment;

use App\Domain\Recruitment\Vacancy;

/** Bentuk Vacancy untuk dikirim ke browser. */
final class VacancyView
{
    /**
     * @param  array<string,int> $counts ['pending' => n, 'total' => n]
     * @return array<string,mixed>
     */
    public static function from(Vacancy $v, array $counts = [], ?string $mrfCode = null): array
    {
        return [
            'id'           => $v->id(),
            'mrfId'        => $v->mrfId(),
            'mrfCode'      => $mrfCode,
            'position'     => $v->position(),
            'division'     => $v->division(),
            'publicToken'  => $v->publicToken(),
            'status'       => $v->status()->value,
            'openedAt'     => $v->openedAt()->format(DATE_ATOM),
            'closedAt'     => $v->closedAt()?->format(DATE_ATOM),
            'pendingCount' => $counts['pending'] ?? 0,
            'totalCount'   => $counts['total'] ?? 0,
        ];
    }
}
