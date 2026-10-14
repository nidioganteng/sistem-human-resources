<?php
declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Domain\Identity\DivisionType;
use App\Domain\Identity\Role;
use App\Domain\Recruitment\ApprovalAction;
use App\Domain\Recruitment\ApprovalEntry;
use App\Domain\Recruitment\EmploymentStatus;
use App\Domain\Recruitment\Mrf;
use App\Domain\Recruitment\MrfRepository;
use App\Domain\Recruitment\MrfSpec;
use App\Domain\Recruitment\MrfStatus;
use App\Domain\Recruitment\SelectionTrack;
use DateTimeImmutable;
use PDO;
use Throwable;

final class PdoMrfRepository implements MrfRepository
{
    private const FMT = 'Y-m-d H:i:s';

    public function __construct(private PDO $pdo) {}

    public function save(Mrf $m): void
    {
        $this->pdo->beginTransaction();
        try {
            $s = $m->spec();

            if ($m->id() === null) {
                $st = $this->pdo->prepare(
                    'INSERT INTO mrfs (requester_id, requester_role, division, division_type, position, responsibilities,
                        education, skills, experience, headcount, employment_status, selection_track, status, created_at, updated_at)
                     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
                );
                $st->execute([
                    $m->requesterId(), $m->requesterRole()->value, $m->division(), $m->divisionType()->value,
                    $s->position, $s->responsibilities, $s->education, $s->skills, $s->experience, $s->headcount,
                    $s->employmentStatus->value, $s->selectionTrack->value, $m->status()->value,
                    $m->createdAt()->format(self::FMT), $m->updatedAt()->format(self::FMT),
                ]);
                $id   = (int) $this->pdo->lastInsertId();
                $code = sprintf('MRF/%s/%04d', $m->createdAt()->format('Y'), $id);
                $this->pdo->prepare('UPDATE mrfs SET code = ? WHERE id = ?')->execute([$code, $id]);
                $m->assignIdentity($id, $code);
            } else {
                $st = $this->pdo->prepare(
                    'UPDATE mrfs SET position=?, responsibilities=?, education=?, skills=?, experience=?, headcount=?,
                        employment_status=?, selection_track=?, status=?, updated_at=? WHERE id=?'
                );
                $st->execute([
                    $s->position, $s->responsibilities, $s->education, $s->skills, $s->experience, $s->headcount,
                    $s->employmentStatus->value, $s->selectionTrack->value, $m->status()->value,
                    $m->updatedAt()->format(self::FMT), $m->id(),
                ]);
            }

            $ins = $this->pdo->prepare(
                'INSERT INTO mrf_approvals (mrf_id, actor_id, actor_role, action, comment, from_status, to_status, created_at)
                 VALUES (?,?,?,?,?,?,?,?)'
            );
            foreach ($m->pullNewEntries() as $e) {
                $ins->execute([
                    $m->id(), $e->actorId, $e->actorRole->value, $e->action->value, $e->comment,
                    $e->fromStatus->value, $e->toStatus->value, $e->createdAt->format(self::FMT),
                ]);
            }

            $this->pdo->commit();
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    public function find(int $id): ?Mrf
    {
        $st = $this->pdo->prepare(
            'SELECT m.*, u.name AS requester_name FROM mrfs m JOIN users u ON u.id = m.requester_id WHERE m.id = ? LIMIT 1'
        );
        $st->execute([$id]);
        $row = $st->fetch();
        if ($row === false) {
            return null;
        }

        $h = $this->pdo->prepare(
            'SELECT a.*, u.name AS actor_name FROM mrf_approvals a JOIN users u ON u.id = a.actor_id
             WHERE a.mrf_id = ? ORDER BY a.id ASC'
        );
        $h->execute([$id]);
        $history = array_map(fn (array $r) => new ApprovalEntry(
            (int) $r['actor_id'], (string) $r['actor_name'], Role::from((string) $r['actor_role']),
            ApprovalAction::from((string) $r['action']), $r['comment'] !== null ? (string) $r['comment'] : null,
            MrfStatus::from((string) $r['from_status']), MrfStatus::from((string) $r['to_status']),
            new DateTimeImmutable((string) $r['created_at']),
        ), $h->fetchAll());

        return $this->hydrate($row, $history);
    }

    public function findAll(): array
    {
        $rows = $this->pdo->query(
            'SELECT m.*, u.name AS requester_name FROM mrfs m JOIN users u ON u.id = m.requester_id
             ORDER BY m.updated_at DESC, m.id DESC'
        )->fetchAll();

        return array_map(fn (array $r) => $this->hydrate($r, []), $rows);
    }

    /**
     * @param array<string,mixed>  $r
     * @param ApprovalEntry[]      $history
     */
    private function hydrate(array $r, array $history): Mrf
    {
        return Mrf::reconstitute(
            (int) $r['id'], (string) $r['code'], (int) $r['requester_id'], (string) $r['requester_name'],
            Role::from((string) $r['requester_role']), (string) $r['division'],
            DivisionType::from((string) $r['division_type']),
            new MrfSpec(
                (string) $r['position'], (string) $r['responsibilities'], (string) $r['education'],
                (string) $r['skills'], (string) $r['experience'], (int) $r['headcount'],
                EmploymentStatus::from((string) $r['employment_status']),
                SelectionTrack::from((string) $r['selection_track']),
            ),
            MrfStatus::from((string) $r['status']),
            new DateTimeImmutable((string) $r['created_at']),
            new DateTimeImmutable((string) $r['updated_at']),
            $history,
        );
    }
}
