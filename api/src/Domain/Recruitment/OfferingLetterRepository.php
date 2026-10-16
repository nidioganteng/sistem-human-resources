<?php
declare(strict_types=1);

namespace App\Domain\Recruitment;

interface OfferingLetterRepository
{
    public function find(int $id): ?OfferingLetter;

    public function findByApplicant(int $applicantId): ?OfferingLetter;

    /** @return OfferingLetter[] status = pending_ceo atau revision */
    public function findPendingForCeo(): array;

    /** @return OfferingLetter[] semua OL yang dibuat oleh HR tertentu */
    public function findByDraftedBy(int $userId): array;

    public function findByToken(string $token): ?OfferingLetter;

    public function save(OfferingLetter $ol): void;
}
