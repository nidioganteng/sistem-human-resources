<?php
declare(strict_types=1);

namespace App\Domain\Recruitment;

interface VacancyRepository
{
    public function save(Vacancy $v): void;
    public function find(int $id): ?Vacancy;
    public function findByToken(string $token): ?Vacancy;

    /** @return Vacancy[] */
    public function findAll(): array;

    /**
     * Mengembalikan vacancies beserta jumlah pelamar dan kode MRF.
     * @return array<int,array{vacancy:Vacancy,counts:array{pending:int,total:int},mrfCode:string|null}>
     */
    public function findAllWithCounts(): array;

    /**
     * @return array{vacancy:Vacancy,counts:array{pending:int,total:int},mrfCode:string|null}|null
     */
    public function findWithCounts(int $id): ?array;

    /** Cek apakah sudah ada lowongan terbuka untuk MRF ini. */
    public function hasOpenForMrf(int $mrfId): bool;

    /** Menghitung total pelamar yang masih aktif (belum dihapus) untuk lowongan ini. */
    public function countApplicants(int $vacancyId): int;

    public function delete(int $id): void;
}
