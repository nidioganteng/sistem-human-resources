<?php
declare(strict_types=1);

namespace App\Application\Identity;

use App\Application\Ports\PasswordHasher;
use App\Application\Ports\TokenService;
use App\Domain\Identity\UserRepository;
use App\Domain\Shared\NotAllowed;
use App\Domain\Shared\Unauthenticated;

final class Login
{
    // Hash palsu agar waktu respons sama baik email ada maupun tidak (cegah enumerasi akun).
    private const DUMMY_HASH = '$2y$12$t8C6//Vk1IYXFzmd6zTwaebkpswUCRgCfvnhKaKOIg7ORMe0NuG6S';

    public function __construct(
        private UserRepository $users,
        private PasswordHasher $hasher,
        private TokenService $tokens,
    ) {}

    /** @return array{token:string,user:array<string,mixed>} */
    public function execute(string $email, string $password): array
    {
        $email = mb_strtolower(trim($email));
        if ($email === '' || $password === '') {
            throw new Unauthenticated('Email dan password wajib diisi.');
        }

        $user = $this->users->findByEmail($email);
        $ok   = $this->hasher->verify($password, $user?->passwordHash ?? self::DUMMY_HASH);

        if ($user === null || !$ok) {
            throw new Unauthenticated('Email atau password salah.');
        }
        if (!$user->isActive) {
            throw new NotAllowed('Akun dinonaktifkan. Hubungi admin.');
        }

        return [
            'token' => $this->tokens->issue($user->id),
            'user'  => $user->toPublicArray(),
        ];
    }
}
