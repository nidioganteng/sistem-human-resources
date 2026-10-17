<?php
declare(strict_types=1);

// HANYA untuk laptop: mengisi akun dev dengan password yang ditentukan lewat argumen.
// Menolak jalan jika APP_ENV bukan 'local'.
//
// Cara pakai:
//   php api/bin/seed-dev.php <password>
// Contoh:
//   php api/bin/seed-dev.php rahasia123

if (PHP_SAPI !== 'cli') {
    exit('CLI only');
}

define('APP_ENTRY', true);
require dirname(__DIR__) . '/src/bootstrap.php';

use App\Infrastructure\Persistence\Database;
use App\Infrastructure\Security\NativePasswordHasher;

if (!defined('APP_ENV') || APP_ENV !== 'local') {
    fwrite(STDERR, "Ditolak: seed-dev hanya boleh jalan jika APP_ENV = 'local'.\n");
    exit(1);
}

$pw = $argv[1] ?? null;
if (!$pw) {
    fwrite(STDERR, "Cara pakai: php api/bin/seed-dev.php <password>\n");
    exit(1);
}

$hash = (new NativePasswordHasher())->hash($pw);
$pdo  = Database::connect();

// Update akun lama jika masih pakai email lama
$updates = [
    ['Admin Gaharu',  'admin@gaharusempana.com',   'super_admin', 'ceo@contoh.test'],
    ['HR Gaharu',     'hr@gaharusempana.com',       'hr',          'hr@contoh.test'],
    ['Manajer Sipil', 'manajer@gaharusempana.com',  'manajer',     'manajer@contoh.test'],
    ['PIC Sipil',     'pic@gaharusempana.com',      'pic',         'pic@contoh.test'],
];
$upd = $pdo->prepare('UPDATE users SET name=?, email=?, password_hash=?, role=? WHERE email=?');
foreach ($updates as [$name, $newEmail, $role, $oldEmail]) {
    $upd->execute([$name, $newEmail, $hash, $role, $oldEmail]);
}

// Reset password semua akun @gaharusempana.com
$pdo->prepare('UPDATE users SET password_hash=? WHERE email LIKE ?')
    ->execute([$hash, '%@gaharusempana.com']);

// Insert jika belum ada (idempotent)
$st = $pdo->prepare('INSERT IGNORE INTO users (name, email, password_hash, role, division, division_type) VALUES (?,?,?,?,?,?)');
$rows = [
    ['Admin Gaharu',  'admin@gaharusempana.com',   'super_admin', null,    null],
    ['HR Gaharu',     'hr@gaharusempana.com',       'hr',          null,    null],
    ['Manajer Sipil', 'manajer@gaharusempana.com',  'manajer',     'Sipil', 'teknis'],
    ['PIC Sipil',     'pic@gaharusempana.com',      'pic',         'Sipil', 'teknis'],
];
foreach ($rows as [$name, $email, $role, $div, $type]) {
    $st->execute([$name, $email, $hash, $role, $div, $type]);
}

echo "Selesai. Email: admin/hr/manajer/pic @gaharusempana.com, password: (yang Anda masukkan)\n";
