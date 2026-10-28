<?php
declare(strict_types=1);

// php api/bin/migrate.php [--create]: schema awal + migrasi SQL berikutnya.
if (PHP_SAPI !== 'cli') {
    exit('CLI only');
}
define('APP_ENTRY', true);
require dirname(__DIR__) . '/src/bootstrap.php';

$locked = false;
try {
    $pdo = new PDO(
        sprintf('mysql:host=%s;port=%s;charset=utf8mb4', DB_HOST, DB_PORT),
        DB_USER,
        DB_PASSWORD,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    if (!preg_match('/^[a-zA-Z0-9_]+$/D', DB_NAME)) {
        throw new RuntimeException('DB_NAME hanya boleh berisi huruf, angka, dan underscore.');
    }
    if (in_array('--create', $argv, true)) {
        if (APP_ENV !== 'local') {
            throw new RuntimeException('--create hanya boleh dipakai di lingkungan local.');
        }
        $pdo->exec('CREATE DATABASE IF NOT EXISTS `' . DB_NAME . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    }
    $pdo->exec('USE `' . DB_NAME . '`');
    $lockName = 'hr_migrate_' . substr(hash('sha256', DB_NAME), 0, 40);
    $lock = $pdo->prepare('SELECT GET_LOCK(?, 0)');
    $lock->execute([$lockName]);
    $locked = (int) $lock->fetchColumn() === 1;
    if (!$locked) {
        throw new RuntimeException('Migrasi lain sedang berjalan.');
    }

    $root = dirname(__DIR__, 2) . '/database';
    $files = glob($root . '/migrations/*.sql');
    sort($files);
    // Semua perubahan ini SUDAH tercakup dalam schema.sql untuk instalasi baru.
    $baselineFiles = [
        '2026-10-13-vacancy-position-division.sql',
        '2026-10-16-applicant-selections.sql',
        '2026-10-16-applicants-add-message.sql',
        '2026-10-16-employees-onboarding-fields.sql',
        '2026-10-16-offering-letters-approved-status.sql',
        '2026-10-16-vacancies-add-archived-status.sql',
        '2026-10-17-mrf-approvals-add-recalled.sql',
    ];
    $tables = $pdo->query('SHOW FULL TABLES')->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('schema_migrations', $tables, true)) {
        if ($tables !== []) {
            throw new RuntimeException('Database berisi tabel tanpa riwayat migrasi. Dihentikan agar data lama tidak berubah; gunakan database kosong untuk setup baru.');
        }
        $pdo->exec(file_get_contents($root . '/schema.sql'));
        $pdo->exec('CREATE TABLE schema_migrations (
            name VARCHAR(190) NOT NULL PRIMARY KEY,
            checksum CHAR(64) NOT NULL,
            applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB');
        $record = $pdo->prepare('INSERT INTO schema_migrations (name, checksum) VALUES (?, ?)');
        foreach ($files as $file) {
            if (in_array(basename($file), $baselineFiles, true)) {
                $record->execute([basename($file), hash_file('sha256', $file)]);
            }
        }
        echo "Skema awal berhasil diimpor; migrasi lama dicatat sebagai baseline.\n";
    }

    $applied = $pdo->query('SELECT name, checksum FROM schema_migrations')->fetchAll(PDO::FETCH_KEY_PAIR);
    $record = $pdo->prepare('INSERT INTO schema_migrations (name, checksum) VALUES (?, ?)');
    $pending = [];
    foreach ($files as $file) {
        $name = basename($file);
        if (isset($applied[$name])) {
            if (!hash_equals($applied[$name], hash_file('sha256', $file))) {
                throw new RuntimeException("Migrasi yang sudah diterapkan berubah: {$name}. Buat file migrasi baru.");
            }
        } else {
            $pending[] = $file;
        }
    }
    foreach ($pending as $file) {
        echo 'Menerapkan ' . basename($file) . "...\n";
        $pdo->exec(file_get_contents($file));
        $record->execute([basename($file), hash_file('sha256', $file)]);
    }
    echo 'Database ' . DB_NAME . " siap. Tidak ada migrasi tertunda.\n";
} catch (Throwable $e) {
    fwrite(STDERR, 'Migrasi gagal: ' . $e->getMessage() . "\n");
    fwrite(STDERR, "DDL MySQL tidak otomatis rollback. Jika gagal di tengah jalan, periksa skema sebelum mencoba lagi.\n");
    exit(1);
} finally {
    if ($locked) {
        $pdo->prepare('SELECT RELEASE_LOCK(?)')->execute([$lockName]);
    }
}
