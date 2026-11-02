<?php
declare(strict_types=1);
namespace App\Application\Recruitment;
use App\Application\Ports\{FileStorage, WorkforceStore, DocumentRenderer};
use App\Domain\Identity\{Role, User};
use App\Domain\Recruitment\{ApplicantRepository, VacancyRepository, VacancyStatus};
use App\Domain\Shared\{DomainRuleViolation, NotAllowed, NotFound};

final class ArchiveUseCases
{
    public function __construct(private WorkforceStore $store, private ApplicantRepository $applicants,
        private VacancyRepository $vacancies, private FileStorage $storage, private DocumentRenderer $documents) {}
    private function hr(User $u): void { if ($u->role!==Role::Hr) throw new NotAllowed('Hanya HR yang dapat menyiapkan atau membersihkan arsip.'); }
    private function snapshot(int $vacancyId): array
    {
        return array_map(function ($a) {
            return ['applicant'=>ApplicantView::from($a),'updatedAt'=>$a->updatedAt()->format(DATE_ATOM),
                'cv'=>$a->cvPath(),'portfolio'=>$a->portfolioPath(),'form'=>$this->applicants->findFormData((int)$a->id()),
                'selections'=>$this->applicants->findSelectionRecords((int)$a->id()),
                'documents'=>$this->store->list('applicant_documents',['applicant_id'=>$a->id()]),
                'offers'=>$this->store->list('offering_letters',['applicant_id'=>$a->id()])];
        },$this->applicants->findByVacancy($vacancyId));
    }
    public function prepare(User $actor, int $vacancyId): array
    {
        $this->hr($actor); $v=$this->vacancies->find($vacancyId);
        if (!$v || $v->status()===VacancyStatus::Open) throw new DomainRuleViolation('Tutup lowongan sebelum menyiapkan arsip.');
        $snapshot=$this->snapshot($vacancyId); $manifest=hash('sha256',json_encode($snapshot,JSON_THROW_ON_ERROR));
        foreach ($this->store->list('vacancy_archives',['vacancy_id'=>$vacancyId,'status'=>'ready']) as $existing) {
            if (hash_equals($existing['manifest_hash'],$manifest) && is_file($this->storage->absolutePath($existing['path']))) return $existing;
        }
        $tmp=tempnam(sys_get_temp_dir(),'hr_archive_'); if (!$tmp) throw new \RuntimeException('File sementara gagal.');
        $zip=new \ZipArchive();
        try {
            if ($zip->open($tmp,\ZipArchive::OVERWRITE)!==true) throw new \RuntimeException('Arsip gagal dibuat.');
            $zip->addFromString('manifest.json',json_encode(['vacancyId'=>$vacancyId,'position'=>$v->position(),'createdAt'=>date(DATE_ATOM),'applicants'=>$snapshot],JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR));
            $csv=fopen('php://temp','r+'); fputcsv($csv,['ID','Nama','Email','Nomor HP','Status'],',','"','');
            foreach ($snapshot as $entry) {
                $a=$entry['applicant']; $base='pelamar-' . $a['id'] . '/';
                $safe=static fn($s)=>preg_match('/^[=+@\-\t\r]/',(string)$s)?"'".$s:$s;
                fputcsv($csv,array_map($safe,[$a['id'],$a['fullName'],$a['email'],$a['phone'],$a['status']]),',','"','');
                $files=[$entry['cv'],$entry['portfolio']];
                if ($entry['form']) {
                    $form=$entry['form']; $files[]=$form['photo_path'];$files[]=$form['signature_path'];
                    $photo=!empty($form['photo_path'])?$this->storage->absolutePath($form['photo_path']):null;
                    $signature=!empty($form['signature_path'])?$this->storage->absolutePath($form['signature_path']):null;
                    $zip->addFromString($base.'form-pelamar.pdf',$this->documents->applicant($a+['position'=>$v->position()],$form,$photo,$signature));
                }
                foreach ($entry['documents'] as $doc) $files[]=$doc['file_path'];
                foreach ($entry['offers'] as $offer) {
                    $hr=$offer['hr_signature_path']??null; $ceo=$offer['ceo_signature_path']??null;
                    $zip->addFromString($base.'offering-letter-'.$offer['id'].'.pdf',$this->documents->offering([
                        'position'=>$offer['position'],'salary'=>$offer['salary'],'startDate'=>$offer['start_date'],'body'=>$offer['body'],
                    ],$a['fullName'],$hr?$this->storage->absolutePath($hr):null,$ceo?$this->storage->absolutePath($ceo):null));
                }
                foreach (array_unique(array_filter($files)) as $relative) {
                    $path=$this->storage->absolutePath($relative);
                    if (!is_file($path)) throw new DomainRuleViolation('Ada berkas yang hilang. Pembersihan dibatalkan: '.$relative);
                    $zip->addFile($path,$base.$relative);
                }
            }
            rewind($csv);$zip->addFromString('pelamar.csv',stream_get_contents($csv));fclose($csv);
            if (!$zip->close()) throw new \RuntimeException('Arsip gagal diselesaikan.');
            $content=(string)file_get_contents($tmp);$checksum=hash('sha256',$content);
            $path=$this->storage->storeContent('archives','zip',$content);
            $id=$this->store->insert('vacancy_archives',['vacancy_id'=>$vacancyId,'path'=>$path,'checksum'=>$checksum,'manifest_hash'=>$manifest,'status'=>'ready','created_by'=>$actor->id,'created_at'=>date('Y-m-d H:i:s')]);
            return $this->store->find('vacancy_archives',$id);
        } finally { if (is_file($tmp)) unlink($tmp); }
    }
    public function downloadForVacancy(User $actor, int $vacancyId): void
    {
        $this->hr($actor);
        $old=$this->store->list('vacancy_archives',['vacancy_id'=>$vacancyId]);
        $row=$old && $old[0]['status']==='purged' && !$this->applicants->findByVacancy($vacancyId) ? $old[0] : $this->prepare($actor,$vacancyId);
        $this->download($actor,(int)$row['id']);
    }
    public function download(User $actor, int $id): void
    {
        if (!$actor->hasRole(Role::Hr,Role::SuperAdmin)) throw new NotAllowed('Akses arsip ditolak.');
        $r=$this->store->find('vacancy_archives',$id);if(!$r)throw new NotFound('Arsip tidak ditemukan.');
        $path=$this->storage->absolutePath($r['path']);
        if (!is_file($path)||!hash_equals($r['checksum'],hash_file('sha256',$path))) throw new DomainRuleViolation('Arsip tidak tersedia atau checksum berubah.');
        header('Content-Type: application/zip');header('Content-Disposition: attachment; filename="arsip-lowongan-'.$r['vacancy_id'].'.zip"');
        header('Cache-Control: private, no-store');header('X-Archive-Id: '.$id);header('X-Archive-Checksum: '.$r['checksum']);
        readfile($path);exit();
    }
    public function purge(User $actor, int $id, string $checksum): void
    {
        $this->hr($actor);
        $files=[];
        $this->store->transaction(function () use ($actor,$id,$checksum,&$files) {
            $r=$this->store->find('vacancy_archives',$id,true);
            if (!$r || $r['status']!=='ready' || !hash_equals($r['checksum'],$checksum)) throw new DomainRuleViolation('Konfirmasi arsip tidak valid.');
            $path=$this->storage->absolutePath($r['path']);
            if (!is_file($path)||!hash_equals($checksum,hash_file('sha256',$path))) throw new DomainRuleViolation('Salinan arsip lengkap harus tersedia sebelum pembersihan.');
            foreach($this->applicants->findByVacancy((int)$r['vacancy_id']) as $a) $this->store->find('applicants',(int)$a->id(),true);
            $snapshot=$this->snapshot((int)$r['vacancy_id']);
            if (!hash_equals($r['manifest_hash'],hash('sha256',json_encode($snapshot,JSON_THROW_ON_ERROR)))) throw new DomainRuleViolation('Data berubah sejak arsip dibuat. Unduh arsip terbaru dahulu.');
            foreach ($snapshot as $entry) {
                if ($entry['applicant']['status'] === 'accepted') throw new DomainRuleViolation('Mulai onboarding kandidat yang menerima OL sebelum membersihkan data pelamar.');
                if ($entry['applicant']['status'] === 'offered') throw new DomainRuleViolation('Masih ada kandidat yang menunggu respons OL. Selesaikan penawaran sebelum membersihkan data.');
            }
            foreach ($snapshot as $entry) {
                $applicantId=(int)$entry['applicant']['id'];
                $retained=$this->store->list('talent_pool',['applicant_id'=>$applicantId]);
                if (!$retained) {
                    array_push($files,...array_filter([$entry['cv'],$entry['portfolio'],$entry['form']['photo_path']??null,$entry['form']['signature_path']??null]));
                    foreach($entry['documents'] as $d)$files[]=$d['file_path'];
                }
                foreach($entry['documents'] as $d)$this->store->delete('applicant_documents',(int)$d['id']);
                $this->applicants->delete($applicantId);
            }
            $v=$this->vacancies->find((int)$r['vacancy_id']);
            if ($v && $v->status()===VacancyStatus::Closed) { $v->archive($actor);$this->vacancies->save($v); }
            $this->store->update('vacancy_archives',$id,['status'=>'purged','purged_at'=>date('Y-m-d H:i:s')]);
        });
        foreach(array_unique($files) as $file)$this->storage->delete($file);
        // MRF, approval history, encrypted archive, and employee master records are preserved.
    }
}
