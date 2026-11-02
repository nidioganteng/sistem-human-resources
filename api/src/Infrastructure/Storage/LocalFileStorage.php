<?php
declare(strict_types=1);

namespace App\Infrastructure\Storage;

use App\Application\Ports\FileStorage;
use RuntimeException;
use App\Infrastructure\Security\DataCipher;

final class LocalFileStorage implements FileStorage
{
    public function __construct(private DataCipher $cipher) {}

    public function storeContent(string $category, string $extension, string $content): string
    {
        if (!preg_match('/^[a-zA-Z0-9_-]+$/D',$category) || !preg_match('/^[a-zA-Z0-9]+$/D',$extension)) throw new RuntimeException('Jalur berkas tidak valid.');
        $relative=$category . '/' . bin2hex(random_bytes(24)) . '.' . $extension;
        $path=$this->physicalPath($relative); $dir=dirname($path);
        if (!is_dir($dir) && !mkdir($dir,0700,true) && !is_dir($dir)) throw new RuntimeException('Folder penyimpanan gagal dibuat.');
        if (in_array($category,['archives','employee-docs','discipline'],true)) $content=$this->cipher->seal($content);
        if (file_put_contents($path,$content,LOCK_EX)===false) throw new RuntimeException('Berkas gagal disimpan.');
        return $relative;
    }

    public function storeUpload(string $tmpPath, string $category, string $extension): string
    {
        if (!preg_match('/^[a-zA-Z0-9_-]+$/D', $category)
            || !preg_match('/^[a-zA-Z0-9]+$/D', $extension)) {
            throw new RuntimeException('Kategori atau ekstensi berkas tidak valid.');
        }
        $relative = $category . '/' . bin2hex(random_bytes(24)) . '.' . strtolower($extension);
        $destination = $this->physicalPath($relative);
        $directory = dirname($destination);
        if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
            throw new RuntimeException('Folder penyimpanan tidak dapat dibuat.');
        }
        if (!move_uploaded_file($tmpPath, $destination)) {
            throw new RuntimeException('Berkas unggahan tidak dapat disimpan.');
        }
        if ($category === 'employee-docs' || $category === 'discipline') {
            $encrypted = $this->cipher->seal((string) file_get_contents($destination));
            if (file_put_contents($destination, $encrypted, LOCK_EX) === false) {
                @unlink($destination);
                throw new RuntimeException('Enkripsi berkas gagal.');
            }
        }
        return $relative;
    }

    public function delete(string $relativePath): void
    {
        $path = $this->physicalPath($relativePath);
        if (is_file($path) && !unlink($path)) {
            throw new RuntimeException('Berkas tidak dapat dihapus.');
        }
    }

    public function absolutePath(string $relativePath): string
    {
        $path = $this->physicalPath($relativePath);
        if (!is_file($path)) return $path;
        $h = fopen($path, 'rb'); $header = $h ? fread($h,7) : ''; if ($h) fclose($h);
        if ($header !== 'HRFILE1') return $path;
        $tmp = tempnam(sys_get_temp_dir(), 'hr_decrypt_');
        if ($tmp === false) throw new RuntimeException('Berkas sementara tidak tersedia.');
        register_shutdown_function(static fn () => is_file($tmp) && unlink($tmp));
        if (file_put_contents($tmp, $this->cipher->open((string) file_get_contents($path))) === false) {
            throw new RuntimeException('Dekripsi berkas gagal.');
        }
        return $tmp;
    }

    private function physicalPath(string $relativePath): string
    {
        if (!preg_match('~^[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$~D', $relativePath)) {
            throw new RuntimeException('Jalur berkas tidak valid.');
        }
        return rtrim(STORAGE_PATH, '/') . '/' . $relativePath;
    }
}
