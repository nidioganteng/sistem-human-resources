<?php
declare(strict_types=1);

if (!defined('APP_ENTRY')) {
    exit('Direct access not allowed');
}

spl_autoload_register(static function (string $class): void {
    if (!str_starts_with($class, 'App\\')) {
        return;
    }
    $file = __DIR__ . '/' . str_replace('\\', '/', substr($class, 4)) . '.php';
    if (is_file($file)) {
        require $file;
    }
});

$envFile = dirname(__DIR__) . '/config/env.php';
if (!is_file($envFile)) {
    if (PHP_SAPI !== 'cli') {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode(['message' => 'Konfigurasi server belum lengkap (api/config/env.php).']);
    exit(1);
}
require $envFile;

date_default_timezone_set('Asia/Makassar');
