<?php
declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Domain\Recruitment\Vacancy;
use App\Domain\Recruitment\VacancyRepository;
use App\Domain\Recruitment\VacancyStatus;
use DateTimeImmutable;
use PDO;
use Throwable;

final class PdoVacancyRepository implements VacancyRepository
{
    private const FMT = 'Y-m-d H:i:s';

    public function __construct(private PDO $pdo) {}

    public function save(Vacancy $v): void
    {
        if ($v->id() === null) {
            $st = $this->pdo->prepare(
                'INSERT INTO vacancies (mrf_id, position, division, public_token, status, opened_by, opened_at, closed_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            );
            $st->execute([
                $v->mrfId(), $v->position(), $v->division(),
                $v->publicToken(), $v->status()->value,
                $v->openedBy(), $v->openedAt()->format(self::FMT),
                $v->closedAt()?->format(self::FMT),
            ]);
            $v->assignId((int) $this->pdo->lastInsertId());
        } else {
            $st = $this->pdo->prepare(
                'UPDATE vacancies SET status = ?, closed_at = ? WHERE id = ?',
            );
            $st->execute([
                $v->status()->value,
                $v->closedAt()?->format(self::FMT),
                $v->id(),
            ]);
        }
    }

    public function find(int $id): ?Vacancy
    {
        $st = $this->pdo->prepare('SELECT * FROM vacancies WHERE id = ? LIMIT 1');
        $st->execute([$id]);
        $row = $st->fetch();

        return $row !== false ? $this->hydrate($row) : null;
    }

    public function findByToken(string $token): ?Vacancy
    {
        $st = $this->pdo->prepare('SELECT * FROM vacancies WHERE public_token = ? LIMIT 1');
        $st->execute([$token]);
        $row = $st->fetch();

        return $row !== false ? $this->hydrate($row) : null;
    }

    /** @return Vacancy[] */
    public function findAll(): array
    {
        $rows = $this->pdo->query(
            'SELECT * FROM vacancies ORDER BY opened_at DESC',
        )->fetchAll();

        return array_map(fn (array $r) => $this->hydrate($r), $rows);
    }

    /**
     * Mengembalikan vacancies beserta jumlah pelamar dan kode MRF.
     * Dipakai VacancyUseCases::list() dan ::get().
     *
     * @return array<int,array{vacancy:Vacancy,counts:array{pending:int,total:int},mrfCode:string|null}>
     */
    public function findAllWithCounts(): array
    {
        $rows = $this->pdo->query(
            'SELECT v.*,
                    m.code AS mrf_code,
                    (SELECT COUNT(*) FROM applicants a WHERE a.vacancy_id = v.id AND a.status = \'new\') AS pending_count,
                    (SELECT COUNT(*) FROM applicants a WHERE a.vacancy_id = v.id) AS total_count
             FROM vacancies v
             JOIN mrfs m ON m.id = v.mrf_id
             ORDER BY v.opened_at DESC',
        )->fetchAll();

        return array_map(fn (array $r) => [
            'vacancy' => $this->hydrate($r),
            'counts'  => ['pending' => (int) $r['pending_count'], 'total' => (int) $r['total_count']],
            'mrfCode' => $r['mrf_code'] ?? null,
        ], $rows);
    }

    /**
     * @return array{vacancy:Vacancy,counts:array{pending:int,total:int},mrfCode:string|null}|null
     */
    public function findWithCounts(int $id): ?array
    {
        $st = $this->pdo->prepare(
            'SELECT v.*,
                    m.code AS mrf_code,
                    (SELECT COUNT(*) FROM applicants a WHERE a.vacancy_id = v.id AND a.status = \'new\') AS pending_count,
                    (SELECT COUNT(*) FROM applicants a WHERE a.vacancy_id = v.id) AS total_count
             FROM vacancies v
             JOIN mrfs m ON m.id = v.mrf_id
             WHERE v.id = ? LIMIT 1',
        );
        $st->execute([$id]);
        $row = $st->fetch();
        if ($row === false) {
            return null;
        }

        return [
            'vacancy' => $this->hydrate($row),
            'counts'  => ['pending' => (int) $row['pending_count'], 'total' => (int) $row['total_count']],
            'mrfCode' => $row['mrf_code'] ?? null,
        ];
    }

    public function hasOpenForMrf(int $mrfId): bool
    {
        $st = $this->pdo->prepare(
            "SELECT 1 FROM vacancies WHERE mrf_id = ? AND status = 'open' LIMIT 1",
        );
        $st->execute([$mrfId]);

        return $st->fetch() !== false;
    }

    public function countApplicants(int $vacancyId): int
    {
        $st = $this->pdo->prepare('SELECT COUNT(*) FROM applicants WHERE vacancy_id = ?');
        $st->execute([$vacancyId]);

        return (int) $st->fetchColumn();
    }

    public function delete(int $id): void
    {
        $this->pdo->prepare('DELETE FROM vacancies WHERE id = ?')->execute([$id]);
    }

    /** @param array<string,mixed> $r */
    private function hydrate(array $r): Vacancy
    {
        return Vacancy::reconstitute(
            (int) $r['id'],
            (int) $r['mrf_id'],
            (string) $r['position'],
            (string) $r['division'],
            (string) $r['public_token'],
            VacancyStatus::from((string) $r['status']),
            (int) $r['opened_by'],
            new DateTimeImmutable((string) $r['opened_at']),
            $r['closed_at'] !== null ? new DateTimeImmutable((string) $r['closed_at']) : null,
        );
    }
}
