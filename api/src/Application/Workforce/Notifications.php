<?php
declare(strict_types=1);
namespace App\Application\Workforce;
use App\Application\Ports\{WorkforceStore, Mailer};
use App\Domain\Identity\User;
use App\Domain\Shared\NotFound;

final class Notifications
{
    public function __construct(private WorkforceStore $store, private Mailer $mailer) {}
    public function toRoles(array $roles, string $kind, string $title, array $payload, ?string $division = null): void
    {
        foreach ($this->store->list('users', ['role'=>$roles,'is_active'=>1]) as $user) {
            if ($division !== null && $user['division'] !== $division) continue;
            $this->toUser((int)$user['id'],$kind,$title,$payload);

        }
    }
    public function toUser(int $recipientId, string $kind, string $title, array $payload): void
    {
        $user = $this->store->find('users',$recipientId);
        if (!$user || !$user['is_active']) return;
        $this->store->insert('hr_notifications',['recipient_id'=>$recipientId,'kind'=>$kind,'title'=>$title,'payload'=>$payload,'created_at'=>date('Y-m-d H:i:s')]);
        $this->mailer->send($user['email'],$title,$title . "\n\n" . ($payload['message']??'') . "\nSilakan buka sistem HR untuk meninjau.");
    }
    public function list(User $user): array { return $this->store->list('hr_notifications',['recipient_id'=>$user->id]); }
    public function read(User $user, int $id): void
    {
        $row = $this->store->find('hr_notifications',$id);
        if (!$row || (int) $row['recipient_id'] !== $user->id) throw new NotFound('Notifikasi tidak ditemukan.');
        $this->store->update('hr_notifications',$id,['read_at'=>date('Y-m-d H:i:s')]);
    }
}
