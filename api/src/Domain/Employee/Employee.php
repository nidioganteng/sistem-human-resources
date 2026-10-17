<?php
declare(strict_types=1);

namespace App\Domain\Employee;

use App\Domain\Identity\Role;
use App\Domain\Identity\User;
use App\Domain\Shared\DomainRuleViolation;
use App\Domain\Shared\NotAllowed;
use DateTimeImmutable;

/** Entity karyawan. HR membuat, karyawan mengisi data mandiri, HR memvalidasi. */
final class Employee
{
    private function __construct(
        private ?int $id,
        private ?int $applicantId,
        private ?string $onboardingToken,
        private ?DateTimeImmutable $tokenExpiresAt,
        private ?string $nik,
        private string $fullName,
        private ?string $email,
        private ?string $phone,
        private string $position,
        private ?string $division,
        private string $employmentStatus,
        private ?float $salary,
        private ?string $contractStart,
        private ?string $contractEnd,
        private EmployeeStatus $status,
        private ?array $personalData,
        private ?DateTimeImmutable $validatedAt,
        private ?int $validatedBy,
        private DateTimeImmutable $createdAt,
        private DateTimeImmutable $updatedAt,
    ) {}

    public static function create(
        User $actor,
        string $fullName,
        string $position,
        string $division,
        string $employmentStatus,
        ?float $salary,
        ?int $applicantId,
    ): self {
        if (!$actor->hasRole(Role::Hr, Role::SuperAdmin)) {
            throw new NotAllowed('Hanya HR atau CEO yang dapat membuat data karyawan.');
        }

        $now = new DateTimeImmutable();

        return new self(
            null, $applicantId, null, null,
            null, $fullName, null, null,
            $position, $division, $employmentStatus, $salary,
            null, null,
            EmployeeStatus::Onboarding,
            null, null, null, $now, $now,
        );
    }

    public static function reconstitute(
        int $id,
        ?int $applicantId,
        ?string $onboardingToken,
        ?DateTimeImmutable $tokenExpiresAt,
        ?string $nik,
        string $fullName,
        ?string $email,
        ?string $phone,
        string $position,
        ?string $division,
        string $employmentStatus,
        ?float $salary,
        ?string $contractStart,
        ?string $contractEnd,
        EmployeeStatus $status,
        ?array $personalData,
        ?DateTimeImmutable $validatedAt,
        ?int $validatedBy,
        DateTimeImmutable $createdAt,
        DateTimeImmutable $updatedAt,
    ): self {
        return new self(
            $id, $applicantId, $onboardingToken, $tokenExpiresAt,
            $nik, $fullName, $email, $phone,
            $position, $division, $employmentStatus, $salary,
            $contractStart, $contractEnd,
            $status, $personalData,
            $validatedAt, $validatedBy, $createdAt, $updatedAt,
        );
    }

    public function generateToken(string $token, DateTimeImmutable $expiresAt): void
    {
        $this->onboardingToken = $token;
        $this->tokenExpiresAt  = $expiresAt;
        $this->updatedAt       = new DateTimeImmutable();
    }

    public function submitOnboarding(
        string $nik,
        string $email,
        string $phone,
        array $personalData,
    ): void {
        if ($this->status !== EmployeeStatus::Onboarding) {
            throw new DomainRuleViolation('Data karyawan ini sudah tidak dapat diubah lewat tautan onboarding.');
        }
        if ($this->tokenExpiresAt !== null && $this->tokenExpiresAt < new DateTimeImmutable()) {
            throw new DomainRuleViolation('Tautan onboarding sudah kedaluwarsa. Hubungi HR untuk mendapatkan tautan baru.');
        }

        $this->nik          = $nik;
        $this->email        = $email;
        $this->phone        = $phone;
        $this->personalData = $personalData;
        $this->updatedAt    = new DateTimeImmutable();
    }

    public function validate(User $actor): void
    {
        if ($actor->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat memvalidasi karyawan.');
        }
        if ($this->status !== EmployeeStatus::Onboarding) {
            throw new DomainRuleViolation('Karyawan ini sudah dalam status aktif atau tidak aktif.');
        }

        $this->status      = EmployeeStatus::Active;
        $this->validatedAt = new DateTimeImmutable();
        $this->validatedBy = $actor->id;
        $this->updatedAt   = new DateTimeImmutable();
    }

    public function updatePersonalData(
        User $actor,
        string $nik,
        string $email,
        string $phone,
        array $personalData,
    ): void {
        $this->nik          = $nik;
        $this->email        = $email;
        $this->phone        = $phone;
        $this->personalData = $personalData;
        $this->updatedAt    = new DateTimeImmutable();
    }

    public function updateContractInfo(
        string $position,
        string $division,
        string $employmentStatus,
        ?float $salary,
        ?string $contractStart,
        ?string $contractEnd,
    ): void {
        $this->position          = $position;
        $this->division          = $division;
        $this->employmentStatus  = $employmentStatus;
        $this->salary            = $salary;
        $this->contractStart     = $contractStart;
        $this->contractEnd       = $contractEnd;
        $this->updatedAt         = new DateTimeImmutable();
    }

    public function deactivate(User $actor): void
    {
        if (!$actor->hasRole(Role::Hr, Role::SuperAdmin)) {
            throw new NotAllowed('Hanya HR atau CEO yang dapat menonaktifkan karyawan.');
        }
        if ($this->status !== EmployeeStatus::Active) {
            throw new DomainRuleViolation('Hanya karyawan aktif yang dapat dinonaktifkan.');
        }

        $this->status    = EmployeeStatus::Inactive;
        $this->updatedAt = new DateTimeImmutable();
    }

    public function assignId(int $id): void { $this->id = $id; }

    public function id(): ?int { return $this->id; }
    public function applicantId(): ?int { return $this->applicantId; }
    public function onboardingToken(): ?string { return $this->onboardingToken; }
    public function tokenExpiresAt(): ?DateTimeImmutable { return $this->tokenExpiresAt; }
    public function nik(): ?string { return $this->nik; }
    public function fullName(): string { return $this->fullName; }
    public function email(): ?string { return $this->email; }
    public function phone(): ?string { return $this->phone; }
    public function position(): string { return $this->position; }
    public function division(): ?string { return $this->division; }
    public function employmentStatus(): string { return $this->employmentStatus; }
    public function salary(): ?float { return $this->salary; }
    public function contractStart(): ?string { return $this->contractStart; }
    public function contractEnd(): ?string { return $this->contractEnd; }
    public function status(): EmployeeStatus { return $this->status; }
    public function personalData(): ?array { return $this->personalData; }
    public function validatedAt(): ?DateTimeImmutable { return $this->validatedAt; }
    public function validatedBy(): ?int { return $this->validatedBy; }
    public function createdAt(): DateTimeImmutable { return $this->createdAt; }
    public function updatedAt(): DateTimeImmutable { return $this->updatedAt; }
}
