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
                    (vacancy_id, full_name, email, phone, cv_path, portfolio_path, message,
                     consent_at, status, screened_by, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            );
            $st->execute([
                $a->vacancyId(), $a->fullName(), $a->email(), $a->phone(),
                $a->cvPath(), $a->portfolioPath(), $a->message(),
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
        $this->pdo->prepare('DELETE FROM applicant_forms WHERE applicant_id = ?')->execute([$id]);
        $this->pdo->prepare('DELETE FROM offering_letters WHERE applicant_id = ?')->execute([$id]);
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

    /**
     * @return array{applicant_id:int,expires_at:string,submitted_at:string|null}|null
     */
    public function findFormByToken(string $token): ?array
    {
        $st = $this->pdo->prepare(
            'SELECT applicant_id, expires_at, submitted_at
             FROM applicant_forms WHERE token = ? LIMIT 1',
        );
        $st->execute([$token]);
        $row = $st->fetch(PDO::FETCH_ASSOC);

        if ($row === false) {
            return null;
        }

        return [
            'applicant_id' => (int) $row['applicant_id'],
            'expires_at'   => (string) $row['expires_at'],
            'submitted_at' => isset($row['submitted_at']) ? (string) $row['submitted_at'] : null,
        ];
    }

    public function submitForm(
        int $applicantId,
        string $data,
        float $expectedSalary,
        ?string $photoPath,
        ?string $signaturePath,
    ): void {
        $now = (new DateTimeImmutable())->format(self::FMT);

        $st = $this->pdo->prepare(
            'UPDATE applicant_forms
             SET submitted_at = ?, data = ?, expected_salary = ?, photo_path = ?, signature_path = ?
             WHERE applicant_id = ?',
        );
        $st->execute([$now, $data, $expectedSalary, $photoPath, $signaturePath, $applicantId]);

        $st2 = $this->pdo->prepare(
            'UPDATE applicants SET status = ?, updated_at = ? WHERE id = ?',
        );
        $st2->execute([ApplicantStatus::FormSubmitted->value, $now, $applicantId]);
    }

    /**
     * @return array{data:string,expected_salary:float,photo_path:string|null,signature_path:string|null,submitted_at:string}|null
     */
    public function findFormData(int $applicantId): ?array
    {
        $st = $this->pdo->prepare(
            'SELECT data, expected_salary, photo_path, signature_path, submitted_at
             FROM applicant_forms
             WHERE applicant_id = ? AND submitted_at IS NOT NULL
             LIMIT 1',
        );
        $st->execute([$applicantId]);
        $row = $st->fetch(PDO::FETCH_ASSOC);

        if ($row === false) {
            return null;
        }

        return [
            'data'            => (string) $row['data'],
            'expected_salary' => (float) $row['expected_salary'],
            'photo_path'      => isset($row['photo_path']) ? (string) $row['photo_path'] : null,
            'signature_path'  => isset($row['signature_path']) ? (string) $row['signature_path'] : null,
            'submitted_at'    => (string) $row['submitted_at'],
        ];
    }

    public function saveSelectionRecord(
        int $applicantId,
        string $stage,
        string $result,
        ?string $notes,
        int $recordedBy,
    ): void {
        $now = (new DateTimeImmutable())->format(self::FMT);
        $st  = $this->pdo->prepare(
            'INSERT INTO applicant_selections (applicant_id, stage, result, notes, recorded_by, recorded_at)
             VALUES (?, ?, ?, ?, ?, ?)',
        );
        $st->execute([$applicantId, $stage, $result, $notes, $recordedBy, $now]);
    }

    /** @return array<int,array{id:int,stage:string,result:string,notes:string|null,recordedAt:string}> */
    public function findSelectionRecords(int $applicantId): array
    {
        $st = $this->pdo->prepare(
            'SELECT id, stage, result, notes, recorded_at
             FROM applicant_selections
             WHERE applicant_id = ?
             ORDER BY recorded_at ASC',
        );
        $st->execute([$applicantId]);

        return array_map(
            static fn (array $r) => [
                'id'         => (int) $r['id'],
                'stage'      => (string) $r['stage'],
                'result'     => (string) $r['result'],
                'notes'      => isset($r['notes']) ? (string) $r['notes'] : null,
                'recordedAt' => (string) $r['recorded_at'],
            ],
            $st->fetchAll(PDO::FETCH_ASSOC),
        );
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
            isset($r['portfolio_path']) ? (string) $r['portfolio_path'] : null,
            isset($r['message']) ? (string) $r['message'] : null,
            new DateTimeImmutable((string) $r['consent_at']),
            ApplicantStatus::from((string) $r['status']),
            $r['screened_by'] !== null ? (int) $r['screened_by'] : null,
            new DateTimeImmutable((string) $r['created_at']),
            new DateTimeImmutable((string) $r['updated_at']),
        );
    }
}
