<?php
declare(strict_types=1);

$path = dirname(__DIR__) . '/api/bin/fixtures/employees.php';
if (!is_file($path)) { fwrite(STDERR, "FAIL: employee demo fixtures are unavailable\n"); exit(1); }
$rows = require $path;
$emails = [];
$niks = [];
$types = [];
$statuses = [];
foreach ($rows as $row) {
    if (!str_ends_with($row['name'], ' (Demo)') || !str_ends_with($row['email'], '@example.test')
        || !str_starts_with($row['nik'], '000000') || strlen($row['nik']) !== 16
        || isset($emails[$row['email']]) || isset($niks[$row['nik']])
        || $row['salary'] <= 0 || $row['division'] === '' || $row['position'] === ''
        || !preg_match('/^\d{4}-\d{2}-\d{2}$/D', $row['start'])
        || ($row['end'] !== null && $row['end'] < $row['start'])) {
        throw new RuntimeException('Demo employee data must be identifiable, unique and internally consistent.');
    }
    $emails[$row['email']] = true;
    $niks[$row['nik']] = true;
    $types[$row['type']] = true;
    $statuses[$row['status']] = true;
}
foreach (['PKWT', 'PKWTT', 'FREELANCE'] as $type) {
    if (!isset($types[$type])) throw new RuntimeException('Missing employment filter scenario: ' . $type);
}
foreach (['active', 'onboarding', 'inactive'] as $status) {
    if (!isset($statuses[$status])) throw new RuntimeException('Missing activity filter scenario: ' . $status);
}
echo "PASS: identifiable demo profiles cover every employment and activity filter without duplicate identities\n";
