<?php
declare(strict_types=1);

namespace App\Domain\Employee;

use DateTimeImmutable;

interface EmployeeRepository
{
    public function find(int $id): ?Employee;
    public function findByToken(string $token): ?Employee;

    /** @return Employee[] */
    public function findAll(?string $employmentStatus = null): array;

    public function findByApplicant(int $applicantId): ?Employee;
    public function save(Employee $e): void;

    public function saveDocument(
        int $employeeId,
        string $docType,
        string $filePath,
        DateTimeImmutable $uploadedAt,
    ): void;

    /** @return array<int,array{docType:string,filePath:string,uploadedAt:string}> */
    public function findDocuments(int $employeeId): array;

    /** @return array{docType:string,filePath:string,uploadedAt:string}|null */
    public function findDocument(int $employeeId, string $docType): ?array;

    public function deleteDocument(int $employeeId, string $docType): void;
}
