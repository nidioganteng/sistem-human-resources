<?php
declare(strict_types=1);

namespace App\Presentation\Http\Middleware;

use App\Application\Ports\TokenService;
use App\Domain\Identity\UserRepository;
use App\Presentation\Http\HttpException;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;

/** Memeriksa token, lalu memuat pengguna dari database di setiap permintaan (peran/status selalu terbaru). */
final class Authenticate
{
    public function __construct(private TokenService $tokens, private UserRepository $users) {}

    public function __invoke(Request $req, callable $next): Response
    {
        $token = $req->bearerToken();
        $id    = $token !== null ? $this->tokens->verify($token) : null;
        if ($id === null) {
            throw new HttpException(401, 'Sesi tidak valid atau sudah berakhir. Silakan login ulang.');
        }

        $user = $this->users->findById($id);
        if ($user === null || !$user->isActive) {
            throw new HttpException(401, 'Akun tidak aktif atau tidak ditemukan.');
        }

        $req->user = $user;

        return $next($req);
    }
}
