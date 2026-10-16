<?php
declare(strict_types=1);

namespace App\Application\Ports;

interface AuditLog
{
    public function log(
        int $actorId,
        string $entity,
        int $entityId,
        string $action,
        array $oldValues,
        array $newValues,
    ): void;
}
