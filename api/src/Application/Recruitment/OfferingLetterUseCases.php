<?php
declare(strict_types=1);

namespace App\Application\Recruitment;

use App\Application\Ports\FileStorage;
use App\Application\Ports\Mailer;
use App\Domain\Identity\Role;
use App\Domain\Identity\User;
use App\Domain\Identity\UserRepository;
use App\Domain\Recruitment\ApplicantRepository;
use App\Domain\Recruitment\ApplicantStatus;
use App\Domain\Recruitment\OfferingLetter;
use App\Domain\Recruitment\OfferingLetterRepository;
use App\Domain\Recruitment\OfferingLetterStatus;
use App\Domain\Recruitment\VacancyRepository;
use App\Domain\Shared\DomainRuleViolation;
use App\Domain\Shared\NotAllowed;
use App\Domain\Shared\NotFound;
use DateTimeImmutable;

final class OfferingLetterUseCases
{
    public function __construct(
        private OfferingLetterRepository $ols,
        private ApplicantRepository $applicants,
        private VacancyRepository $vacancies,
        private FileStorage $storage,
        private Mailer $mailer,
        private UserRepository $users,
    ) {}

    /** @return array<string,mixed> */
    public function get(User $actor, int $id): array
    {
        if (!$actor->hasRole(Role::Hr, Role::SuperAdmin)) {
            throw new NotAllowed('Anda tidak memiliki akses melihat Offering Letter.');
        }

        $ol = $this->ols->find($id);
        if ($ol === null) {
            throw new NotFound('Offering Letter tidak ditemukan.');
        }

        return OfferingLetterView::from($ol, ...$this->resolveSignaturePaths($ol));
    }

    /** @return array<string,mixed>|null */
    public function getForApplicant(User $actor, int $applicantId): ?array
    {
        if (!$actor->hasRole(Role::Hr, Role::SuperAdmin)) {
            throw new NotAllowed('Anda tidak memiliki akses melihat Offering Letter.');
        }

        $ol = $this->ols->findByApplicant($applicantId);
        if ($ol === null) {
            return null;
        }

        return OfferingLetterView::from($ol, ...$this->resolveSignaturePaths($ol));
    }

    /** @return array<int,array<string,mixed>> */
    public function listForHr(User $actor): array
    {
        if ($actor->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat melihat daftar Offering Letter miliknya.');
        }

        return array_map(
            fn (OfferingLetter $ol) => OfferingLetterView::from($ol, ...$this->resolveSignaturePaths($ol)),
            $this->ols->findByDraftedBy($actor->id),
        );
    }

    /** @return array<int,array<string,mixed>> */
    public function listPendingCeo(User $actor): array
    {
        if ($actor->role !== Role::SuperAdmin) {
            throw new NotAllowed('Hanya CEO yang dapat melihat daftar Offering Letter menunggu persetujuan.');
        }

        return array_map(
            fn (OfferingLetter $ol) => OfferingLetterView::from($ol, ...$this->resolveSignaturePaths($ol)),
            $this->ols->findPendingForCeo(),
        );
    }

    /** @return array<string,mixed> */
    public function create(
        User $actor,
        int $applicantId,
        string $position,
        float $salary,
        ?string $startDate,
        string $body,
    ): array {
        if ($actor->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat membuat Offering Letter.');
        }

        $applicant = $this->applicants->find($applicantId);
        if ($applicant === null) {
            throw new NotFound('Pelamar tidak ditemukan.');
        }
        if ($applicant->status() !== ApplicantStatus::OfferPending) {
            throw new DomainRuleViolation('Offering Letter hanya dapat dibuat untuk kandidat berstatus offer_pending.');
        }

        $existing = $this->ols->findByApplicant($applicantId);
        if ($existing !== null) {
            throw new DomainRuleViolation('Pelamar ini sudah memiliki Offering Letter.');
        }

        $startDateObj = $startDate !== null && $startDate !== ''
            ? new DateTimeImmutable($startDate)
            : null;

        $ol = OfferingLetter::open($actor, $applicantId, $position, $salary, $startDateObj, $body);
        $this->ols->save($ol);

        return OfferingLetterView::from($ol, ...$this->resolveSignaturePaths($ol));
    }

