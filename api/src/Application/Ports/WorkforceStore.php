<?php
declare(strict_types=1);
namespace App\Application\Ports;

/** Storage for workflow records. Implementations restrict writable tables and fields. */
interface WorkforceStore
{
    public function find(string $collection, int $id, bool $forUpdate = false): ?array;
    public function list(string $collection, array $filters = [], int $limit = 500): array;
    /** @return array<int,int> Warning record totals keyed by employee ID. */
    public function employeeDisciplineCounts(): array;
    public function insert(string $collection, array $values): int;
    public function update(string $collection, int $id, array $values): void;
    public function delete(string $collection, int $id): void;
    public function transaction(callable $work): mixed;
}
