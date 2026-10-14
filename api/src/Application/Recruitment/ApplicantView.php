<?php
declare(strict_types=1);

namespace App\Application\Recruitment;

use App\Domain\Recruitment\Applicant;

/** Bentuk Applicant untuk dikirim ke browser. Tidak menyertakan jalur berkas internal. */
final class ApplicantView
{
    /** @return array<string,mixed> */
    public static function from(Applicant $a): array
    {
        return [
            'id'        => $a->id(),
            'vacancyId' => $a->vacancyId(),
            'fullName'  => $a->fullName(),
            'email'     => $a->email(),
            'phone'     => $a->phone(),
            'status'    => $a->status()->value,
            'createdAt' => $a->createdAt()->format(DATE_ATOM),
        ];
    }
}
