<?php
declare(strict_types=1);

namespace App\Presentation\Http;

use App\Domain\Identity\User;

final class Request
{
    public ?User $user = null;

    /**
     * @param array<string,string>            $headers
     * @param array<string,mixed>             $query
     * @param array<string,mixed>             $body
     * @param array<string,array<string,mixed>> $files  Isi $_FILES, hanya ada untuk multipart/form-data
     */
    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $headers,
        public readonly array $query,
        public readonly array $body,
        public readonly array $files = [],
    ) {}

    public static function fromGlobals(): self
    {
        $path = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
        // Buang awalan sampai "/api" supaya rute ditulis tanpa awalan itu.
        $path = '/' . trim((string) preg_replace('#^.*?/api(?=/|$)#', '', $path), '/');

        $headers = [];
        foreach ($_SERVER as $k => $v) {
            if (str_starts_with($k, 'HTTP_')) {
                $headers[strtolower(str_replace('_', '-', substr($k, 5)))] = (string) $v;
            }
        }
        // Beberapa konfigurasi Apache/LiteSpeed tidak meneruskan Authorization lewat HTTP_*.
        if (!isset($headers['authorization'])) {
            $auth = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
            if ($auth === null && function_exists('getallheaders')) {
                foreach (getallheaders() as $k => $v) {
                    if (strtolower($k) === 'authorization') {
                        $auth = $v;
                    }
                }
            }
            if ($auth !== null) {
                $headers['authorization'] = (string) $auth;
            }
        }

        // Deteksi multipart/form-data (untuk unggah berkas publik)
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        $isMultipart = str_contains($contentType, 'multipart/form-data');

        $body  = [];
        $files = [];

        if ($isMultipart) {
            // Field teks ada di $_POST, berkas ada di $_FILES
            foreach ($_POST as $k => $v) {
                $body[$k] = is_string($v) ? trim($v) : $v;
            }
            $files = $_FILES;
        } else {
            $raw = file_get_contents('php://input');
            if ($raw !== false && $raw !== '') {
                try {
                    $decoded = json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
                } catch (\JsonException) {
                    throw new HttpException(400, 'Body permintaan bukan JSON yang valid.');
                }
                if (is_array($decoded)) {
                    $body = $decoded;
                }
            }
        }

        return new self(strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'), $path, $headers, $_GET, $body, $files);
    }

    public function bearerToken(): ?string
    {
        $h = $this->headers['authorization'] ?? '';

        return str_starts_with($h, 'Bearer ') ? trim(substr($h, 7)) : null;
    }

    public function requireUser(): User
    {
        return $this->user ?? throw new HttpException(401, 'Silakan login terlebih dahulu.');
    }
}
