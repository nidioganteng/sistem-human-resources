<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit('CLI only');
define('APP_ENTRY',true);require dirname(__DIR__).'/src/bootstrap.php';
$c=\App\Infrastructure\Wiring::build();
$job=new \App\Infrastructure\Workflow\Retention($c->get(\App\Application\Ports\WorkforceStore::class),$c->get(\App\Application\Ports\FileStorage::class),$c->get(\App\Domain\Recruitment\ApplicantRepository::class));
$apply=in_array('--apply',$argv,true);
echo ($apply?'Dibersihkan: ':'Akan dibersihkan (dry run): ').$job->run($apply)." entri talent pool kedaluwarsa.\n";
