<?php
declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Application\Ports\AuditLog;
use DateTimeImmutable;
use PDO;
use App\Infrastructure\Security\DataCipher;

final class PdoAuditLog implements AuditLog
{
    private const FMT = 'Y-m-d H:i:s';

    public function __construct(private PDO $pdo, private DataCipher $cipher) {}

    public function log(
        int $actorId,
        string $entity,
        int $entityId,
        string $action,
        array $oldValues,
        array $newValues,
    ): void {
        $st = $this->pdo->prepare(
            'INSERT INTO audit_logs (actor_id, entity, entity_id, action, old_values, new_values, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)',
        );
        $st->execute([
            $actorId,
            $entity,
            $entityId,
            $action,
            json_encode(['encrypted' => $this->cipher->encrypt($oldValues)], JSON_THROW_ON_ERROR),
            json_encode(['encrypted' => $this->cipher->encrypt($newValues)], JSON_THROW_ON_ERROR),
            (new DateTimeImmutable())->format(self::FMT),
        ]);
    }
}
