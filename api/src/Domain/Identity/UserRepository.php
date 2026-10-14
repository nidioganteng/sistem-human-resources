<?php
declare(strict_types=1);

namespace App\Domain\Identity;

interface UserRepository
{
    public function findById(int $id): ?User;

    public function findByEmail(string $email): ?User;
}
