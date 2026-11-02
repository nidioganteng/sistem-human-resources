<?php
declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Domain\Employee\Employee;
use App\Domain\Employee\EmployeeRepository;
use App\Domain\Employee\EmployeeStatus;
use DateTimeImmutable;
use App\Infrastructure\Security\DataCipher;
use PDO;

final class PdoEmployeeRepository implements EmployeeRepository
{
    private const FMT = 'Y-m-d H:i:s';

    public function __construct(private PDO $pdo, private DataCipher $cipher) {}

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

        $employees = array_map(fn (array $r) => $this->hydrate($r), $st->fetchAll());
        usort($employees, static fn (Employee $a, Employee $b) => strcasecmp($a->fullName(),$b->fullName()));
        return $employees;
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
        $private = [
            'nik' => $e->nik(), 'full_name' => $e->fullName(), 'email' => $e->email(),
            'phone' => $e->phone(), 'salary' => $e->salary(), 'personal_data' => $e->personalData(),
        ];
        $values = [
            'applicant_id' => $e->applicantId(), 'onboarding_token' => $e->onboardingToken(),
            'token_expires_at' => $e->tokenExpiresAt()?->format(self::FMT),
            'nik' => null, 'full_name' => 'Terenkripsi', 'email' => null, 'phone' => null, 'personal_data' => null, 'salary' => null,
            'private_data' => $this->cipher->encrypt($private),
            'nik_hash' => $e->nik() ? $this->cipher->fingerprint($e->nik()) : null,
            'position' => $e->position(), 'division' => $e->division(), 'employment_status' => $e->employmentStatus(),
            'contract_start' => $e->contractStart(), 'contract_end' => $e->contractEnd(),
            'status' => $e->status()->value, 'validated_at' => $e->validatedAt()?->format(self::FMT),
            'validated_by' => $e->validatedBy(), 'updated_at' => $e->updatedAt()->format(self::FMT),
        ];
        if ($e->id() === null) {
            $values['created_at'] = $e->createdAt()->format(self::FMT);
            $sql = 'INSERT INTO employees (`' . implode('`,`', array_keys($values)) . '`) VALUES (' . implode(',', array_fill(0,count($values),'?')) . ')';
            $this->pdo->prepare($sql)->execute(array_values($values));
            $e->assignId((int) $this->pdo->lastInsertId());
        } else {
            $sql = 'UPDATE employees SET ' . implode(',', array_map(static fn ($key) => "`{$key}` = ?", array_keys($values))) . ' WHERE id = ?';
            $this->pdo->prepare($sql)->execute([...array_values($values), $e->id()]);
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
        if (!empty($r['private_data'])) {
            $private = $this->cipher->decrypt($r['private_data']);
            $private['personal_data'] = isset($private['personal_data']) ? json_encode($private['personal_data'], JSON_THROW_ON_ERROR) : null;
            $r = array_replace($r, $private);
        }
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
