<?php
declare(strict_types=1);

namespace App\Domain\Recruitment;

use App\Domain\Shared\DomainRuleViolation;

/** Isi formulir MRF: posisi, kualifikasi, jumlah, status kerja, jalur seleksi. */
final class MrfSpec
{
    public function __construct(
        public readonly string $position,
        public readonly string $responsibilities,
        public readonly string $education,
        public readonly string $skills,
        public readonly string $experience,
        public readonly int $headcount,
        public readonly EmploymentStatus $employmentStatus,
        public readonly SelectionTrack $selectionTrack,
    ) {
        if ($this->position === '') {
            throw new DomainRuleViolation('Posisi wajib diisi.');
        }
        if ($this->responsibilities === '') {
            throw new DomainRuleViolation('Tanggung jawab utama wajib diisi.');
        }
        if ($this->education === '' || $this->skills === '' || $this->experience === '') {
            throw new DomainRuleViolation('Kualifikasi (pendidikan, kemampuan, pengalaman) wajib diisi.');
        }
        if ($this->headcount < 1 || $this->headcount > 100) {
            throw new DomainRuleViolation('Jumlah kebutuhan harus antara 1 dan 100 orang.');
        }
        if (mb_strlen($this->position) > 150) {
            throw new DomainRuleViolation('Nama posisi maksimal 150 karakter.');
        }
    }

    /** @param array<string,mixed> $in */
    public static function fromInput(array $in): self
    {
        $str = static fn (string $k): string => trim((string) ($in[$k] ?? ''));

        $status = EmploymentStatus::tryFrom($str('employmentStatus'))
            ?? throw new DomainRuleViolation('Status kerja harus PKWT atau PKWTT.');
        $track = SelectionTrack::tryFrom($str('selectionTrack'))
            ?? throw new DomainRuleViolation('Jalur seleksi harus fast atau normal.');

        return new self(
            $str('position'),
            $str('responsibilities'),
            $str('education'),
            $str('skills'),
            $str('experience'),
            (int) ($in['headcount'] ?? 0),
            $status,
            $track,
        );
    }
}
