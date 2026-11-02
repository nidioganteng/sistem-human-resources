<?php
declare(strict_types=1);
namespace App\Infrastructure\Mail;
use App\Application\Ports\{Mailer, WorkforceStore};

final class OutboxMailer implements Mailer
{
    public function __construct(private WorkforceStore $store) {}
    public function send(string $to, string $subject, string $body): void
    {
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) throw new \InvalidArgumentException('Alamat email tidak valid.');
        $now = date('Y-m-d H:i:s');
        $this->store->insert('email_outbox', [
            'recipient'=>$to, 'subject'=>$subject, 'payload'=>['body'=>$body],
            'status'=>'pending', 'attempts'=>0, 'available_at'=>$now, 'created_at'=>$now,
        ]);
    }
}
