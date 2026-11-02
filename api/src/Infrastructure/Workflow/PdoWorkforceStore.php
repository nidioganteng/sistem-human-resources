<?php
declare(strict_types=1);
namespace App\Infrastructure\Workflow;
use App\Application\Ports\WorkforceStore;
use App\Infrastructure\Security\DataCipher;
use PDO;

final class PdoWorkforceStore implements WorkforceStore
{
    private const FIELDS = [
        'hr_notifications' => ['recipient_id','kind','title','payload','read_at','created_at'],
        'email_outbox' => ['recipient','subject','payload','status','attempts','available_at','locked_at','last_error','sent_at','created_at'],
        'employee_change_requests' => ['employee_id','requested_by','reviewed_by','status','snapshot_hash','payload','comment','created_at','reviewed_at'],
        'employee_records' => ['employee_id','category','kind','status','payload','created_by','created_at','completed_at'],
        'talent_pool' => ['applicant_id','payload','added_by','created_at','expires_at'],
        'vacancy_archives' => ['vacancy_id','path','checksum','manifest_hash','status','created_by','created_at','purged_at'],
        'applicant_documents' => ['applicant_id','doc_type','file_path','created_at'],
        'applicants' => ['status'],
        'mrfs' => ['status'],
        'vacancies' => ['status'],
        'offering_letters' => ['applicant_id','hr_signature_path','ceo_signature_path'],
        'users' => ['signature_path'],
        'employees' => ['barcode_active'],
    ];
    public function __construct(private PDO $pdo, private DataCipher $cipher) {}
    private function table(string $name): void
    {
        if (!isset(self::FIELDS[$name])) throw new \InvalidArgumentException('Collection tidak valid.');
    }
    private function columns(string $name, array $values): array
    {
        $this->table($name);
        foreach ($values as $key => &$value) {
            if (!in_array($key, self::FIELDS[$name], true)) throw new \InvalidArgumentException('Field tidak valid: ' . $key);
            if ($key === 'payload' && is_array($value)) $value = $this->cipher->encrypt($value);
        }
        return $values;
    }
    private function decode(array $row): array
    {
        if (isset($row['payload'])) $row['payload'] = $this->cipher->decrypt($row['payload']);
        return $row;
    }
    public function find(string $collection, int $id, bool $forUpdate = false): ?array
    {
        $this->table($collection);
        $fields = $collection === 'users' ? 'id, name, email, role, division, is_active, signature_path' : '*';
        $s = $this->pdo->prepare("SELECT {$fields} FROM `{$collection}` WHERE id = ?" . ($forUpdate ? ' FOR UPDATE' : ''));
        $s->execute([$id]); $r = $s->fetch(PDO::FETCH_ASSOC);
        return $r === false ? null : $this->decode($r);
    }
    public function list(string $collection, array $filters = [], int $limit = 500): array
    {
        $this->table($collection); $where = []; $values = [];
        foreach ($filters as $key => $value) {
            $allowed = array_merge(['id'], self::FIELDS[$collection], $collection === 'users' ? ['role','is_active'] : []);
            if (!in_array($key, $allowed, true)) throw new \InvalidArgumentException('Filter tidak valid.');
            if ($value === null) { $where[] = "`{$key}` IS NULL"; }
            elseif (is_array($value)) {
                if (!$value) return [];
                $where[] = "`{$key}` IN (" . implode(',', array_fill(0,count($value),'?')) . ')';
                array_push($values, ...$value);
            } else { $where[] = "`{$key}` = ?"; $values[] = $value; }
        }
        $fields = $collection === 'users' ? 'id, name, email, role, division, is_active, signature_path' : '*';
        $sql = "SELECT {$fields} FROM `{$collection}`" . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ($collection === 'email_outbox' || $collection === 'talent_pool' ? ' ORDER BY id ASC LIMIT ' : ' ORDER BY id DESC LIMIT ') . max(1,min($limit,5000));
        $s = $this->pdo->prepare($sql); $s->execute($values);
        return array_map($this->decode(...), $s->fetchAll(PDO::FETCH_ASSOC));
    }
    public function insert(string $collection, array $values): int
    {
        $values = $this->columns($collection, $values);
        $keys = '`' . implode('`,`',array_keys($values)) . '`';
        $sql = "INSERT INTO `{$collection}` ({$keys}) VALUES (" . implode(',',array_fill(0,count($values),'?')) . ')';
        $this->pdo->prepare($sql)->execute(array_values($values));
        return (int) $this->pdo->lastInsertId();
    }
    public function update(string $collection, int $id, array $values): void
    {
        $values = $this->columns($collection, $values);
        $sets = implode(',',array_map(static fn ($key) => "`{$key}` = ?",array_keys($values)));
        $this->pdo->prepare("UPDATE `{$collection}` SET {$sets} WHERE id = ?")->execute([...array_values($values),$id]);
    }
    public function delete(string $collection, int $id): void
    {
        $this->table($collection);
        if (in_array($collection,['users','employees','vacancy_archives'],true)) throw new \LogicException('Penghapusan tidak diizinkan.');
        $this->pdo->prepare("DELETE FROM `{$collection}` WHERE id = ?")->execute([$id]);
    }
    public function transaction(callable $work): mixed
    {
        if ($this->pdo->inTransaction()) return $work();
        $this->pdo->beginTransaction();
        try { $value = $work(); $this->pdo->commit(); return $value; }
        catch (\Throwable $e) { $this->pdo->rollBack(); throw $e; }
    }
}
