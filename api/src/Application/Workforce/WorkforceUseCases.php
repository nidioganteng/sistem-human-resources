<?php
declare(strict_types=1);
namespace App\Application\Workforce;

use App\Application\Ports\{WorkforceStore, FileStorage};
use App\Application\Employee\{EmployeeUseCases, EmployeeView};
use App\Domain\Employee\EmployeeRepository;
use App\Domain\Identity\{Role, User};
use App\Domain\Recruitment\ApplicantRepository;
use App\Domain\Shared\{DomainRuleViolation, NotAllowed, NotFound};
use DateTimeImmutable;

final class WorkforceUseCases
{
    public function __construct(private WorkforceStore $store, private EmployeeRepository $employees,
        private EmployeeUseCases $employeeActions, private ApplicantRepository $applicants,
        private Notifications $notifications, private FileStorage $storage) {}

    private function hr(User $actor): void
    {
        if (!$actor->hasRole(Role::Hr,Role::SuperAdmin)) throw new NotAllowed('Hanya HR atau CEO yang dapat mengelola modul ini.');
    }
    public static function employeeHash(\App\Domain\Employee\Employee $employee): string
    {
        return hash('sha256', json_encode(EmployeeView::from($employee), JSON_THROW_ON_ERROR));
    }
    public function list(User $actor, string $module): array
    {
        $this->hr($actor);
        if ($module === 'changes') {
            return $this->store->list('employee_change_requests', $actor->role === Role::Hr ? ['requested_by'=>$actor->id] : []);
        }
        if ($module === 'archives') return array_map(static function($r){unset($r['path']);return $r+['payload'=>['vacancyId'=>$r['vacancy_id'],'checksum'=>$r['checksum']]];}, $this->store->list('vacancy_archives'));
        if ($module === 'talent') return $this->store->list('talent_pool');
        if (!in_array($module,['discipline','career','offboarding'],true)) throw new NotFound('Modul tidak ditemukan.');
        return $this->store->list('employee_records',['category'=>$module]);
    }
    public function createRecord(User $actor, string $category, array $input, ?string $filePath): array
    {
        $this->hr($actor);
        $employeeId = (int) ($input['employeeId'] ?? 0);
        $e = $this->employees->find($employeeId);
        if (!$e) throw new NotFound('Karyawan tidak ditemukan.');
        $kind = (string) ($input['kind'] ?? '');
        $kinds = ['discipline'=>['verbal','written','SP1','SP2','SP3'], 'career'=>['promotion','demotion','decree'], 'offboarding'=>['resignation']];
        if (!isset($kinds[$category]) || !in_array($kind,$kinds[$category],true)) throw new DomainRuleViolation('Jenis riwayat tidak valid.');
        $date = (string) ($input['date'] ?? '');
        $d = DateTimeImmutable::createFromFormat('!Y-m-d',$date);
        if (!$d || $d->format('Y-m-d') !== $date) throw new DomainRuleViolation('Tanggal tidak valid.');
        $notes = trim((string) ($input['notes'] ?? ''));
        if ($notes === '') throw new DomainRuleViolation('Keterangan wajib diisi.');
        if (str_starts_with($kind,'SP') && !$filePath) throw new DomainRuleViolation('Surat peringatan wajib dilampirkan dalam PDF.');
        $payload = ['employeeName'=>$e->fullName(),'date'=>$date,'notes'=>$notes,'filePath'=>$filePath];
        if ($category === 'career') {
            $payload['position'] = trim((string) ($input['position'] ?? ''));
            if ($payload['position'] === '') throw new DomainRuleViolation('Jabatan wajib diisi.');
        }
        if ($category === 'offboarding') {
            if ($e->status()->value !== 'active') throw new DomainRuleViolation('Offboarding hanya untuk karyawan aktif.');
            if ($this->store->list('employee_records',['employee_id'=>$employeeId,'category'=>'offboarding','status'=>'open'])) {
                throw new DomainRuleViolation('Offboarding karyawan ini sudah dibuka.');
            }
            $exit = DateTimeImmutable::createFromFormat('!Y-m-d',(string) ($input['lastDay'] ?? ''));
            if (!$exit || $exit->format('Y-m-d') !== ($input['lastDay'] ?? '') || $exit < $d->modify('+1 month')) {
                throw new DomainRuleViolation('Hari terakhir minimal satu bulan setelah tanggal pengunduran diri.');
            }
            $payload['lastDay'] = $exit->format('Y-m-d');
            $payload['assets'] = ['Aset perusahaan'=>false,'Dokumen dan pekerjaan'=>false,'Akses aplikasi'=>false];
        }
        $id = $this->store->insert('employee_records',[
            'employee_id'=>$employeeId,'category'=>$category,'kind'=>$kind,
            'status'=>$category === 'offboarding' ? 'open' : 'recorded','payload'=>$payload,
            'created_by'=>$actor->id,'created_at'=>date('Y-m-d H:i:s'),
        ]);
        $this->notifications->toRoles(['super_admin'],'employee_record','Riwayat karyawan diperbarui', ['message'=>$e->fullName() . ': ' . $kind,'recordId'=>$id]);
        return $this->store->find('employee_records',$id);
    }
    public function completeOffboarding(User $actor, int $id, array $assets): array
    {
        $this->hr($actor);
        return $this->store->transaction(function () use ($actor,$id,$assets) {
            $row = $this->store->find('employee_records',$id,true);
            if (!$row || $row['category'] !== 'offboarding' || $row['status'] !== 'open') throw new NotFound('Offboarding aktif tidak ditemukan.');
            foreach (array_keys($row['payload']['assets']) as $key) {
                if (($assets[$key] ?? false) !== true) throw new DomainRuleViolation('Seluruh ceklis serah terima harus selesai.');
            }
            if ($row['payload']['lastDay'] > date('Y-m-d')) throw new DomainRuleViolation('Offboarding diselesaikan pada atau setelah hari terakhir.');
            $this->store->find('employees',(int)$row['employee_id'],true);
            $e = $this->employees->find((int) $row['employee_id']);
            if (!$e) throw new NotFound('Karyawan tidak ditemukan.');
            $e->deactivate($actor); $this->employees->save($e);
            $this->store->update('employees',(int) $e->id(),['barcode_active'=>0]);
            $payload = $row['payload']; $payload['assets'] = $assets; $payload['barcodeActive'] = false;
            $this->store->update('employee_records',$id,['status'=>'completed','completed_at'=>date('Y-m-d H:i:s'),'payload'=>$payload]);
            $this->notifications->toRoles(['hr','super_admin'],'offboarding','Offboarding selesai',['message'=>$e->fullName(),'employeeId'=>$e->id()]);
            return $this->store->find('employee_records',$id);
        });
    }
    public function addTalent(User $actor, int $applicantId): array
    {
        $this->hr($actor);
        $a = $this->applicants->find($applicantId);
        if (!$a) throw new NotFound('Pelamar tidak ditemukan.');
        if ($this->store->list('talent_pool',['applicant_id'=>$applicantId])) throw new DomainRuleViolation('Kandidat sudah berada di talent pool.');
        $payload = ['fullName'=>$a->fullName(),'email'=>$a->email(),'phone'=>$a->phone(),'status'=>$a->status()->value,
            'cvPath'=>$a->cvPath(),'portfolioPath'=>$a->portfolioPath(),'form'=>$this->applicants->findFormData($applicantId),
            'documents'=>$this->store->list('applicant_documents',['applicant_id'=>$applicantId])];
        $id = $this->store->insert('talent_pool',['applicant_id'=>$applicantId,'payload'=>$payload,'added_by'=>$actor->id,
            'created_at'=>date('Y-m-d H:i:s'),'expires_at'=>(new DateTimeImmutable('+2 years'))->format('Y-m-d H:i:s')]);
        return $this->store->find('talent_pool',$id);
    }
    public function decideChange(User $actor, int $id, bool $approve, string $comment): array
    {
        if ($actor->role !== Role::SuperAdmin) throw new NotAllowed('Hanya CEO yang dapat memutuskan perubahan data sensitif.');
        return $this->store->transaction(function () use ($actor,$id,$approve,$comment) {
            $row = $this->store->find('employee_change_requests',$id,true);
            if (!$row || $row['status'] !== 'pending') throw new NotFound('Permintaan perubahan tidak ditemukan atau sudah diputuskan.');
            if (!$approve && trim($comment) === '') throw new DomainRuleViolation('Alasan penolakan wajib diisi.');
            $this->store->find('employees',(int)$row['employee_id'],true);
            $e = $this->employees->find((int) $row['employee_id']);
            if (!$e) throw new NotFound('Karyawan tidak ditemukan.');
            if ($approve) {
                if (!hash_equals($row['snapshot_hash'],self::employeeHash($e))) throw new DomainRuleViolation('Data karyawan sudah berubah. Tolak permintaan dan minta HR mengajukan ulang.');
                $v = $row['payload'];
                $this->employeeActions->update($actor,(int) $e->id(),$v['nik'],$v['email'],$v['phone'],$v['position'],$v['division'],$v['employmentStatus'],$v['salary'],$v['contractStart'],$v['contractEnd'],$v['personalData']);
            }
            $this->store->update('employee_change_requests',$id,['status'=>$approve?'approved':'rejected','reviewed_by'=>$actor->id,'reviewed_at'=>date('Y-m-d H:i:s'),'comment'=>$comment]);
            $this->notifications->toRoles(['hr'],'employee_change','Keputusan perubahan data karyawan',['message'=>$e->fullName() . ': ' . ($approve?'disetujui':'ditolak'),'changeId'=>$id]);
            return $this->store->find('employee_change_requests',$id);
        });
    }
    public function talentFile(User $actor, int $id, string $type): string
    {
        $this->hr($actor);
        $row = $this->store->find('talent_pool',$id);
        if (!$row || $row['expires_at'] < date('Y-m-d H:i:s')) throw new NotFound('Talent pool tidak tersedia atau masa retensinya berakhir.');
        $payload = $row['payload'];
        $path = match ($type) {
            'cv' => $payload['cvPath'] ?? null,
            'portfolio' => $payload['portfolioPath'] ?? null,
            'certificate' => $payload['documents'][0]['file_path'] ?? null,
            default => null,
        };
        if (!$path || !is_file($this->storage->absolutePath($path))) throw new NotFound('Berkas kandidat tidak tersedia.');
        return $this->storage->absolutePath($path);
    }
    public function recordFile(User $actor, int $id): string
    {
        $this->hr($actor); $r=$this->store->find('employee_records',$id);
        if (!$r || empty($r['payload']['filePath'])) throw new NotFound('Berkas tidak ditemukan.');
        return $this->storage->absolutePath($r['payload']['filePath']);
    }
    public function setSignature(User $actor, string $path): void
    {
        $this->hr($actor);
        // Do not delete earlier files: approved letters retain a signature snapshot.
        $this->store->update('users',$actor->id,['signature_path'=>$path]);
    }
}
