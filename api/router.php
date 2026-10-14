<?php
// Router untuk PHP built-in server (hanya pengembangan lokal).
// Jalankan: php -S localhost:8001 api/router.php

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($uri === '/api' || str_starts_with($uri, '/api/')) {
    require __DIR__ . '/index.php';
    return true;
}

http_response_code(404);
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['message' => 'Gunakan npm run dev untuk frontend.']);
