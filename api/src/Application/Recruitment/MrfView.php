<?php
declare(strict_types=1);

namespace App\Application\Recruitment;

use App\Domain\Identity\User;
use App\Domain\Recruitment\Mrf;

/** Bentuk MRF untuk dikirim ke browser, termasuk hak aksi pengguna yang sedang login. */
final class MrfView
{
    /** @return array<string,mixed> */
    public static function from(Mrf $m, User $actor, bool $withHistory = false): array
    {
        $s = $m->spec();

        $data = [
            'id'               => $m->id(),
            'code'             => $m->code(),
            'status'           => $m->status()->value,
            'statusLabel'      => $m->status()->label(),
            'position'         => $s->position,
            'responsibilities' => $s->responsibilities,
            'education'        => $s->education,
            'skills'           => $s->skills,
            'experience'       => $s->experience,
            'headcount'        => $s->headcount,
            'employmentStatus' => $s->employmentStatus->value,
            'selectionTrack'   => $s->selectionTrack->value,
            'division'         => $m->division(),
            'divisionType'     => $m->divisionType()->value,
            'requester'        => [
                'id'        => $m->requesterId(),
                'name'      => $m->requesterName(),
                'role'      => $m->requesterRole()->value,
                'roleLabel' => $m->requesterRole()->label(),
            ],
            'createdAt'        => $m->createdAt()->format(DATE_ATOM),
            'updatedAt'        => $m->updatedAt()->format(DATE_ATOM),
            'canEdit'          => $m->canBeEditedBy($actor),
            'canDecide'        => $m->canBeDecidedBy($actor),
            'canRecall'        => $m->canBeRecalledBy($actor),
            'needsMyAction'    => $m->needsActionFrom($actor),
        ];

        if ($withHistory) {
            $data['history'] = array_map(static fn ($e) => [
                'actorName'   => $e->actorName,
                'actorRole'   => $e->actorRole->value,
                'roleLabel'   => $e->actorRole->label(),
                'action'      => $e->action->value,
                'actionLabel' => $e->action->label(),
                'comment'     => $e->comment,
                'fromStatus'  => $e->fromStatus->value,
                'toStatus'    => $e->toStatus->value,
                'toLabel'     => $e->toStatus->label(),
                'createdAt'   => $e->createdAt->format(DATE_ATOM),
            ], $m->history());
        }

        return $data;
    }
}
