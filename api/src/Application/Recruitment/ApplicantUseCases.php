<?php
declare(strict_types=1);

namespace App\Application\Recruitment;

use App\Application\Ports\FileStorage;
use App\Application\Ports\Mailer;
use App\Domain\Identity\Role;
use App\Domain\Identity\User;
use App\Domain\Recruitment\Applicant;
use App\Domain\Recruitment\ApplicantRepository;
use App\Domain\Recruitment\MrfRepository;
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
        private MrfRepository $mrfs,
        private FileStorage $storage,
        private Mailer $mailer,
    ) {}

    /** @return array<string,mixed> */
    public function getForHr(User $actor, int $id): array
    {
        $applicant = $this->load($actor, $id);

        return ApplicantView::from($applicant);
    }

    /**
     * Mengembalikan jalur absolut berkas milik pelamar.
     * Hanya dipanggil dari controller file-serving, tidak pernah dikirim ke browser.
     */
    public function resolveFilePath(User $actor, int $id, string $type): string
    {
        if ($actor->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat mengakses berkas pelamar.');
        }

        $applicant = $this->applicants->find($id);
        if ($applicant === null) {
            throw new NotFound('Pelamar tidak ditemukan.');
        }

        if ($type === 'photo' || $type === 'signature') {
            $formData = $this->applicants->findFormData($id);
            if ($formData === null) {
                throw new NotFound('Form Pelamar belum disubmit.');
            }

            $relativePath = $type === 'photo'
                ? ($formData['photo_path'] ?? '')
                : ($formData['signature_path'] ?? '');

            if ($relativePath === '') {
                throw new NotFound('Berkas tidak tersedia.');
            }

            $fullPath = rtrim(STORAGE_PATH, '/') . '/' . $relativePath;

            if (!is_file($fullPath)) {
                throw new NotFound('Berkas tidak ditemukan di server.');
            }

            return $fullPath;
        }

        $relativePath = match ($type) {
            'cv'        => $applicant->cvPath(),
            'portfolio' => $applicant->portfolioPath() ?? '',
            default     => '',
        };

        if ($relativePath === '') {
            throw new NotFound('Berkas tidak tersedia.');
        }

        $fullPath = rtrim(STORAGE_PATH, '/') . '/' . $relativePath;

        if (!is_file($fullPath)) {
            throw new NotFound('Berkas tidak ditemukan di server.');
        }

        return $fullPath;
    }

    /**
     * Ambil isi Form Pelamar yang sudah disubmit pelamar.
     * Hanya bisa diakses oleh hr, super_admin, dan manajer.
     *
     * @return array<string,mixed>
     */
    public function getFormData(User $actor, int $id): array
    {
        $allowed = [Role::Hr, Role::SuperAdmin, Role::Manajer];
        if (!in_array($actor->role, $allowed, true)) {
            throw new NotAllowed('Anda tidak memiliki akses untuk melihat Form Pelamar.');
        }

        $applicant = $this->applicants->find($id);
        if ($applicant === null) {
            throw new NotFound('Pelamar tidak ditemukan.');
        }

        $formData = $this->applicants->findFormData($id);
        if ($formData === null) {
            throw new NotFound('Form Pelamar belum disubmit.');
        }

        $decoded = json_decode($formData['data'], true);

        return [
            'formData'       => $decoded,
            'expectedSalary' => $formData['expected_salary'],
            'photoPath'      => $formData['photo_path'],
            'signaturePath'  => $formData['signature_path'],
            'submittedAt'    => $formData['submitted_at'],
        ];
    }

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
        ?string $message = null,
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
            $message,
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

    /** @return array<string,mixed> */
    public function shortlist(User $actor, int $id): array
    {
        $applicant = $this->loadForSelectionAction($actor, $id);
        $applicant->shortlist($actor);
        $this->applicants->save($applicant);

        return ApplicantView::from($applicant, $this->resolveSelectionTrack($applicant));
    }

    /** @return array<string,mixed> */
    public function callToSelection(User $actor, int $id): array
    {
        $applicant = $this->loadForSelectionAction($actor, $id);
        $applicant->callToSelection($actor);
        $this->applicants->save($applicant);

        return ApplicantView::from($applicant, $this->resolveSelectionTrack($applicant));
    }

    /**
     * HR atau CEO mencatat hasil satu tahap seleksi.
     * Menentukan transisi status selanjutnya berdasarkan selection_track dari MRF.
     *
     * @return array<string,mixed>
     */
    public function recordSelectionResult(
        User $actor,
        int $id,
        string $stage,
        string $result,
        ?string $notes,
    ): array {
        if (!in_array($stage, ['competency_test', 'interview'], true)) {
            throw new DomainRuleViolation('Tahap seleksi tidak valid. Harus competency_test atau interview.');
        }
        if (!in_array($result, ['pass', 'fail'], true)) {
            throw new DomainRuleViolation('Hasil seleksi tidak valid. Harus pass atau fail.');
        }

        $applicant = $this->loadForSelectionAction($actor, $id);

        // Panggil domain method (set not_selected jika fail)
        $applicant->recordSelectionResult($actor, $stage, $result);

        // Tentukan status lanjutan jika lulus
        if ($result === 'pass') {
            $track = $this->resolveSelectionTrack($applicant);

            $moveToOffer = $track === 'fast'
                || ($track === 'normal' && $stage === 'interview');

            if ($moveToOffer) {
                // Perlu akses langsung ke status; gunakan dedicated update via save setelah set lewat helper
                $this->forceStatusOfferPending($applicant);
            }
            // Jika track normal dan stage competency_test, tetap di selection
        }

        $this->applicants->save($applicant);

        // Simpan catatan seleksi
        $this->applicants->saveSelectionRecord(
            (int) $applicant->id(),
            $stage,
            $result,
            $notes,
            $actor->id,
        );

        return ApplicantView::from($applicant, $this->resolveSelectionTrack($applicant));
    }

    /**
     * Ambil riwayat catatan seleksi milik satu pelamar.
     *
     * @return array<int,array{id:int,stage:string,result:string,notes:string|null,recordedAt:string}>
     */
    public function getSelectionRecords(User $actor, int $id): array
    {
        if (!$actor->hasRole(Role::Hr, Role::SuperAdmin, Role::Manajer)) {
            throw new NotAllowed('Anda tidak memiliki akses melihat riwayat seleksi.');
        }

        $applicant = $this->applicants->find($id);
        if ($applicant === null) {
            throw new NotFound('Pelamar tidak ditemukan.');
        }

        return $this->applicants->findSelectionRecords((int) $applicant->id());
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

    /** Muat pelamar untuk aksi shortlist / seleksi (boleh HR atau CEO). */
    private function loadForSelectionAction(User $actor, int $id): Applicant
    {
        if (!$actor->hasRole(Role::Hr, Role::SuperAdmin)) {
            throw new NotAllowed('Hanya HR atau CEO yang dapat mengakses aksi seleksi.');
        }

        $applicant = $this->applicants->find($id);
        if ($applicant === null) {
            throw new NotFound('Pelamar tidak ditemukan.');
        }

        return $applicant;
    }

    /**
     * Ambil selection_track dari MRF yang terkait dengan vacancy pelamar ini.
     * Mengembalikan string 'fast'/'normal', atau null jika tidak ditemukan.
     */
    private function resolveSelectionTrack(Applicant $applicant): ?string
    {
        $vacancy = $this->vacancies->find($applicant->vacancyId());
        if ($vacancy === null) {
            return null;
        }

        $mrf = $this->mrfs->find($vacancy->mrfId());
        if ($mrf === null) {
            return null;
        }

        return $mrf->spec()->selectionTrack->value;
    }

    /**
     * Set status pelamar ke offer_pending secara langsung.
     * Dipanggil dari use case setelah domain method selesai validasi.
     * Tidak bisa memanggil domain method karena domain hanya set not_selected atau membiarkan selection.
     */
    private function forceStatusOfferPending(Applicant $applicant): void
    {
        // Kita perlu memodifikasi status dari use case. Karena status di domain tidak punya
        // method "moveToOffer", kita ekspor via pendekatan reconstitute.
        // Cara paling bersih: tambah method advanceToOffer di Applicant yang hanya boleh dipanggil
        // satu kali setelah recordSelectionResult menentukan pass + kondisi terpenuhi.
        // Kita panggil method ini; domain akan memeriksa kondisi dan mengubah status.
        $applicant->advanceToOffer();
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
