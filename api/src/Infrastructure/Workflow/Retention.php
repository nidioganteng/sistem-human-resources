<?php
declare(strict_types=1);
namespace App\Infrastructure\Workflow;
use App\Application\Ports\{WorkforceStore, FileStorage};
use App\Domain\Recruitment\ApplicantRepository;

final class Retention
{
    public function __construct(private WorkforceStore $store,private FileStorage $storage,private ApplicantRepository $applicants) {}
    public function run(bool $apply): int
    {
        $count=0;
        foreach($this->store->list('talent_pool',[],5000) as $row){
            if($row['expires_at']>date('Y-m-d H:i:s'))continue;
            $count++;
            if(!$apply)continue;
            $live=!empty($row['applicant_id'])?$this->applicants->find((int)$row['applicant_id']):null;
            if(!$live){
                $p=$row['payload'];$form=$p['form']??[];
                $files=array_filter([$p['cvPath']??null,$p['portfolioPath']??null,$form['photo_path']??null,$form['signature_path']??null]);
                foreach($p['documents']??[] as $d)$files[]=$d['file_path'];
                foreach(array_unique($files) as $file)$this->storage->delete($file);
            }
            $this->store->delete('talent_pool',(int)$row['id']);
        }
        return $count;
    }
}
