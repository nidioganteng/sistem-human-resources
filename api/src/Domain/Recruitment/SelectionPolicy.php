<?php
declare(strict_types=1);
namespace App\Domain\Recruitment;

use App\Domain\Identity\{User, Role};
use App\Domain\Shared\{DomainRuleViolation, NotAllowed};

final class SelectionPolicy
{
    public static function assertCanRecord(User $actor, string $track, string $stage, array $history): void
    {
        if (!in_array($track, ['fast', 'normal'], true)) {
            throw new DomainRuleViolation('Jalur seleksi tidak ditemukan.');
        }
        if ($stage === 'interview' && !$actor->hasRole(Role::Hr, Role::SuperAdmin)) {
            throw new NotAllowed('Hanya HR atau CEO yang dapat mencatat wawancara.');
        }
        if ($stage === 'competency_test' && !$actor->hasRole(Role::Pic, Role::Manajer)) {
            throw new NotAllowed('Tes kompetensi dinilai oleh PIC atau Manajer divisi.');
        }
        if ($track === 'fast' && $stage !== 'interview') {
            throw new DomainRuleViolation('Fast Recruitment langsung ke wawancara.');
        }
        foreach ($history as $record) {
            if ($record['stage'] === $stage) {
                throw new DomainRuleViolation('Hasil tahap ini sudah dicatat.');
            }
        }
        if ($track === 'normal' && $stage === 'interview') {
            $passed = array_filter($history, static fn ($r) => $r['stage'] === 'competency_test' && $r['result'] === 'pass');
            if ($passed === []) {
                throw new DomainRuleViolation('Kandidat harus lulus tes kompetensi sebelum wawancara.');
            }
        }
    }
}
