<?php
declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Domain\Recruitment\Applicant;
use App\Domain\Recruitment\ApplicantRepository;
use App\Domain\Recruitment\ApplicantStatus;
use DateTimeImmutable;
use PDO;
use Throwable;

final class PdoApplicantRepository implements ApplicantRepository
{
    private const FMT = 'Y-m-d H:i:s';

    public function __construct(private PDO $pdo) {}

    public function save(Applicant $a): void
    {
        if ($a->id() === null) {
            $st = $this->pdo->prepare(
                'INSERT INTO applicants
                    (vacancy_id, full_name, email, phone, cv_path, portfolio_path,
                     consent_at, status, screened_by, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            );
            $st->execute([
                $a->vacancyId(), $a->fullName(), $a->email(), $a->phone(),
                $a->cvPath(), $a->portfolioPath(),
                $a->consentAt()->format(self::FMT),
                $a->status()->value,
                $a->screenedBy(),
                $a->createdAt()->format(self::FMT),
                $a->updatedAt()->format(self::FMT),
            ]);
            $a->assignId((int) $this->pdo->lastInsertId());
        } else {
            $st = $this->pdo->prepare(
                'UPDATE applicants SET status = ?, screened_by = ?, updated_at = ? WHERE id = ?',
            );
            $st->execute([
                $a->status()->value,
                $a->screenedBy(),
                $a->updatedAt()->format(self::FMT),
                $a->id(),
            ]);
        }
    }

    public function find(int $id): ?Applicant
    {
        $st = $this->pdo->prepare('SELECT * FROM applicants WHERE id = ? LIMIT 1');
        $st->execute([$id]);
        $row = $st->fetch();

        return $row !== false ? $this->hydrate($row) : null;
    }

    /** @return Applicant[] */
    public function findByVacancy(int $vacancyId): array
    {
        $st = $this->pdo->prepare(
            'SELECT * FROM applicants WHERE vacancy_id = ? ORDER BY created_at ASC',
        );
        $st->execute([$vacancyId]);

        return array_map(fn (array $r) => $this->hydrate($r), $st->fetchAll());
    }

    public function existsByEmailAndVacancy(string $email, int $vacancyId): bool
    {
        $st = $this->pdo->prepare(
            'SELECT 1 FROM applicants WHERE email = ? AND vacancy_id = ? LIMIT 1',
        );
        $st->execute([$email, $vacancyId]);

        return $st->fetch() !== false;
    }

    public function delete(int $id): void
    {
        $this->pdo->prepare('DELETE FROM applicants WHERE id = ?')->execute([$id]);
    }

    public function saveFormToken(int $applicantId, string $token, DateTimeImmutable $expiresAt): void
    {
        $st = $this->pdo->prepare(
            'INSERT INTO applicant_forms (applicant_id, token, expires_at)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at)',
        );
        $st->execute([$applicantId, $token, $expiresAt->format(self::FMT)]);
    }

    /** @param array<string,mixed> $r */
    private function hydrate(array $r): Applicant
    {
        return Applicant::reconstitute(
            (int) $r['id'],
            (int) $r['vacancy_id'],
            (string) $r['full_name'],
            (string) $r['email'],
            (string) $r['phone'],
            (string) $r['cv_path'],
            $r['portfolio_path'] !== null ? (string) $r['portfolio_path'] : null,
            new DateTimeImmutable((string) $r['consent_at']),
            ApplicantStatus::from((string) $r['status']),
            $r['screened_by'] !== null ? (int) $r['screened_by'] : null,
            new DateTimeImmutable((string) $r['created_at']),
            new DateTimeImmutable((string) $r['updated_at']),
        );
    }
}
