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
        private ArchiveUseCases $archives,
    ) {}

    /** @return array<int,array<string,mixed>> */
    public function list(User $actor): array
    {
        if (!$actor->hasRole(Role::Hr, Role::SuperAdmin)) {
            throw new NotAllowed('Anda tidak memiliki akses melihat daftar lowongan.');
        }

        return array_map(
            static fn (array $row) => VacancyView::from($row['vacancy'], $row['counts'], $row['mrfCode']),
            $this->vacancies->findAllWithCounts(),
        );
    }

    /** @return array<string,mixed> */
    public function get(User $actor, int $id): array
    {
        if (!$actor->hasRole(Role::Hr, Role::SuperAdmin, Role::Manajer, Role::Pic)) {
            throw new NotAllowed('Anda tidak memiliki akses melihat lowongan.');
        }

        $row = $this->vacancies->findWithCounts($id);
        if ($row === null) {
            throw new NotFound('Lowongan tidak ditemukan.');
        }

        if ($actor->hasRole(Role::Manajer, Role::Pic) && $row['vacancy']->division() !== $actor->division) {
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
     * HR mengunduh arsip ZIP lengkap. Pembersihan dilakukan melalui endpoint
     * terpisah setelah verifikasi arsip dan penyelesaian proses kandidat.
     *
     * Method ini langsung menulis ke output PHP (header + readfile) lalu exit().
     * Tidak mengembalikan Response karena streaming binary tidak bisa dibungkus Response JSON.
     */
    public function streamArchiveAndDelete(User $actor, int $id): void
    {
$this->archives->downloadForVacancy($actor,$id);
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
        if ($vacancy->status() === VacancyStatus::Open) {
            $vacancy->close($actor);
            $this->vacancies->save($vacancy);
        }
        $archive=$this->archives->prepare($actor,$id);

        $updated = $this->vacancies->findWithCounts($id);

        return VacancyView::from(
            $updated !== null ? $updated['vacancy'] : $vacancy,
            $updated['counts'] ?? [],
            $updated['mrfCode'] ?? $row['mrfCode'],
        ) + ['archiveId'=>(int)$archive['id'],'archiveChecksum'=>$archive['checksum']];
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
