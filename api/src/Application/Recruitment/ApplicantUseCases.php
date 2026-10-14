<?php
declare(strict_types=1);

namespace App\Application\Recruitment;

use App\Application\Ports\FileStorage;
use App\Application\Ports\Mailer;
use App\Domain\Identity\Role;
use App\Domain\Identity\User;
use App\Domain\Recruitment\Applicant;
use App\Domain\Recruitment\ApplicantRepository;
use App\Domain\Recruitment\VacancyRepository;
use App\Domain\Shared\DomainRuleViolation;
use App\Domain\Shared\NotAllowed;
use App\Domain\Shared\NotFound;
use DateTimeImmutable;

/**
 * Kumpulan use case Pelamar.
 * Aturan bisnis ada di entity Applicant; kelas ini mengoordinasikan dan memanggil port eksternal.
 */
final class ApplicantUseCases
{
    public function __construct(
        private ApplicantRepository $applicants,
        private VacancyRepository $vacancies,
        private FileStorage $storage,
        private Mailer $mailer,
    ) {}

    /** @return array<int,array<string,mixed>> */
    public function listByVacancy(User $actor, int $vacancyId): array
    {
        if ($actor->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat melihat daftar pelamar.');
        }

        $vacancy = $this->vacancies->find($vacancyId);
        if ($vacancy === null) {
            throw new NotFound('Lowongan tidak ditemukan.');
        }

        return array_map(
            static fn (Applicant $a) => ApplicantView::from($a),
            $this->applicants->findByVacancy($vacancyId),
        );
    }

    /**
     * Pendaftaran publik. Dipanggil controller setelah berkas sudah divalidasi MIME/ukuran
     * dan dipindahkan ke penyimpanan lewat FileStorage.
     *
     * @return array<string,mixed>
     */
    public function register(
        string $token,
        string $fullName,
        string $email,
        string $phone,
        string $cvPath,
        ?string $portfolioPath,
    ): array {
        $vacancy = $this->vacancies->findByToken($token);
        if ($vacancy === null || !$vacancy->isOpen()) {
            // Hapus berkas yang sudah tersimpan bila validasi gagal
            $this->storage->delete($cvPath);
            if ($portfolioPath !== null) {
                $this->storage->delete($portfolioPath);
            }
            throw new DomainRuleViolation('Lowongan ini sudah ditutup atau tidak ditemukan.');
        }

        if ($this->applicants->existsByEmailAndVacancy($email, (int) $vacancy->id())) {
            $this->storage->delete($cvPath);
            if ($portfolioPath !== null) {
                $this->storage->delete($portfolioPath);
            }
            throw new DomainRuleViolation('Email ini sudah digunakan untuk melamar lowongan yang sama.');
        }

        $applicant = Applicant::register(
            (int) $vacancy->id(),
            $fullName,
            $email,
            $phone,
            $cvPath,
            $portfolioPath,
        );
        $this->applicants->save($applicant);

        return ApplicantView::from($applicant);
    }

    /**
     * HR menyetujui pelamar: mengubah status ke form_pending,
     * membuat token Form Pelamar, mengirim email berisi tautan.
     */
    public function approve(User $actor, int $id, string $appBaseUrl): void
    {
        $applicant = $this->load($actor, $id);
        $applicant->approvePending($actor);
        $this->applicants->save($applicant);

        // Token Form Pelamar: 64 karakter hex = 32 byte acak
        $formToken = bin2hex(random_bytes(32));
        // KEPUTUSAN BELUM DIKONFIRMASI KLIEN: Form Pelamar kedaluwarsa 3 x 24 jam (bukan hari kerja).
        $expiresAt = new DateTimeImmutable('+72 hours');
        $this->applicants->saveFormToken((int) $applicant->id(), $formToken, $expiresAt);

        $formUrl = rtrim($appBaseUrl, '/') . '/form-pelamar/' . $formToken;
        $body    = $this->buildApproveEmail($applicant->fullName(), $applicant->email(), $formUrl, $expiresAt);

        try {
            $this->mailer->send(
                $applicant->email(),
                'Lamaran Anda Diterima - Lengkapi Form Pelamar',
                $body,
            );
        } catch (\Throwable $e) {
            error_log('[sistem-hr] Gagal mengirim email persetujuan ke ' . $applicant->email() . ': ' . $e->getMessage());
        }
    }

    /**
     * HR menolak pelamar: mengirim email penolakan, menghapus berkas, menghapus record.
     * Setelah method ini selesai, record pelamar tidak ada lagi di database.
     */
    public function reject(User $actor, int $id): void
    {
        $applicant = $this->load($actor, $id);
        // Panggil domain untuk validasi status; tidak disimpan karena record akan dihapus.
        $applicant->reject($actor);

        $cvPath        = $applicant->cvPath();
        $portfolioPath = $applicant->portfolioPath();

        try {
            $this->mailer->send(
                $applicant->email(),
                'Informasi Lamaran Anda',
                $this->buildRejectEmail($applicant->fullName()),
            );
        } catch (\Throwable $e) {
            error_log('[sistem-hr] Gagal mengirim email penolakan ke ' . $applicant->email() . ': ' . $e->getMessage());
        }

        $this->applicants->delete((int) $applicant->id());
        $this->storage->delete($cvPath);
        if ($portfolioPath !== null) {
            $this->storage->delete($portfolioPath);
        }
    }

    // ──

    private function load(User $actor, int $id): Applicant
    {
        if ($actor->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat memproses pelamar.');
        }
        $applicant = $this->applicants->find($id);
        if ($applicant === null) {
            throw new NotFound('Pelamar tidak ditemukan.');
        }

        return $applicant;
    }

    private function buildApproveEmail(
        string $name,
        string $email,
        string $formUrl,
        DateTimeImmutable $expiresAt,
    ): string {
        $deadline = $expiresAt->format('d/m/Y H:i') . ' WITA';

        return "Yth. {$name},\n\n"
            . "Selamat! Lamaran Anda telah diterima pada tahap screening awal.\n"
            . "Silakan lengkapi Form Pelamar melalui tautan berikut sebelum {$deadline}:\n\n"
            . "{$formUrl}\n\n"
            . "Tautan hanya bisa digunakan sekali dan akan kedaluwarsa pada {$deadline}.\n"
            . "Jika ada pertanyaan, hubungi tim HR Gaharu Sempana Group.\n\n"
            . "Salam,\nTim HR Gaharu Sempana Group";
    }

    private function buildRejectEmail(string $name): string
    {
        return "Yth. {$name},\n\n"
            . "Terima kasih atas minat Anda untuk bergabung dengan Gaharu Sempana Group.\n"
            . "Setelah kami tinjau, dengan menyesal kami sampaikan bahwa lamaran Anda\n"
            . "belum dapat kami lanjutkan pada tahap ini.\n\n"
            . "Kami mendoakan yang terbaik untuk pencarian kerja Anda ke depan.\n\n"
            . "Salam,\nTim HR Gaharu Sempana Group";
    }
}
