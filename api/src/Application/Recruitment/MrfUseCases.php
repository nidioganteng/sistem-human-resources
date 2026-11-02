<?php
declare(strict_types=1);

namespace App\Application\Recruitment;

use App\Domain\Identity\User;
use App\Application\Workforce\Notifications;
use App\Application\Ports\WorkforceStore;
use App\Domain\Recruitment\Mrf;
use App\Domain\Recruitment\MrfRepository;
use App\Domain\Recruitment\MrfSpec;
use App\Domain\Shared\NotFound;

/**
 * Kumpulan use case MRF. Setiap method = satu aksi pengguna.
 * Aturan bisnis ada di aggregate Mrf; kelas ini hanya mengoordinasikan.
 */
final class MrfUseCases
{
    public function __construct(private MrfRepository $mrfs, private Notifications $notifications, private WorkforceStore $store) {}

    /** @return array<int,array<string,mixed>> */
    public function list(User $actor, ?string $status = null): array
    {
        $out = [];
        foreach ($this->mrfs->findAll() as $m) {
            if (!$m->canBeViewedBy($actor)) {
                continue;
            }
            if ($status !== null && $status !== '' && $m->status()->value !== $status) {
                continue;
            }
            $out[] = MrfView::from($m, $actor);
        }

        return $out;
    }

    /** @return array<string,mixed> */
    public function get(User $actor, int $id): array
    {
        return MrfView::from($this->load($actor, $id), $actor, true);
    }

    /**
     * @param array<string,mixed> $input
     * @return array<string,mixed>
     */
    public function create(User $actor, array $input, bool $submitNow): array
    {
        return $this->store->transaction(function () use ($actor,$input,$submitNow): array {
        $mrf = Mrf::create($actor, MrfSpec::fromInput($input));
        $this->mrfs->save($mrf);

        if ($submitNow) {
            $mrf->submit($actor);
            $this->mrfs->save($mrf);
            $this->notifyStatus($mrf);
        }

        return MrfView::from($this->load($actor, (int) $mrf->id()), $actor, true);
        });
    }

    /**
     * @param array<string,mixed> $input
     * @return array<string,mixed>
     */
    public function update(User $actor, int $id, array $input, bool $submitNow): array
    {
        return $this->store->transaction(function () use ($actor,$id,$input,$submitNow): array {
        $this->store->find('mrfs',$id,true);
        $mrf = $this->load($actor, $id);
        $mrf->updateSpec($actor, MrfSpec::fromInput($input));
        if ($submitNow) {
            $mrf->submit($actor);
        }
        $this->mrfs->save($mrf);
        if ($submitNow) $this->notifyStatus($mrf);

        return MrfView::from($this->load($actor, $id), $actor, true);
        });
    }

    /** @return array<string,mixed> */
    public function submit(User $actor, int $id): array
    {
        return $this->act($actor, $id, static fn (Mrf $m) => $m->submit($actor));
    }

    /** @return array<string,mixed> */
    public function approve(User $actor, int $id, ?string $comment): array
    {
        return $this->act($actor, $id, static fn (Mrf $m) => $m->approve($actor, $comment));
    }

    /** @return array<string,mixed> */
    public function requestRevision(User $actor, int $id, string $comment): array
    {
        return $this->act($actor, $id, static fn (Mrf $m) => $m->requestRevision($actor, $comment));
    }

    /** @return array<string,mixed> */
    public function cancel(User $actor, int $id): array
    {
        return $this->act($actor, $id, static fn (Mrf $m) => $m->cancel($actor));
    }

    /** @return array<string,mixed> */
    public function recall(User $actor, int $id): array
    {
        return $this->act($actor, $id, static fn (Mrf $m) => $m->recall($actor));
    }

    // ──

    private function load(User $actor, int $id): Mrf
    {
        $mrf = $this->mrfs->find($id);
        // Pengguna yang tidak boleh melihat MRF diberi 404, bukan 403, agar keberadaannya tidak bocor.
        if ($mrf === null || !$mrf->canBeViewedBy($actor)) {
            throw new NotFound('MRF tidak ditemukan.');
        }

        return $mrf;
    }

    /** @return array<string,mixed> */
    private function act(User $actor, int $id, callable $change): array
    {
        return $this->store->transaction(function () use ($actor,$id,$change): array {
        $this->store->find('mrfs',$id,true);
        $mrf = $this->load($actor, $id);
        $change($mrf);
        $this->mrfs->save($mrf);
        $this->notifyStatus($mrf);
        return MrfView::from($this->load($actor, $id), $actor, true);
        });
    }
    private function notifyStatus(Mrf $mrf): void
    {
        $id = (int) $mrf->id();
        if ($mrf->status()->value==='revision') {
            $history=$mrf->history(); $entry=end($history);
            $this->notifications->toUser($mrf->requesterId(),'mrf_revision','MRF perlu revisi',['mrfId'=>$id,'message'=>$entry ? $entry->comment : '']);
        }
        elseif ($mrf->status()->value==='approved') $this->notifications->toRoles(['hr'],'mrf_approved','MRF disetujui CEO',['mrfId'=>$id,'message'=>$mrf->spec()->position]);
        elseif ($mrf->status()->value==='pending_ceo') $this->notifications->toRoles(['super_admin'],'mrf_approval','MRF menunggu persetujuan',['mrfId'=>$id,'message'=>$mrf->spec()->position]);
        elseif ($mrf->status()->value==='pending_manager') $this->notifications->toRoles(['manajer'],'mrf_approval','MRF menunggu persetujuan',['mrfId'=>$id,'message'=>$mrf->spec()->position],$mrf->division());
    }

}
