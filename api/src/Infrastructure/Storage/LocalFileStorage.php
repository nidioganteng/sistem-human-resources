<?php
declare(strict_types=1);

namespace App\Infrastructure\Storage;

use App\Application\Ports\FileStorage;
use RuntimeException;

final class LocalFileStorage implements FileStorage
{
    public function storeUpload(string $tmpPath, string $category, string $extension): string
    {
        if (!preg_match('/^[a-zA-Z0-9_-]+$/D', $category)
            || !preg_match('/^[a-zA-Z0-9]+$/D', $extension)) {
            throw new RuntimeException('Kategori atau ekstensi berkas tidak valid.');
        }
        $relative = $category . '/' . bin2hex(random_bytes(24)) . '.' . strtolower($extension);
        $destination = $this->absolutePath($relative);
        $directory = dirname($destination);
        if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
            throw new RuntimeException('Folder penyimpanan tidak dapat dibuat.');
        }
        if (!move_uploaded_file($tmpPath, $destination)) {
            throw new RuntimeException('Berkas unggahan tidak dapat disimpan.');
        }
        return $relative;
    }

    public function delete(string $relativePath): void
    {
        $path = $this->absolutePath($relativePath);
        if (is_file($path) && !unlink($path)) {
            throw new RuntimeException('Berkas tidak dapat dihapus.');
        }
    }

    public function absolutePath(string $relativePath): string
    {
        if (!preg_match('~^[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$~D', $relativePath)) {
            throw new RuntimeException('Jalur berkas tidak valid.');
        }
        return rtrim(STORAGE_PATH, '/') . '/' . $relativePath;
    }
}
