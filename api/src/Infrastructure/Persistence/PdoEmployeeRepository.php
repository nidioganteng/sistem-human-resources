<?php
declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Domain\Employee\Employee;
use App\Domain\Employee\EmployeeRepository;
use App\Domain\Employee\EmployeeStatus;
use DateTimeImmutable;
use PDO;

final class PdoEmployeeRepository implements EmployeeRepository
{
    private const FMT = 'Y-m-d H:i:s';

    public function __construct(private PDO $pdo) {}

    public function find(int $id): ?Employee
    {
        $st = $this->pdo->prepare('SELECT * FROM employees WHERE id = ? LIMIT 1');
        $st->execute([$id]);
        $row = $st->fetch();

        return $row !== false ? $this->hydrate($row) : null;
    }

    public function findByToken(string $token): ?Employee
    {
        $st = $this->pdo->prepare(
            'SELECT * FROM employees WHERE onboarding_token = ? LIMIT 1',
        );
        $st->execute([$token]);
        $row = $st->fetch();

        return $row !== false ? $this->hydrate($row) : null;
    }

    /** @return Employee[] */
    public function findAll(?string $employmentStatus = null): array
    {
        if ($employmentStatus !== null) {
            $st = $this->pdo->prepare(
                'SELECT * FROM employees WHERE employment_status = ? ORDER BY full_name ASC',
            );
            $st->execute([$employmentStatus]);
        } else {
            $st = $this->pdo->prepare('SELECT * FROM employees ORDER BY full_name ASC');
            $st->execute();
        }

        return array_map(fn (array $r) => $this->hydrate($r), $st->fetchAll());
    }

    public function findByApplicant(int $applicantId): ?Employee
    {
        $st = $this->pdo->prepare('SELECT * FROM employees WHERE applicant_id = ? LIMIT 1');
        $st->execute([$applicantId]);
        $row = $st->fetch();

        return $row !== false ? $this->hydrate($row) : null;
    }

