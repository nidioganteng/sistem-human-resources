<?php
declare(strict_types=1);

// Satu pintu masuk untuk semua permintaan /api/*
define('APP_ENTRY', true);

require __DIR__ . '/src/bootstrap.php';

App\Presentation\Http\Kernel::handle();
