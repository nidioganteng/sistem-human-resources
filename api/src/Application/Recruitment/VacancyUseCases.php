<?php
declare(strict_types=1);

namespace App\Application\Recruitment;

use App\Application\Ports\FileStorage;
use App\Domain\Identity\Role;
use App\Domain\Identity\User;
use App\Domain\Recruitment\ApplicantRepository;
use App\Domain\Recruitment\MrfRepository;
use App\Domain\Recruitment\MrfStatus;
use App\Domain\Recruitment\Vacancy;
use App\Domain\Recruitment\VacancyRepository;
use App\Domain\Recruitment\VacancyStatus;
use App\Domain\Shared\DomainRuleViolation;
use App\Domain\Shared\NotAllowed;
use App\Domain\Shared\NotFound;
use ZipArchive;

/**
 * Kumpulan use case Lowongan.
 * Aturan bisnis ada di aggregate Vacancy; kelas ini hanya mengoordinasikan.
 */
final class VacancyUseCases
{
    public function __construct(
        private VacancyRepository $vacancies,
        private MrfRepository $mrfs,
        private ApplicantRepository $applicants,
        private FileStorage $storage,
    ) {}

    /** @return array<int,array<string,mixed>> */
    public function list(User $actor): array
    {
        if ($actor->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat melihat daftar lowongan.');
        }

        return array_map(
            static fn (array $row) => VacancyView::from($row['vacancy'], $row['counts'], $row['mrfCode']),
            $this->vacancies->findAllWithCounts(),
        );
    }

    /** @return array<string,mixed> */
    public function get(User $actor, int $id): array
    {
        if ($actor->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat melihat lowongan.');
        }

        $row = $this->vacancies->findWithCounts($id);
        if ($row === null) {
            throw new NotFound('Lowongan tidak ditemukan.');
        }

        return VacancyView::from($row['vacancy'], $row['counts'], $row['mrfCode']);
    }

    /** HR membuka lowongan baru dari MRF yang sudah disetujui CEO. */
    public function open(User $actor, int $mrfId): array
    {
        if ($actor->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat membuka lowongan.');
        }

        $mrf = $this->mrfs->find($mrfId);
        if ($mrf === null || $mrf->status() !== MrfStatus::Approved) {
            throw new NotFound('MRF tidak ditemukan atau belum disetujui CEO.');
        }
        if ($this->vacancies->hasOpenForMrf($mrfId)) {
            throw new DomainRuleViolation('Lowongan untuk MRF ini sudah terbuka.');
        }

        $token   = bin2hex(random_bytes(16));
        $vacancy = Vacancy::open($actor, $mrfId, $mrf->spec()->position, $mrf->division(), $token);
        $this->vacancies->save($vacancy);

        $row = $this->vacancies->findWithCounts((int) $vacancy->id());

        return VacancyView::from(
            $row !== null ? $row['vacancy'] : $vacancy,
            $row['counts'] ?? [],
            $row['mrfCode'] ?? $mrf->code(),
        );
    }

    /** HR membuka kembali lowongan yang sudah ditutup. */
    public function reopen(User $actor, int $id): array
    {
        if ($actor->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat membuka kembali lowongan.');
        }

        $row = $this->vacancies->findWithCounts($id);
        if ($row === null) {
            throw new NotFound('Lowongan tidak ditemukan.');
        }

        $vacancy = $row['vacancy'];
        $vacancy->reopen($actor);
        $this->vacancies->save($vacancy);

        $updated = $this->vacancies->findWithCounts($id);

        return VacancyView::from(
            $updated !== null ? $updated['vacancy'] : $vacancy,
            $updated['counts'] ?? [],
            $updated['mrfCode'] ?? $row['mrfCode'],
        );
    }

    /** HR mengarsipkan lowongan yang sudah ditutup. Status berubah ke archived. */
    public function archive(User $actor, int $id): array
    {
        if ($actor->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat mengarsipkan lowongan.');
        }

        $row = $this->vacancies->findWithCounts($id);
        if ($row === null) {
            throw new NotFound('Lowongan tidak ditemukan.');
        }

        $vacancy = $row['vacancy'];
        $vacancy->archive($actor);
        $this->vacancies->save($vacancy);

        $updated = $this->vacancies->findWithCounts($id);

        return VacancyView::from(
            $updated !== null ? $updated['vacancy'] : $vacancy,
            $updated['counts'] ?? [],
            $updated['mrfCode'] ?? $row['mrfCode'],
        );
    }