    /** @return array<string,mixed> */
    public function update(
        User $actor,
        int $id,
        string $position,
        float $salary,
        ?string $startDate,
        string $body,
    ): array {
        $ol = $this->loadForHr($actor, $id);

        $startDateObj = $startDate !== null && $startDate !== ''
            ? new DateTimeImmutable($startDate)
            : null;

        $ol->update($actor, $position, $salary, $startDateObj, $body);
        $this->ols->save($ol);

        return OfferingLetterView::from($ol, ...$this->resolveSignaturePaths($ol));
    }

    /** @return array<string,mixed> */
    public function submit(User $actor, int $id): array
    {
        $ol = $this->loadForHr($actor, $id);
        $ol->submit($actor);
        $this->ols->save($ol);

        return OfferingLetterView::from($ol, ...$this->resolveSignaturePaths($ol));
    }

    /** @return array<string,mixed> */
    public function approve(User $actor, int $id): array
    {
        if ($actor->role !== Role::SuperAdmin) {
            throw new NotAllowed('Hanya CEO yang dapat menyetujui Offering Letter.');
        }

        $ol = $this->ols->find($id);
        if ($ol === null) {
            throw new NotFound('Offering Letter tidak ditemukan.');
        }

        $ol->approve($actor);
        $this->ols->save($ol);

        return OfferingLetterView::from($ol, ...$this->resolveSignaturePaths($ol));
    }

    /** @return array<string,mixed> */
    public function revise(User $actor, int $id, string $comment): array
    {
        if ($actor->role !== Role::SuperAdmin) {
            throw new NotAllowed('Hanya CEO yang dapat meminta revisi Offering Letter.');
        }

        $ol = $this->ols->find($id);
        if ($ol === null) {
            throw new NotFound('Offering Letter tidak ditemukan.');
        }

        $ol->revise($actor, $comment);
        $this->ols->save($ol);

        return OfferingLetterView::from($ol, ...$this->resolveSignaturePaths($ol));
    }

    /** @return array<string,mixed> */
    public function send(User $actor, int $id, string $appBaseUrl): array
    {
        $ol = $this->loadForHr($actor, $id);

        $applicant = $this->applicants->find($ol->applicantId());
        if ($applicant === null) {
            throw new NotFound('Pelamar tidak ditemukan.');
        }

        $token         = bin2hex(random_bytes(32));
        $now           = new DateTimeImmutable();
        // KEPUTUSAN BELUM DIKONFIRMASI KLIEN: Offering Letter hangus 5 hari kerja; sementara pakai 7 hari kalender.
        $respondBefore = new DateTimeImmutable('+7 days');

        $ol->markSent($token, $now, $respondBefore);
        $this->ols->save($ol);

        // Ubah status pelamar ke 'offered'
        $applicant->advanceToOffered();
        $this->applicants->save($applicant);

        $olUrl = rtrim($appBaseUrl, '/') . '/ol/' . $token;
        $body  = $this->buildOfferingEmail(
            $applicant->fullName(),
            $ol->position(),
            $olUrl,
            $respondBefore,
        );

        try {
            $this->mailer->send(
                $applicant->email(),
                'Offering Letter - Gaharu Sempana Group',
                $body,
            );
        } catch (\Throwable $e) {
            error_log('[sistem-hr] Gagal mengirim Offering Letter ke ' . $applicant->email() . ': ' . $e->getMessage());
        }

        return OfferingLetterView::from($ol, ...$this->resolveSignaturePaths($ol));
    }

