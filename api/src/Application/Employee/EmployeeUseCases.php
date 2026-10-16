<?php
declare(strict_types=1);

namespace App\Application\Employee;

use App\Application\Ports\AuditLog;
use App\Application\Ports\FileStorage;
use App\Domain\Employee\Employee;
use App\Domain\Employee\EmployeeRepository;
use App\Domain\Employee\EmployeeStatus;
use App\Domain\Identity\Role;
use App\Domain\Identity\User;
use App\Domain\Shared\DomainRuleViolation;
use App\Domain\Shared\NotAllowed;
use App\Domain\Shared\NotFound;
use DateTimeImmutable;

final class EmployeeUseCases
{
    private const VALID_DOC_TYPES = ['ktp', 'npwp', 'bpjs', 'ijazah', 'foto', 'lainnya'];

    public function __construct(
        private EmployeeRepository $employees,
        private FileStorage $storage,
        private AuditLog $auditLog,
    ) {}

    /** @return array<string,mixed> */
    public function list(User $actor): array
    {
        if (!$actor->hasRole(Role::Hr, Role::SuperAdmin, Role::Manajer)) {
            throw new NotAllowed('Anda tidak memiliki akses ke daftar karyawan.');
        }

        $all = $this->employees->findAll();

        if ($actor->role === Role::Manajer) {
            $all = array_filter($all, fn (Employee $e) => $e->division() === $actor->division);
        }

        return [
            'items' => array_values(array_map(
                fn (Employee $e) => EmployeeView::from($e, $this->employees->findDocuments((int) $e->id())),
                $all,
            )),
        ];
    }

    /** @return array<string,mixed> */
    public function get(User $actor, int $id): array
    {
        $e = $this->loadVisible($actor, $id);

        return EmployeeView::from($e, $this->employees->findDocuments($id));
    }

    /** @return array<string,mixed> */
    public function create(
        User $actor,
        string $fullName,
        string $position,
        string $division,
        string $employmentStatus,
        ?float $salary,
        ?int $applicantId,
        ?string $contractStart,
        ?string $contractEnd,
    ): array {
        $e = Employee::create($actor, $fullName, $position, $division, $employmentStatus, $salary, $applicantId);

        if ($contractStart !== null || $contractEnd !== null) {
            $e->updateContractInfo($position, $division, $employmentStatus, $salary, $contractStart, $contractEnd);
        }

        $this->employees->save($e);

        return EmployeeView::from($e);
    }

    /**
     * HR membuat tautan onboarding. Token asli dikembalikan HANYA pada respons ini lewat 'onboardingUrl'.
     * EmployeeView biasa tidak menyertakan token.
     *
     * @return array<string,mixed>
     */
    public function generateOnboardingLink(User $actor, int $id, string $appBaseUrl): array
    {
        if ($actor->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat membuat tautan onboarding.');
        }

        $e = $this->employees->find($id);
        if ($e === null) {
            throw new NotFound('Karyawan tidak ditemukan.');
        }

        $token     = bin2hex(random_bytes(32));
        $expiresAt = new DateTimeImmutable('+7 days');
        $e->generateToken($token, $expiresAt);
        $this->employees->save($e);

        $url  = rtrim($appBaseUrl, '/') . '/onboarding/' . $token;
        $view = EmployeeView::from($e, $this->employees->findDocuments($id));

        $view['onboardingUrl']  = $url;
        $view['hasOnboardingToken'] = true;

        return $view;
    }

    /**
     * Endpoint publik: kembalikan info karyawan untuk formulir onboarding.
     * Tidak memerlukan autentikasi.
     *
     * @return array<string,mixed>
     */
    public function getPublic(string $token): array
    {
        $e = $this->employees->findByToken($token);
        if ($e === null) {
            throw new NotFound('Tautan tidak valid atau sudah kedaluwarsa.');
        }
        if ($e->tokenExpiresAt() !== null && $e->tokenExpiresAt() < new DateTimeImmutable()) {
            throw new NotFound('Tautan onboarding sudah kedaluwarsa. Hubungi HR untuk mendapatkan tautan baru.');
        }

        $docs = $this->employees->findDocuments((int) $e->id());

        return [
            'fullName'     => $e->fullName(),
            'position'     => $e->position(),
            'division'     => $e->division(),
            'status'       => $e->status()->value,
            'personalData' => $e->personalData(),
            'documents'    => array_map(
                static fn (array $d) => ['docType' => $d['docType']],
                $docs,
            ),
        ];
    }

    /**
     * Karyawan mengisi data teks lewat tautan onboarding (tanpa login).
     *
     * @return array<string,mixed>
     */
    public function submitOnboarding(
        string $token,
        string $nik,
        string $email,
        string $phone,
        array $personalData,
    ): array {
        $e = $this->employees->findByToken($token);
        if ($e === null) {
            throw new NotFound('Tautan tidak valid atau sudah kedaluwarsa.');
        }

        $e->submitOnboarding($nik, $email, $phone, $personalData);
        $this->employees->save($e);

        return $this->getPublic($token);
    }

