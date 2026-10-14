<?php
declare(strict_types=1);

namespace App\Application\Ports;

/**
 * Port penyimpanan berkas unggahan.
 * Berkas disimpan di STORAGE_PATH (luar public_html) agar tidak bisa diakses langsung lewat URL.
 */
interface FileStorage
{
    /**
     * Pindahkan berkas yang baru saja diunggah ke penyimpanan permanen.
     *
     * @param  string $tmpPath   Jalur sementara dari $_FILES['x']['tmp_name']
     * @param  string $category  Sub-folder tujuan, mis. 'cv' atau 'portfolio'
     * @param  string $extension Ekstensi tanpa titik, mis. 'pdf'
     * @return string            Jalur relatif dari STORAGE_PATH, mis. 'cv/abc123.pdf'
     */
    public function storeUpload(string $tmpPath, string $category, string $extension): string;

    /** Hapus berkas di jalur relatif. Diam-diam abaikan jika berkas tidak ada. */
    public function delete(string $relativePath): void;
}
