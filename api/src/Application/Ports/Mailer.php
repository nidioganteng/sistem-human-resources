<?php
declare(strict_types=1);

namespace App\Application\Ports;

/**
 * Port pengiriman email.
 * Implementasi saat ini: LogMailer (tulis ke error_log, hanya untuk APP_ENV = 'local').
 * Implementasi produksi: ganti di Wiring.php dengan SmtpMailer atau layanan transaksional.
 */
interface Mailer
{
    public function send(string $to, string $subject, string $body): void;
}
