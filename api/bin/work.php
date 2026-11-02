<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') exit('CLI only');
define('APP_ENTRY',true);
require dirname(__DIR__) . '/src/bootstrap.php';
use App\Infrastructure\Wiring;
use App\Application\Ports\WorkforceStore;
use App\Infrastructure\Mail\{LogMailer, SmtpMailer};

$c=Wiring::build(); $store=$c->get(WorkforceStore::class);
$mailer=APP_ENV==='local'?new LogMailer():new SmtpMailer();
$retention=new \App\Infrastructure\Workflow\Retention($store,$c->get(\App\Application\Ports\FileStorage::class),$c->get(\App\Domain\Recruitment\ApplicantRepository::class));
$lastRetention=0;
$watch=in_array('--watch',$argv,true);
do {
    if(time()-$lastRetention>=3600){$retention->run(true);$lastRetention=time();}
    foreach ($store->list('email_outbox',['status'=>'processing'],100) as $row) {
        if (($row['locked_at']??date('Y-m-d H:i:s')) < date('Y-m-d H:i:s',time()-300)) {
            $store->update('email_outbox',(int)$row['id'],['status'=>'pending','locked_at'=>null]);
        }
    }
    foreach ($store->list('email_outbox',['status'=>'pending'],500) as $candidate) {
        if ($candidate['available_at']>date('Y-m-d H:i:s')) continue;
        $row=$store->transaction(function () use ($store,$candidate) {
            $row=$store->find('email_outbox',(int)$candidate['id'],true);
            if (!$row || $row['status']!=='pending') return null;
            $store->update('email_outbox',(int)$row['id'],['status'=>'processing','locked_at'=>date('Y-m-d H:i:s'),'attempts'=>(int)$row['attempts']+1]);
            return $row;
        });
        if (!$row) continue;
        try {
            $mailer->send($row['recipient'],$row['subject'],$row['payload']['body']);
            $store->update('email_outbox',(int)$row['id'],['status'=>'sent','sent_at'=>date('Y-m-d H:i:s'),'last_error'=>null]);
        } catch (Throwable $e) {
            $attempt=(int)$row['attempts']+1;
            $store->update('email_outbox',(int)$row['id'],['status'=>$attempt>=5?'failed':'pending',
                'available_at'=>date('Y-m-d H:i:s',time()+min(3600,30*(2**$attempt))),
                'last_error'=>substr($e->getMessage(),0,1000)]);
        }
    }
    if ($watch) sleep(5);
} while ($watch);
echo "Antrean email selesai diproses.\n";
