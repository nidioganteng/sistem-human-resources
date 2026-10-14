<?php
declare(strict_types=1);

namespace App\Infrastructure\Security;

use App\Application\Ports\TokenService;

/** JWT HS256 tanpa library eksternal (tidak perlu Composer di Hostinger). */
final class JwtTokenService implements TokenService
{
    public function __construct(private string $secret, private int $ttlSeconds)
    {
        if (strlen($secret) < 32) {
            throw new \RuntimeException('JWT_SECRET minimal 32 karakter.');
        }
    }

    public function issue(int $userId): string
    {
        $now     = time();
        $header  = $this->b64(json_encode(['alg' => 'HS256', 'typ' => 'JWT'], JSON_THROW_ON_ERROR));
        $payload = $this->b64(json_encode(['sub' => $userId, 'iat' => $now, 'exp' => $now + $this->ttlSeconds], JSON_THROW_ON_ERROR));

        return "$header.$payload." . $this->sign("$header.$payload");
    }

    public function verify(string $token): ?int
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }
        [$header, $payload, $sig] = $parts;

        if (!hash_equals($this->sign("$header.$payload"), $sig)) {
            return null;
        }

        $head = json_decode((string) base64_decode(strtr($header, '-_', '+/')), true);
        if (!is_array($head) || ($head['alg'] ?? null) !== 'HS256') {
            return null;
        }

        $data = json_decode((string) base64_decode(strtr($payload, '-_', '+/')), true);
        if (!is_array($data) || !isset($data['sub'], $data['exp']) || (int) $data['exp'] < time()) {
            return null;
        }

        return (int) $data['sub'];
    }

    private function sign(string $data): string
    {
        return $this->b64(hash_hmac('sha256', $data, $this->secret, true));
    }

    private function b64(string $raw): string
    {
        return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
    }
}