    /** @return array<string,mixed> */
    public function resend(User $actor, int $id, string $appBaseUrl): array
    {
        $ol = $this->loadForHr($actor, $id);

        if ($ol->status() !== OfferingLetterStatus::Sent) {
            throw new DomainRuleViolation('Hanya Offering Letter berstatus Terkirim yang dapat dikirim ulang.');
        }

        $applicant = $this->applicants->find($ol->applicantId());
        if ($applicant === null) {
            throw new NotFound('Pelamar tidak ditemukan.');
        }

        $olUrl = rtrim($appBaseUrl, '/') . '/ol/' . $ol->responseToken();
        $body  = $this->buildOfferingEmail(
            $applicant->fullName(),
            $ol->position(),
            $olUrl,
            $ol->respondBefore() ?? new DateTimeImmutable('+7 days'),
        );

        try {
            $this->mailer->send(
                $applicant->email(),
                'Offering Letter - Gaharu Sempana Group',
                $body,
            );
        } catch (\Throwable $e) {
            error_log('[sistem-hr] Gagal mengirim ulang Offering Letter ke ' . $applicant->email() . ': ' . $e->getMessage());
        }

        return OfferingLetterView::from($ol, ...$this->resolveSignaturePaths($ol));
    }

    /** @return array<string,mixed> */
    public function getPublic(string $token): array
    {
        $ol = $this->ols->findByToken($token);
        if ($ol === null) {
            throw new NotFound('Offering Letter tidak ditemukan atau tautan tidak valid.');
        }
        if ($ol->status() === OfferingLetterStatus::Expired) {
            throw new NotFound('Tautan Offering Letter ini sudah kedaluwarsa.');
        }

        return OfferingLetterView::from($ol);
    }

    public function respond(string $token, string $action): void
    {
        $ol = $this->ols->findByToken($token);
        if ($ol === null) {
            throw new NotFound('Offering Letter tidak ditemukan atau tautan tidak valid.');
        }

        if ($action === 'contact') {
            // Aksi hubungi admin: tidak mengubah status, hanya dikembalikan sebagai konfirmasi.
            return;
        }

        $ol->recordResponse($action);
        $this->ols->save($ol);

        $applicant = $this->applicants->find($ol->applicantId());
        if ($applicant !== null) {
            if ($action === 'accept') {
                $applicant->acceptOffer();
            } elseif ($action === 'decline') {
                $applicant->declineOffer();
            }
            $this->applicants->save($applicant);
        }
    }

    // ──

    private function loadForHr(User $actor, int $id): OfferingLetter
    {
        if ($actor->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat mengelola Offering Letter.');
        }

        $ol = $this->ols->find($id);
        if ($ol === null) {
            throw new NotFound('Offering Letter tidak ditemukan.');
        }

        return $ol;
    }

    /**
     * Ambil jalur tanda tangan HR dan CEO untuk OfferingLetterView.
     * Mengembalikan [hrSignaturePath|null, ceoSignaturePath|null].
     *
     * @return array{?string,?string}
     */
    private function resolveSignaturePaths(OfferingLetter $ol): array
    {
        $hrUser  = $this->users->findById($ol->draftedBy());
        $hrPath  = $hrUser?->signaturePath ?? null;

        $ceoPath = null;
        if ($ol->approvedBy() !== null) {
            $ceoUser = $this->users->findById($ol->approvedBy());
            $ceoPath = $ceoUser?->signaturePath ?? null;
        }

        return [$hrPath, $ceoPath];
    }

    private function buildOfferingEmail(
        string $name,
        string $position,
        string $olUrl,
        DateTimeImmutable $respondBefore,
    ): string {
        $deadline = $respondBefore->format('d/m/Y') . ' WITA';

        return "Yth. {$name},\n\n"
            . "Kami dengan senang hati menyampaikan Offering Letter untuk posisi {$position} "
            . "di Gaharu Sempana Group.\n\n"
            . "Silakan buka tautan berikut untuk melihat detail penawaran dan memberikan respons sebelum {$deadline}:\n\n"
            . "{$olUrl}\n\n"
            . "Jika ada pertanyaan, silakan hubungi tim HR kami.\n\n"
            . "Salam,\nTim HR Gaharu Sempana Group";
    }
}
