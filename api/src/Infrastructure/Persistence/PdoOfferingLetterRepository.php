<?php
declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Domain\Recruitment\OfferingLetter;
use App\Domain\Recruitment\OfferingLetterRepository;
use App\Domain\Recruitment\OfferingLetterStatus;
use DateTimeImmutable;
use PDO;

final class PdoOfferingLetterRepository implements OfferingLetterRepository
{
    private const FMT = 'Y-m-d H:i:s';

    public function __construct(private PDO $pdo) {}

    public function find(int $id): ?OfferingLetter
    {
        $st = $this->pdo->prepare('SELECT * FROM offering_letters WHERE id = ? LIMIT 1');
        $st->execute([$id]);
        $row = $st->fetch(PDO::FETCH_ASSOC);

        return $row !== false ? $this->hydrate($row) : null;
    }

    public function findByApplicant(int $applicantId): ?OfferingLetter
    {
        $st = $this->pdo->prepare('SELECT * FROM offering_letters WHERE applicant_id = ? LIMIT 1');
        $st->execute([$applicantId]);
        $row = $st->fetch(PDO::FETCH_ASSOC);

        return $row !== false ? $this->hydrate($row) : null;
    }

    /** @return OfferingLetter[] */
    public function findPendingForCeo(): array
    {
        $st = $this->pdo->prepare(
            "SELECT * FROM offering_letters WHERE status IN ('pending_ceo','revision') ORDER BY updated_at DESC",
        );
        $st->execute();

        return array_map(fn (array $r) => $this->hydrate($r), $st->fetchAll(PDO::FETCH_ASSOC));
    }

    /** @return OfferingLetter[] */
    public function findByDraftedBy(int $userId): array
    {
        $st = $this->pdo->prepare(
            'SELECT * FROM offering_letters WHERE drafted_by = ? ORDER BY updated_at DESC',
        );
        $st->execute([$userId]);

        return array_map(fn (array $r) => $this->hydrate($r), $st->fetchAll(PDO::FETCH_ASSOC));
    }

    public function findByToken(string $token): ?OfferingLetter
    {
        $st = $this->pdo->prepare('SELECT * FROM offering_letters WHERE response_token = ? LIMIT 1');
        $st->execute([$token]);
        $row = $st->fetch(PDO::FETCH_ASSOC);

        return $row !== false ? $this->hydrate($row) : null;
    }

    public function save(OfferingLetter $ol): void
    {
        if ($ol->id() === null) {
            $st = $this->pdo->prepare(
                'INSERT INTO offering_letters
                    (applicant_id, drafted_by, approved_by, position, salary, start_date, body,
                     status, revision_comment, response_token, sent_at, respond_before, responded_at,
                     created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            );
            $st->execute([
                $ol->applicantId(),
                $ol->draftedBy(),
                $ol->approvedBy(),
                $ol->position(),
                $ol->salary(),
                $ol->startDate()?->format('Y-m-d'),
                $ol->body(),
                $ol->status()->value,
                $ol->revisionComment(),
                $ol->responseToken(),
                $ol->sentAt()?->format(self::FMT),
                $ol->respondBefore()?->format(self::FMT),
                $ol->respondedAt()?->format(self::FMT),
                $ol->createdAt()->format(self::FMT),
                $ol->updatedAt()->format(self::FMT),
            ]);
            $ol->assignId((int) $this->pdo->lastInsertId());
        } else {
            $st = $this->pdo->prepare(
                'UPDATE offering_letters
                 SET approved_by = ?, position = ?, salary = ?, start_date = ?, body = ?,
                     status = ?, revision_comment = ?, response_token = ?,
                     sent_at = ?, respond_before = ?, responded_at = ?, updated_at = ?
                 WHERE id = ?',
            );
            $st->execute([
                $ol->approvedBy(),
                $ol->position(),
                $ol->salary(),
                $ol->startDate()?->format('Y-m-d'),
                $ol->body(),
                $ol->status()->value,
                $ol->revisionComment(),
                $ol->responseToken(),
                $ol->sentAt()?->format(self::FMT),
                $ol->respondBefore()?->format(self::FMT),
                $ol->respondedAt()?->format(self::FMT),
                $ol->updatedAt()->format(self::FMT),
                $ol->id(),
            ]);
        }
    }

    /** @param array<string,mixed> $r */
    private function hydrate(array $r): OfferingLetter
    {
        return OfferingLetter::reconstitute(
            (int) $r['id'],
            (int) $r['applicant_id'],
            (int) $r['drafted_by'],
            $r['approved_by'] !== null ? (int) $r['approved_by'] : null,
            (string) $r['position'],
            (float) $r['salary'],
            $r['start_date'] !== null ? new DateTimeImmutable((string) $r['start_date']) : null,
            (string) $r['body'],
            OfferingLetterStatus::from((string) $r['status']),
            isset($r['revision_comment']) ? (string) $r['revision_comment'] : null,
            isset($r['response_token']) ? (string) $r['response_token'] : null,
            $r['sent_at'] !== null ? new DateTimeImmutable((string) $r['sent_at']) : null,
            $r['respond_before'] !== null ? new DateTimeImmutable((string) $r['respond_before']) : null,
            $r['responded_at'] !== null ? new DateTimeImmutable((string) $r['responded_at']) : null,
            new DateTimeImmutable((string) $r['created_at']),
            new DateTimeImmutable((string) $r['updated_at']),
        );
    }
}
