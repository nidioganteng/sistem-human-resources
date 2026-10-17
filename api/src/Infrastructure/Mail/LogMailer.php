<?php
declare(strict_types=1);

namespace App\Infrastructure\Mail;

use App\Application\Ports\Mailer;

/**
 * Implementasi Mailer untuk APP_ENV = 'local'.
 * Menulis email ke error_log alih-alih mengirimnya sungguhan.
 * Ganti dengan SmtpMailer atau layanan transaksional di Wiring.php untuk produksi.
 */
final class LogMailer implements Mailer
{
    public function send(string $to, string $subject, string $body): void
    {
        $msg = sprintf(
            "\n[sistem-hr][email] ─────────────────────────────\nTo     : %s\nSubject: %s\n\n%s\n────────────────────────────────────────────\n",
            $to,
            $subject,
            $body,
        );
        file_put_contents('php://stderr', $msg);
    }
}
