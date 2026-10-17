<?php
declare(strict_types=1);

namespace App\Application\Recruitment;

use App\Domain\Recruitment\OfferingLetter;

final class OfferingLetterView
{
    /** @return array<string,mixed> */
    public static function from(
        OfferingLetter $ol,
        ?string $hrSignaturePath = null,
        ?string $ceoSignaturePath = null,
    ): array {
        return [
            'id'               => $ol->id(),
            'applicantId'      => $ol->applicantId(),
            'draftedBy'        => $ol->draftedBy(),
            'approvedBy'       => $ol->approvedBy(),
            'position'         => $ol->position(),
            'salary'           => $ol->salary(),
            'startDate'        => $ol->startDate()?->format('Y-m-d'),
            'body'             => $ol->body(),
            'status'           => $ol->status()->value,
            'revisionComment'  => $ol->revisionComment(),
            'responseToken'    => $ol->responseToken(),
            'sentAt'           => $ol->sentAt()?->format(DATE_ATOM),
            'respondBefore'    => $ol->respondBefore()?->format(DATE_ATOM),
            'respondedAt'      => $ol->respondedAt()?->format(DATE_ATOM),
            'createdAt'        => $ol->createdAt()->format(DATE_ATOM),
            'updatedAt'        => $ol->updatedAt()->format(DATE_ATOM),
            'hasHrSignature'   => $hrSignaturePath !== null,
            'hasCeoSignature'  => $ceoSignaturePath !== null,
        ];
    }
}
