<?php
declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Domain\Identity\DivisionType;
use App\Domain\Identity\Role;
use App\Domain\Identity\User;
use App\Domain\Identity\UserRepository;
use PDO;

final class PdoUserRepository implements UserRepository
{
    public function __construct(private PDO $pdo) {}

    public function findById(int $id): ?User
    {
        $st = $this->pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
        $st->execute([$id]);

        return $this->map($st->fetch());
    }

    public function findByEmail(string $email): ?User
    {
        $st = $this->pdo->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
        $st->execute([$email]);

        return $this->map($st->fetch());
    }

    /** @param array<string,mixed>|false $r */
    private function map(array|false $r): ?User
    {
        if ($r === false) {
            return null;
        }

        return new User(
            (int) $r['id'],
            (string) $r['name'],
            (string) $r['email'],
            (string) $r['password_hash'],
            Role::from((string) $r['role']),
            $r['division'] !== null ? (string) $r['division'] : null,
            $r['division_type'] !== null ? DivisionType::from((string) $r['division_type']) : null,
            (bool) $r['is_active'],
        );
    }
}
