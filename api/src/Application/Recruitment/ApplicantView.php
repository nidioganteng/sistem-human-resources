<?php
declare(strict_types=1);

namespace App\Application\Recruitment;

use App\Domain\Recruitment\Applicant;

/** Bentuk Applicant untuk dikirim ke browser. Tidak menyertakan jalur berkas internal. */
final class ApplicantView
{
    /**
     * @param string|null $selectionTrack 'fast' atau 'normal', diambil dari MRF via lowongan.
     * @return array<string,mixed>
     */
    public static function from(Applicant $a, ?string $selectionTrack = null): array
    {
        return [
            'id'             => $a->id(),
            'vacancyId'      => $a->vacancyId(),
            'fullName'       => $a->fullName(),
            'email'          => $a->email(),
            'phone'          => $a->phone(),
            'status'         => $a->status()->value,
            'hasCv'          => $a->cvPath() !== '',
            'hasPortfolio'   => $a->portfolioPath() !== null,
            'message'        => $a->message(),
            'createdAt'      => $a->createdAt()->format(DATE_ATOM),
            'selectionTrack' => $selectionTrack,
        ];
    }
}