    public function save(Employee $e): void
    {
        if ($e->id() === null) {
            $st = $this->pdo->prepare(
                'INSERT INTO employees
                    (applicant_id, onboarding_token, token_expires_at, nik, full_name,
                     email, phone, personal_data, position, division, employment_status,
                     salary, contract_start, contract_end, status, validated_at,
                     validated_by, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            );
            $st->execute([
                $e->applicantId(),
                $e->onboardingToken(),
                $e->tokenExpiresAt()?->format(self::FMT),
                $e->nik(),
                $e->fullName(),
                $e->email(),
                $e->phone(),
                $e->personalData() !== null ? json_encode($e->personalData(), JSON_UNESCAPED_UNICODE) : null,
                $e->position(),
                $e->division(),
                $e->employmentStatus(),
                $e->salary(),
                $e->contractStart(),
                $e->contractEnd(),
                $e->status()->value,
                $e->validatedAt()?->format(self::FMT),
                $e->validatedBy(),
                $e->createdAt()->format(self::FMT),
                $e->updatedAt()->format(self::FMT),
            ]);
            $e->assignId((int) $this->pdo->lastInsertId());
        } else {
            $st = $this->pdo->prepare(
                'UPDATE employees SET
                    onboarding_token = ?, token_expires_at = ?,
                    nik = ?, full_name = ?, email = ?, phone = ?, personal_data = ?,
                    position = ?, division = ?, employment_status = ?, salary = ?,
                    contract_start = ?, contract_end = ?,
                    status = ?, validated_at = ?, validated_by = ?, updated_at = ?
                 WHERE id = ?',
            );
            $st->execute([
                $e->onboardingToken(),
                $e->tokenExpiresAt()?->format(self::FMT),
                $e->nik(),
                $e->fullName(),
                $e->email(),
                $e->phone(),
                $e->personalData() !== null ? json_encode($e->personalData(), JSON_UNESCAPED_UNICODE) : null,
                $e->position(),
                $e->division(),
                $e->employmentStatus(),
                $e->salary(),
                $e->contractStart(),
                $e->contractEnd(),
                $e->status()->value,
                $e->validatedAt()?->format(self::FMT),
                $e->validatedBy(),
                $e->updatedAt()->format(self::FMT),
                $e->id(),
            ]);
        }
    }

    public function saveDocument(
        int $employeeId,
        string $docType,
        string $filePath,
        DateTimeImmutable $uploadedAt,
    ): void {
        $existing = $this->findDocument($employeeId, $docType);
        if ($existing !== null) {
            $st = $this->pdo->prepare(
                'UPDATE employee_documents SET file_path = ?, uploaded_at = ?
                 WHERE employee_id = ? AND doc_type = ?',
            );
            $st->execute([$filePath, $uploadedAt->format(self::FMT), $employeeId, $docType]);
        } else {
            $st = $this->pdo->prepare(
                'INSERT INTO employee_documents (employee_id, doc_type, file_path, uploaded_at)
                 VALUES (?, ?, ?, ?)',
            );
            $st->execute([$employeeId, $docType, $filePath, $uploadedAt->format(self::FMT)]);
        }
    }

    /** @return array<int,array{docType:string,filePath:string,uploadedAt:string}> */
    public function findDocuments(int $employeeId): array
    {
        $st = $this->pdo->prepare(
            'SELECT doc_type, file_path, uploaded_at FROM employee_documents
             WHERE employee_id = ? ORDER BY uploaded_at ASC',
        );
        $st->execute([$employeeId]);

        return array_map(
            static fn (array $r) => [
                'docType'    => (string) $r['doc_type'],
                'filePath'   => (string) $r['file_path'],
                'uploadedAt' => (string) $r['uploaded_at'],
            ],
            $st->fetchAll(),
        );
    }

    /** @return array{docType:string,filePath:string,uploadedAt:string}|null */
    public function findDocument(int $employeeId, string $docType): ?array
    {
        $st = $this->pdo->prepare(
            'SELECT doc_type, file_path, uploaded_at FROM employee_documents
             WHERE employee_id = ? AND doc_type = ? LIMIT 1',
        );
        $st->execute([$employeeId, $docType]);
        $row = $st->fetch();
        if ($row === false) {
            return null;
        }

        return [
            'docType'    => (string) $row['doc_type'],
            'filePath'   => (string) $row['file_path'],
            'uploadedAt' => (string) $row['uploaded_at'],
        ];
    }

    public function deleteDocument(int $employeeId, string $docType): void
    {
        $this->pdo->prepare(
            'DELETE FROM employee_documents WHERE employee_id = ? AND doc_type = ?',
        )->execute([$employeeId, $docType]);
    }

    /** @param array<string,mixed> $r */
    private function hydrate(array $r): Employee
    {
        $personalData = null;
        if ($r['personal_data'] !== null) {
            $decoded = json_decode((string) $r['personal_data'], true);
            $personalData = is_array($decoded) ? $decoded : null;
        }

        return Employee::reconstitute(
            (int) $r['id'],
            $r['applicant_id'] !== null ? (int) $r['applicant_id'] : null,
            $r['onboarding_token'] !== null ? (string) $r['onboarding_token'] : null,
            $r['token_expires_at'] !== null ? new DateTimeImmutable((string) $r['token_expires_at']) : null,
            $r['nik'] !== null ? (string) $r['nik'] : null,
            (string) $r['full_name'],
            $r['email'] !== null ? (string) $r['email'] : null,
            $r['phone'] !== null ? (string) $r['phone'] : null,
            (string) $r['position'],
            $r['division'] !== null ? (string) $r['division'] : null,
            (string) $r['employment_status'],
            $r['salary'] !== null ? (float) $r['salary'] : null,
            $r['contract_start'] !== null ? (string) $r['contract_start'] : null,
            $r['contract_end'] !== null ? (string) $r['contract_end'] : null,
            EmployeeStatus::from((string) $r['status']),
            $personalData,
            $r['validated_at'] !== null ? new DateTimeImmutable((string) $r['validated_at']) : null,
            $r['validated_by'] !== null ? (int) $r['validated_by'] : null,
            new DateTimeImmutable((string) $r['created_at']),
            new DateTimeImmutable((string) $r['updated_at']),
        );
    }
}
