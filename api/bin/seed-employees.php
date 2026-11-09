<?php
declare(strict_types=1);

// Local UI demo only. Default is read-only; --apply inserts missing demo profiles.
if (PHP_SAPI !== 'cli') exit('CLI only');
define('APP_ENTRY', true);
require dirname(__DIR__) . '/src/bootstrap.php';

use App\Domain\Employee\{Employee, EmployeeRepository, EmployeeStatus};
use App\Infrastructure\Wiring;

if (!defined('APP_ENV') || APP_ENV !== 'local') {
    fwrite(STDERR, "Ditolak: data dummy hanya boleh ditambahkan pada APP_ENV=local.\n");
    exit(1);
}
if (array_diff(array_slice($argv, 1), ['--apply'])) {
    fwrite(STDERR, "Cara pakai: php api/bin/seed-employees.php [--apply]\n");
    exit(1);
}

$rows = require __DIR__ . '/fixtures/employees.php';
$container = Wiring::build();
$pdo = $container->get(PDO::class);
$repository = $container->get(EmployeeRepository::class);
$apply = in_array('--apply', $argv, true);
$created = 0;
$skipped = 0;

// Existing employees are never updated, including demo profiles already edited in the UI.
$pdo->beginTransaction();
try {
    $existing = [];
    foreach ($repository->findAll() as $employee) {
        if ($employee->email()) $existing[$employee->email()] = true;
    }
    foreach ($rows as $row) {
        if (isset($existing[$row['email']])) { $skipped++; continue; }
        if ($apply) {
            // Unvalidated fixtures exercise directory statuses without exporting demo payroll.
            $employee = Employee::reconstitute(
                0, null, null, null, $row['nik'], $row['name'], $row['email'], $row['phone'],
                $row['position'], $row['division'], $row['type'], (float) $row['salary'],
                $row['start'], $row['end'], EmployeeStatus::from($row['status']), $row['personalData'],
                null, null, new DateTimeImmutable($row['start']), new DateTimeImmutable(),
            );
            // Reserve the row with INSERT so the repository can persist its encrypted fields.
            $pdo->prepare('INSERT INTO employees (full_name,position,division,employment_status) VALUES (?,?,?,?)')
                ->execute(['Demo', $row['position'], $row['division'], $row['type']]);
            $employee->assignId((int) $pdo->lastInsertId());
            $repository->save($employee);
            $pdo->prepare('UPDATE employees SET barcode_active=0 WHERE id=?')->execute([$employee->id()]);
        }
        $created++;
    }
    if ($apply) $pdo->commit(); else $pdo->rollBack();
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $error;
}
echo ($apply ? 'Ditambahkan: ' : 'Dry run, akan ditambahkan: ') . $created . " profil demo; dilewati: {$skipped}.\n";
echo "Akun login, dokumen asli, dan data karyawan yang sudah ada tidak diubah.\n";
