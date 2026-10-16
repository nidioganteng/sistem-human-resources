<?php
declare(strict_types=1);

namespace App\Infrastructure\Mail;

use App\Application\Ports\Mailer;

/**
 * Implementasi Mailer untuk produksi menggunakan fungsi mail() bawaan PHP.
 * Konfigurasi SMTP server dilakukan di php.ini atau sendmail_path di hosting.
 * Untuk APP_ENV = 'local' tetap pakai LogMailer (lihat Wiring.php).
 */
final class SmtpMailer implements Mailer
{
    public function send(string $to, string $subject, string $body): void
    {
        $from     = defined('MAIL_FROM')      ? (string) MAIL_FROM      : 'noreply@gaharusempana.com';
        $fromName = defined('MAIL_FROM_NAME') ? (string) MAIL_FROM_NAME : 'Gaharu Sempana Group';

        $encodedName    = '=?UTF-8?B?' . base64_encode($fromName) . '?=';
        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

        $headers = implode("\r\n", [
            'From: ' . $encodedName . ' <' . $from . '>',
            'Reply-To: ' . $from,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
            'X-Mailer: PHP/' . PHP_VERSION,
        ]);

        $encodedBody = chunk_split(base64_encode($body));

        $result = mail($to, $encodedSubject, $encodedBody, $headers);

        if (!$result) {
            throw new \RuntimeException('Gagal mengirim email ke ' . $to . '.');
        }
    }
}
