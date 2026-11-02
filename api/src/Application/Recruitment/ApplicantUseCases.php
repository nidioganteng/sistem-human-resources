<?php
declare(strict_types=1);

namespace App\Application\Recruitment;

use App\Application\Employee\EmployeeView;
use App\Application\Ports\FileStorage;
use App\Application\Ports\Mailer;
use App\Application\Ports\WorkforceStore;
use App\Application\Ports\DocumentRenderer;
use App\Application\Workforce\Notifications;
use App\Domain\Employee\Employee;
use App\Domain\Employee\EmployeeRepository;
use App\Domain\Identity\Role;
use App\Domain\Identity\User;
use App\Domain\Recruitment\Applicant;
use App\Domain\Recruitment\ApplicantStatus;
use App\Domain\Recruitment\SelectionPolicy;
use App\Domain\Recruitment\ApplicantRepository;
use App\Domain\Recruitment\MrfRepository;
use App\Domain\Recruitment\OfferingLetterRepository;
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
        private ?EmployeeRepository $employees = null,
        private ?OfferingLetterRepository $ols = null,
        private ?WorkforceStore $workflows = null,
        private ?Notifications $notifications = null,
        private ?DocumentRenderer $documents = null,
    ) {}

    /** @return array<string,mixed> */
    public function getForHr(User $actor, int $id): array
    {
        $applicant = $this->loadVisible($actor, $id);

        return ApplicantView::from($applicant, $this->resolveSelectionTrack($applicant)) + ['hasCertificate'=>!empty($this->workflows?->list('applicant_documents',['applicant_id'=>$id,'doc_type'=>'certificate']) ?? [])];
    }

    /**
     * Mengembalikan jalur absolut berkas milik pelamar.
     * Hanya dipanggil dari controller file-serving, tidak pernah dikirim ke browser.
     */
    public function resolveFilePath(User $actor, int $id, string $type): string
    {
        $applicant = $this->loadVisible($actor, $id);

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

        if ($type === 'certificate') {
            $docs = $this->workflows?->list('applicant_documents',['applicant_id'=>$id,'doc_type'=>'certificate']) ?? [];
            if (!$docs) throw new NotFound('Sertifikat tidak tersedia.');
            return $this->storage->absolutePath($docs[0]['file_path']);
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
        $applicant = $this->loadVisible($actor, $id);

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
        if (!$actor->hasRole(Role::Hr, Role::SuperAdmin, Role::Manajer, Role::Pic)) {
            throw new NotAllowed('Anda tidak memiliki akses melihat daftar pelamar.');
        }

        $vacancy = $this->vacancies->find($vacancyId);
        if ($vacancy === null) {
            throw new NotFound('Lowongan tidak ditemukan.');
        }

        if ($actor->hasRole(Role::Manajer, Role::Pic) && $vacancy->division() !== $actor->division) {
            throw new NotFound('Lowongan tidak ditemukan.');
        }

        return array_map(
            fn (Applicant $a) => ApplicantView::from($a, $this->resolveSelectionTrack($a)) + ['hasCertificate'=>!empty($this->workflows?->list('applicant_documents',['applicant_id'=>$a->id(),'doc_type'=>'certificate']) ?? [])],
            $this->applicants->findByVacancy($vacancyId),
        );
    }

    /**
     * Daftar kandidat yang sudah masuk pipeline seleksi (lintas lowongan).
     * HR dan CEO melihat semua. Manajer hanya divisinya sendiri.
     *
     * @return array<int,array<string,mixed>>
     */
    public function listCandidates(User $actor): array
    {
        $allowed = [Role::Hr, Role::SuperAdmin, Role::Manajer, Role::Pic];
        if (!in_array($actor->role, $allowed, true)) {
            throw new NotAllowed('Anda tidak memiliki akses melihat daftar kandidat.');
        }

        $statuses = [
            'form_submitted', 'shortlisted', 'selection', 'offer_pending',
            'offered', 'accepted', 'declined', 'hired', 'not_selected',
        ];

        $division = $actor->hasRole(Role::Manajer, Role::Pic) ? $actor->division : null;

        $rows = $this->applicants->findByStatuses($statuses, $division);

        return array_map(function (array $row) {
            $a     = $row['applicant'];
            $track = $this->resolveSelectionTrack($a);
            $view  = ApplicantView::from($a, $track);

            $view['vacancyPosition'] = $row['vacancyPosition'];
            $view['vacancyDivision'] = $row['vacancyDivision'];

            return $view;
        }, $rows);
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
        ?string $certificatePath = null,
    ): array {
        $work = function () use ($token,$fullName,$email,$phone,$cvPath,$portfolioPath,$message,$certificatePath): array {
        $vacancy = $this->vacancies->findByToken($token);
        if ($vacancy && $this->workflows) {
            $this->workflows->find('vacancies',(int)$vacancy->id(),true);
            $vacancy = $this->vacancies->find((int)$vacancy->id());
        }
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
        if ($certificatePath !== null) $this->workflows?->insert('applicant_documents',[
            'applicant_id'=>$applicant->id(),'doc_type'=>'certificate','file_path'=>$certificatePath,'created_at'=>date('Y-m-d H:i:s'),
        ]);
        return ApplicantView::from($applicant);
        };
        return $this->workflows ? $this->workflows->transaction($work) : $work();
    }

    public function formPdf(User $actor, int $id): string
    {
        $a = $this->loadVisible($actor,$id);
        $form = $this->applicants->findFormData($id);
        if (!$form || !$this->documents) throw new NotFound('Form Pelamar belum tersedia.');
        $photo = !empty($form['photo_path']) ? $this->storage->absolutePath($form['photo_path']) : null;
        $signature = !empty($form['signature_path']) ? $this->storage->absolutePath($form['signature_path']) : null;
        return $this->documents->applicant(ApplicantView::from($a)+['position'=>$this->vacancies->find($a->vacancyId())?->position()??'-'],$form,$photo,$signature);
    }

    /**
     * HR menyetujui pelamar: mengubah status ke form_pending,
     * membuat token Form Pelamar, mengirim email berisi tautan.
     */
    public function approve(User $actor, int $id, string $appBaseUrl): void
    {
        $work = function () use ($actor,$id,$appBaseUrl): void {
        $this->workflows?->find('applicants',$id,true);
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

        $this->mailer->send($applicant->email(),'Lamaran Anda Diterima - Lengkapi Form Pelamar',$body);
        };
        if ($this->workflows) $this->workflows->transaction($work); else $work();
    }

    /** Penolakan dan email disimpan bersama; riwayat dibersihkan melalui arsip lowongan. */
    public function reject(User $actor, int $id): void
    {
        $work = function () use ($actor,$id): void {
            $this->workflows?->find('applicants',$id,true);
            $applicant = $this->load($actor,$id);
            $applicant->reject($actor);
            $this->applicants->save($applicant);
            $this->mailer->send($applicant->email(),'Informasi Lamaran Anda',$this->buildRejectEmail($applicant->fullName()));
        };
        if ($this->workflows) $this->workflows->transaction($work); else $work();
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
        $track = $this->resolveSelectionTrack($applicant);
        $save = function () use ($applicant,$track) {
            $this->applicants->save($applicant);
            $stage = $track === 'fast' ? 'wawancara' : 'tes kompetensi';
            $this->mailer->send($applicant->email(),'Undangan seleksi - Gaharu Sempana Group',
                "Yth. {$applicant->fullName()},\nAnda diundang untuk tahap {$stage}. Tim HR akan mengonfirmasi jadwal dan lokasi. Silakan hubungi HR untuk informasi selanjutnya.");
        };
        if ($this->workflows) $this->workflows->transaction($save); else $save();

        return ApplicantView::from($applicant, $this->resolveSelectionTrack($applicant));
    }

    /**
     * HR atau CEO mencatat hasil satu tahap seleksi.
     * Menentukan transisi status selanjutnya berdasarkan selection_track dari MRF.
     *
     * @return array<string,mixed>
     */
    public function recordSelectionResult(User $actor, int $id, string $stage, string $result, ?string $notes): array
    {
        $work=function() use ($actor,$id,$stage,$result,$notes) {
            $this->workflows?->find('applicants',$id,true);
            return $this->recordSelection($actor,$id,$stage,$result,$notes);
        };
        return $this->workflows ? $this->workflows->transaction($work) : $work();
    }
    private function recordSelection(
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

        SelectionPolicy::assertCanRecord($actor, $this->resolveSelectionTrack($applicant) ?? '', $stage,
            $this->applicants->findSelectionRecords($id));
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

        if ($stage === 'competency_test') {
            $this->notifications?->toRoles(['hr','super_admin'],'selection_result','Hasil tes kompetensi tersedia', ['message'=>$applicant->fullName() . ': ' . $result,'applicantId'=>$id]);
            if ($result === 'pass') $this->mailer->send($applicant->email(),'Undangan wawancara - Gaharu Sempana Group',
                "Yth. {$applicant->fullName()},\nAnda lulus tes kompetensi dan diundang ke wawancara. Tim HR akan mengonfirmasi jadwal dan lokasi.");
        }
        return ApplicantView::from($applicant, $this->resolveSelectionTrack($applicant));
    }

    /**
     * Ambil riwayat catatan seleksi milik satu pelamar.
     *
     * @return array<int,array{id:int,stage:string,result:string,notes:string|null,recordedAt:string}>
     */
    public function getSelectionRecords(User $actor, int $id): array
    {
        $applicant = $this->loadVisible($actor, $id);

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
        return $this->loadVisible($actor, $id);
    }

    private function loadVisible(User $actor, int $id): Applicant
    {
        if (!$actor->hasRole(Role::Hr, Role::SuperAdmin, Role::Manajer, Role::Pic)) {
            throw new NotAllowed('Anda tidak memiliki akses pelamar.');
        }
        $applicant = $this->applicants->find($id);
        if ($applicant === null) throw new NotFound('Pelamar tidak ditemukan.');
        if ($actor->hasRole(Role::Manajer, Role::Pic)) {
            $vacancy = $this->vacancies->find($applicant->vacancyId());
            if ($actor->division === null || $vacancy === null || $vacancy->division() !== $actor->division) {
                throw new NotFound('Pelamar tidak ditemukan.');
            }
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

    /** @return array<string,mixed> */
    public function hire(User $actor, int $applicantId): array
    {
        $work=function() use($actor,$applicantId) {
            $this->workflows?->find('applicants',$applicantId,true);
            return $this->hireCandidate($actor,$applicantId);
        };
        return $this->workflows ? $this->workflows->transaction($work) : $work();
    }
    private function hireCandidate(User $actor, int $applicantId): array
    {
        if ($actor->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat menjadikan kandidat sebagai karyawan.');
        }

        $applicant = $this->applicants->find($applicantId);
        if ($applicant === null) {
            throw new NotFound('Pelamar tidak ditemukan.');
        }

        $vacancy = $this->vacancies->find($applicant->vacancyId());
        if ($vacancy === null) {
            throw new NotFound('Data lowongan tidak ditemukan.');
        }

        if ($applicant->status() !== ApplicantStatus::Accepted) {
            throw new DomainRuleViolation('Hanya kandidat yang menerima OL dapat dijadikan karyawan.');
        }
        if ($this->employees?->findByApplicant($applicantId) !== null) {
            throw new DomainRuleViolation('Kandidat sudah tercatat sebagai karyawan.');
        }
        $mrf = $this->mrfs->find($vacancy->mrfId());
        if ($mrf === null) throw new NotFound('MRF tidak ditemukan.');
        $salary = null;
        if ($this->ols !== null) {
            $ol = $this->ols->findByApplicant($applicantId);
            $salary = $ol?->salary();
        }

        $employee = Employee::create(
            $actor,
            $applicant->fullName(),
            $vacancy->position(),
            $vacancy->division(),
            $mrf->spec()->employmentStatus->value,
            $salary,
            $applicant->id(),
        );

        if ($this->employees === null) {
            throw new DomainRuleViolation('Fitur hire tidak tersedia.');
        }

        // Carry existing candidate data into onboarding; HR still verifies documents.
        $form = $this->applicants->findFormData($applicantId);
        $data = $form ? json_decode((string)$form['data'],true,512,JSON_THROW_ON_ERROR) : [];
        $identity = is_array($data['identitas'] ?? null) ? $data['identitas'] : [];
        $personal = [];
        foreach (['tanggal_lahir'=>'birth_date','tempat_lahir'=>'birth_place','alamat_tinggal'=>'address','agama'=>'religion','status_perkawinan'=>'marital_status'] as $source=>$target) {
            if (!empty($identity[$source])) $personal[$target] = (string)$identity[$source];
        }
        $nik = (string)($identity['no_identitas'] ?? '');
        $employee->updatePersonalData($actor,preg_match('/^[0-9]{16}$/D',$nik) ? $nik : '',$applicant->email(),$applicant->phone(),$personal);
        $startDate = isset($ol) ? $ol?->startDate()?->format('Y-m-d') : null;
        $employee->updateContractInfo($vacancy->position(),$vacancy->division(),$mrf->spec()->employmentStatus->value,$salary,$startDate,null);
        $this->employees->save($employee);

        $applicant->markHired();
        $this->applicants->save($applicant);

        return EmployeeView::from($employee);
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
