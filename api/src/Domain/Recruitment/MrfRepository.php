<?php
declare(strict_types=1);

namespace App\Domain\Recruitment;

interface MrfRepository
{
    /** Menyimpan MRF baru atau perubahan, termasuk entri riwayat baru. */
    public function save(Mrf $mrf): void;

    /** Lengkap dengan riwayat persetujuan. */
    public function find(int $id): ?Mrf;

    /** Tanpa riwayat, terbaru dulu. Filter akses dilakukan di use case. */
    public function findAll(): array;
}
