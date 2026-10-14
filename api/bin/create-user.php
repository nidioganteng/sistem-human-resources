<?php
declare(strict_types=1);

// Membuat akun dari terminal (SSH). Contoh:
//   php api/bin/create-user.php --email=ceo@perusahaan.com --name="Nama CEO" --role=super_admin
//   php api/bin/create-user.php --email=a@x.com --name="Budi" --role=manajer --division=Sipil --type=teknis
// Password diminta saat dijalankan (tidak tampil di layar, tidak masuk riwayat shell).

if (PHP_SAPI !== 'cli') {
    exit('CLI only');
}

define('APP_ENTRY', true);
require dirname(__DIR__) . '/src/bootstrap.php';

use App\Domain\Identity\DivisionType;
use App\Domain\Identity\Role;
use App\Infrastructure\Persistence\Database;
use App\Infrastructure\Security\NativePasswordHasher;

$o = getopt('', ['email:', 'name:', 'role:', 'division::', 'type::']);
$email = mb_strtolower(trim((string) ($o['email'] ?? '')));
$name  = trim((string) ($o['name'] ?? ''));
$role  = Role::tryFrom((string) ($o['role'] ?? ''));
$div   = isset($o['division']) ? trim((string) $o['division']) : null;
$type  = isset($o['type']) ? DivisionType::tryFrom((string) $o['type']) : null;

if ($email === '' || $name === '' || $role === null) {
    fwrite(STDERR, "Wajib: --email --name --role=" . implode('|', array_map(fn ($r) => $r->value, Role::cases())) . "\n");
    exit(1);
}
if (in_array($role, [Role::Manajer, Role::Pic], true) && ($div === null || $div === '' || $type === null)) {
    fwrite(STDERR, "Manajer dan PIC wajib --division=NAMA --type=teknis|non_teknis\n");
    exit(1);
}

fwrite(STDOUT, 'Password (min. 10 karakter): ');
system('stty -echo 2>/dev/null');
$pw = trim((string) fgets(STDIN));
system('stty echo 2>/dev/null');
fwrite(STDOUT, "\n");
if (strlen($pw) < 10) {
    fwrite(STDERR, "Password terlalu pendek.\n");
    exit(1);
}

$pdo = Database::connect();
$st  = $pdo->prepare('INSERT INTO users (name, email, password_hash, role, division, division_type) VALUES (?,?,?,?,?,?)');
$st->execute([$name, $email, (new NativePasswordHasher())->hash($pw), $role->value, $div, $type?->value]);
fwrite(STDOUT, "Akun dibuat: $email ({$role->label()})\n");