    /**
     * Karyawan mengunggah berkas lewat tautan onboarding (tanpa login).
     * Controller sudah memvalidasi MIME/ukuran dan memindahkan berkas ke storage.
     */
    public function uploadDocument(string $token, string $docType, string $filePath): void
    {
        if (!in_array($docType, self::VALID_DOC_TYPES, true)) {
            throw new DomainRuleViolation('Jenis dokumen tidak valid.');
        }

        $e = $this->employees->findByToken($token);
        if ($e === null) {
            $this->storage->delete($filePath);
            throw new NotFound('Tautan tidak valid atau sudah kedaluwarsa.');
        }

        if ($e->status() !== EmployeeStatus::Onboarding) {
            $this->storage->delete($filePath);
            throw new DomainRuleViolation('Dokumen tidak dapat diunggah; karyawan sudah divalidasi.');
        }

        $existing = $this->employees->findDocument((int) $e->id(), $docType);
        if ($existing !== null) {
            $this->storage->delete($existing['filePath']);
        }

        $this->employees->saveDocument((int) $e->id(), $docType, $filePath, new DateTimeImmutable());
    }

    /** @return array<string,mixed> */
    public function validate(User $actor, int $id): array
    {
        if ($actor->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat memvalidasi karyawan.');
        }

        $e = $this->employees->find($id);
        if ($e === null) {
            throw new NotFound('Karyawan tidak ditemukan.');
        }

        $e->validate($actor);
        $this->employees->save($e);

        return EmployeeView::from($e, $this->employees->findDocuments($id));
    }

    /** @return array<string,mixed> */
    public function update(
        User $actor,
        int $id,
        string $nik,
        string $email,
        string $phone,
        string $position,
        string $division,
        string $employmentStatus,
        ?float $salary,
        ?string $contractStart,
        ?string $contractEnd,
        array $personalData,
    ): array {
        if (!$actor->hasRole(Role::Hr, Role::SuperAdmin)) {
            throw new NotAllowed('Hanya HR atau CEO yang dapat mengubah data karyawan.');
        }

        $e = $this->employees->find($id);
        if ($e === null) {
            throw new NotFound('Karyawan tidak ditemukan.');
        }

        $isAlreadyValidated = $e->validatedAt() !== null;

        if ($isAlreadyValidated) {
            $oldValues = [
                'nik'          => $e->nik(),
                'email'        => $e->email(),
                'phone'        => $e->phone(),
                'position'     => $e->position(),
                'division'     => $e->division(),
                'salary'       => $e->salary(),
                'contractStart'=> $e->contractStart(),
                'contractEnd'  => $e->contractEnd(),
                'personalData' => $e->personalData(),
            ];
        }

        $e->updatePersonalData($actor, $nik, $email, $phone, $personalData);
        $e->updateContractInfo($position, $division, $employmentStatus, $salary, $contractStart, $contractEnd);
        $this->employees->save($e);

        if ($isAlreadyValidated) {
            $newValues = [
                'nik'          => $nik,
                'email'        => $email,
                'phone'        => $phone,
                'position'     => $position,
                'division'     => $division,
                'salary'       => $salary,
                'contractStart'=> $contractStart,
                'contractEnd'  => $contractEnd,
                'personalData' => $personalData,
            ];
            $this->auditLog->log($actor->id, 'employee', $id, 'update', $oldValues, $newValues);
        }

        return EmployeeView::from($e, $this->employees->findDocuments($id));
    }

    /**
     * HR/CEO mengunduh dokumen karyawan.
     * Mengembalikan path absolut berkas di storage.
     */
    public function serveDocument(User $actor, int $id, string $docType): string
    {
        if (!$actor->hasRole(Role::Hr, Role::SuperAdmin)) {
            throw new NotAllowed('Hanya HR atau CEO yang dapat mengunduh dokumen karyawan.');
        }

        $e = $this->employees->find($id);
        if ($e === null) {
            throw new NotFound('Karyawan tidak ditemukan.');
        }

        $doc = $this->employees->findDocument($id, $docType);
        if ($doc === null) {
            throw new NotFound('Dokumen tidak ditemukan.');
        }

        return $this->storage->absolutePath($doc['filePath']);
    }

    private function loadVisible(User $actor, int $id): Employee
    {
        if (!$actor->hasRole(Role::Hr, Role::SuperAdmin, Role::Manajer)) {
            throw new NotFound('Karyawan tidak ditemukan.');
        }

        $e = $this->employees->find($id);
        if ($e === null) {
            throw new NotFound('Karyawan tidak ditemukan.');
        }

        if ($actor->role === Role::Manajer && $e->division() !== $actor->division) {
            throw new NotFound('Karyawan tidak ditemukan.');
        }

        return $e;
    }
}