    /**
     * HR mengunduh arsip ZIP semua data pelamar lowongan yang sudah diarsipkan,
     * lalu server menghapus semua data pelamar dan lowongan setelah streaming selesai.
     *
     * Method ini langsung menulis ke output PHP (header + readfile) lalu exit().
     * Tidak mengembalikan Response karena streaming binary tidak bisa dibungkus Response JSON.
     */
    public function streamArchiveAndDelete(User $actor, int $id): void
    {
        if ($actor->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat mengunduh arsip lowongan.');
        }

        $row = $this->vacancies->findWithCounts($id);
        if ($row === null) {
            throw new NotFound('Lowongan tidak ditemukan.');
        }

        $vacancy = $row['vacancy'];
        if ($vacancy->status() !== VacancyStatus::Archived) {
            throw new DomainRuleViolation('Hanya lowongan yang sudah diarsipkan yang dapat diunduh.');
        }

        $applicantList = $this->applicants->findByVacancy($id);

        // Buat file ZIP sementara
        $tmpZip = tempnam(sys_get_temp_dir(), 'hr_arsip_');
        if ($tmpZip === false) {
            throw new \RuntimeException('Gagal membuat file sementara.');
        }

        $zip = new ZipArchive();
        if ($zip->open($tmpZip, ZipArchive::OVERWRITE) !== true) {
            throw new \RuntimeException('Gagal membuat arsip ZIP.');
        }

        // Buat CSV pelamar
        $csvLines = ['Nama,Email,Nomor HP,Status,Tanggal Daftar'];
        foreach ($applicantList as $applicant) {
            $csvLines[] = implode(',', [
                '"' . str_replace('"', '""', $applicant->fullName()) . '"',
                '"' . str_replace('"', '""', $applicant->email()) . '"',
                '"' . str_replace('"', '""', $applicant->phone()) . '"',
                '"' . str_replace('"', '""', $applicant->status()->value) . '"',
                '"' . $applicant->createdAt()->format('Y-m-d H:i:s') . '"',
            ]);
        }
        $zip->addFromString('pelamar.csv', implode("\n", $csvLines));

        // Tambah berkas CV dan portofolio
        $storagePath = rtrim(STORAGE_PATH, '/');
        foreach ($applicantList as $applicant) {
            $cvRelative = $applicant->cvPath();
            $cvFull     = $storagePath . '/' . $cvRelative;
            if ($cvRelative !== '' && is_file($cvFull)) {
                $zip->addFile($cvFull, 'cv/' . basename($cvFull));
            }

            $portfolioRelative = $applicant->portfolioPath();
            if ($portfolioRelative !== null && $portfolioRelative !== '') {
                $portfolioFull = $storagePath . '/' . $portfolioRelative;
                if (is_file($portfolioFull)) {
                    $zip->addFile($portfolioFull, 'portfolio/' . basename($portfolioFull));
                }
            }
        }

        $zip->close();

        // Nama file ZIP: arsip-<posisi>-<tanggal>.zip
        $safeName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $vacancy->position()) ?? 'lowongan';
        $date     = (new \DateTimeImmutable())->format('Ymd');
        $filename = 'arsip-' . $safeName . '-' . $date . '.zip';

        // Stream ZIP ke browser
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . (string) filesize($tmpZip));
        header('Cache-Control: no-store');
        readfile($tmpZip);
        @unlink($tmpZip);

        // Hapus semua data pelamar dan berkas fisik
        foreach ($applicantList as $applicant) {
            $this->storage->delete($applicant->cvPath());
            if ($applicant->portfolioPath() !== null) {
                $this->storage->delete($applicant->portfolioPath());
            }
            $this->applicants->delete((int) $applicant->id());
        }

        // Hapus lowongan
        $this->vacancies->delete($id);

        exit();
    }

    /** HR menutup lowongan secara manual. */
    public function close(User $actor, int $id): array
    {
        if ($actor->role !== Role::Hr) {
            throw new NotAllowed('Hanya HR yang dapat menutup lowongan.');
        }

        $row = $this->vacancies->findWithCounts($id);
        if ($row === null) {
            throw new NotFound('Lowongan tidak ditemukan.');
        }

        $vacancy = $row['vacancy'];
        $vacancy->close($actor);
        $this->vacancies->save($vacancy);

        $updated = $this->vacancies->findWithCounts($id);

        return VacancyView::from(
            $updated !== null ? $updated['vacancy'] : $vacancy,
            $updated['counts'] ?? [],
            $updated['mrfCode'] ?? $row['mrfCode'],
        );
    }

    /**
     * Dipakai endpoint publik pendaftaran. Tidak memerlukan autentikasi.
     * @return array<string,mixed>
     */
    public function getByToken(string $token): array
    {
        $vacancy = $this->vacancies->findByToken($token);
        if ($vacancy === null) {
            throw new NotFound('Lowongan tidak ditemukan.');
        }

        return [
            'position' => $vacancy->position(),
            'division' => $vacancy->division(),
            'status'   => $vacancy->status()->value,
        ];
    }
}
