<?php
declare(strict_types=1);

// HANYA untuk laptop: mengisi 4 akun contoh dengan password yang sama. Menolak jalan jika APP_ENV bukan 'local'.
//   php api/bin/seed-dev.php

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

$pw   = 'password-dev-123';
$hash = (new NativePasswordHasher())->hash($pw);
$pdo  = Database::connect();
$st   = $pdo->prepare('INSERT IGNORE INTO users (name, email, password_hash, role, division, division_type) VALUES (?,?,?,?,?,?)');

$rows = [
    ['CEO Contoh',         'ceo@contoh.test',      'super_admin', null,      null],
    ['HR Contoh',          'hr@contoh.test',       'hr',          null,      null],
    ['Manajer Sipil',      'manajer@contoh.test',  'manajer',     'Sipil',   'teknis'],
    ['PIC Sipil',          'pic@contoh.test',      'pic',         'Sipil',   'teknis'],
    ['Manajer Keuangan',   'keuangan@contoh.test', 'manajer',     'Keuangan', 'non_teknis'],
];
foreach ($rows as [$name, $email, $role, $div, $type]) {
    $st->execute([$name, $email, $hash, $role, $div, $type]);
}
echo "Selesai. Login dengan email di atas, password: $pw\n";
