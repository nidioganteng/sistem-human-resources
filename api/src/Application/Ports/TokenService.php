<?php
declare(strict_types=1);

namespace App\Application\Ports;

interface TokenService
{
    public function issue(int $userId): string;

    /** @return int|null id pengguna jika token sah dan belum kedaluwarsa */
    public function verify(string $token): ?int;
}
