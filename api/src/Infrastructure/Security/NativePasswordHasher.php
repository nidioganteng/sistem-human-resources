<?php
declare(strict_types=1);

namespace App\Infrastructure\Security;

use App\Application\Ports\PasswordHasher;

final class NativePasswordHasher implements PasswordHasher
{
    public function hash(string $plain): string
    {
        return password_hash($plain, PASSWORD_BCRYPT, ['cost' => 12]);
    }

    public function verify(string $plain, string $hash): bool
    {
        return password_verify($plain, $hash);
    }
}
