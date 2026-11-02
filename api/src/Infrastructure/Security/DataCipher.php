<?php
declare(strict_types=1);
namespace App\Infrastructure\Security;

/** AES-256-GCM authenticated encryption. Never derive this key from the JWT secret. */
final class DataCipher
{
    private string $key;
    public function __construct()
    {
        $hex = defined('DATA_ENCRYPTION_KEY') ? (string) DATA_ENCRYPTION_KEY : '';
        if (!preg_match('/^[a-f0-9]{64}$/iD', $hex)) {
            throw new \RuntimeException('DATA_ENCRYPTION_KEY harus 64 karakter hex acak.');
        }
        $this->key = hex2bin($hex);
    }
    public function fingerprint(string $value): string { return hash_hmac('sha256', $value, $this->key); }
    public function seal(string $plain): string
    {
        $iv = random_bytes(12); $tag = '';
        $data = openssl_encrypt($plain, 'aes-256-gcm', $this->key, OPENSSL_RAW_DATA, $iv, $tag);
        if ($data === false) throw new \RuntimeException('Enkripsi berkas gagal.');
        return 'HRFILE1' . $iv . $tag . $data;
    }
    public function open(string $data): string
    {
        if (!str_starts_with($data, 'HRFILE1')) return $data; // Legacy file, encrypted by maintenance command.
        if (strlen($data)<35) throw new \RuntimeException('Berkas terenkripsi tidak lengkap.');
        $plain = openssl_decrypt(substr($data,35), 'aes-256-gcm', $this->key, OPENSSL_RAW_DATA, substr($data,7,12), substr($data,19,16));
        if ($plain === false) throw new \RuntimeException('Berkas terenkripsi tidak valid.');
        return $plain;
    }
    public function encrypt(array $data): string
    {
        $iv = random_bytes(12);
        $tag = '';
        $cipher = openssl_encrypt(json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE), 'aes-256-gcm', $this->key, OPENSSL_RAW_DATA, $iv, $tag);
        if ($cipher === false) throw new \RuntimeException('Enkripsi gagal.');
        return 'v1:' . base64_encode($iv . $tag . $cipher);
    }
    public function decrypt(string $value): array
    {
        if (!str_starts_with($value, 'v1:')) throw new \RuntimeException('Format enkripsi tidak dikenal.');
        $raw = base64_decode(substr($value, 3), true);
        if ($raw === false || strlen($raw) < 28) throw new \RuntimeException('Data terenkripsi tidak valid.');
        $plain = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', $this->key, OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16));
        if ($plain === false) throw new \RuntimeException('Kunci enkripsi salah atau data berubah.');
        return json_decode($plain, true, 512, JSON_THROW_ON_ERROR);
    }
}
