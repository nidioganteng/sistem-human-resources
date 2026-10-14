<?php
declare(strict_types=1);

namespace App\Domain\Identity;

final class User
{
    public function __construct(
        public readonly int $id,
        public readonly string $name,
        public readonly string $email,
        public readonly string $passwordHash,
        public readonly Role $role,
        public readonly ?string $division,
        public readonly ?DivisionType $divisionType,
        public readonly bool $isActive,
    ) {}

    public function hasRole(Role ...$roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    /** Data yang aman dikirim ke browser (tanpa hash password). */
    public function toPublicArray(): array
    {
        return [
            'id'           => $this->id,
            'name'         => $this->name,
            'email'        => $this->email,
            'role'         => $this->role->value,
            'roleLabel'    => $this->role->label(),
            'division'     => $this->division,
            'divisionType' => $this->divisionType?->value,
        ];
    }
}
