<?php
declare(strict_types=1);
// Unit checks always run. --mysql creates and drops a NEW isolated database only.
// Override TEST_DB_HOST, TEST_DB_PORT, TEST_DB_USER, TEST_DB_PASSWORD if necessary.
$root=dirname(__DIR__);
ob_start();
spl_autoload_register(static function($class) use($root){if(str_starts_with($class,'App\\'))require $root.'/api/src/'.str_replace('\\','/',substr($class,4)).'.php';});
require $root.'/api/vendor/autoload.php';
date_default_timezone_set('Asia/Makassar');
define('DATA_ENCRYPTION_KEY',bin2hex(random_bytes(32)));
define('PAYROLL_API_TOKEN',str_repeat('test-payroll-',4));
$tmp=sys_get_temp_dir().'/hr-v2-test-'.bin2hex(random_bytes(8));mkdir($tmp,0700,true);define('STORAGE_PATH',$tmp);
use App\Domain\Identity\{User,Role,DivisionType};
use App\Domain\Recruitment\{SelectionPolicy,Mrf,MrfSpec,EmploymentStatus,SelectionTrack};
use App\Domain\Employee\Employee;
use App\Infrastructure\Security\DataCipher;
use App\Infrastructure\Storage\LocalFileStorage;
use App\Infrastructure\Documents\CompanyPdf;
use App\Infrastructure\Workflow\{PdoWorkforceStore,Retention};
use App\Infrastructure\Persistence\{PdoApplicantRepository,PdoEmployeeRepository,PdoMrfRepository,PdoVacancyRepository,PdoUserRepository,PdoAuditLog};
use App\Infrastructure\Mail\OutboxMailer;
use App\Application\Workforce\{Notifications,WorkforceUseCases};
use App\Application\Employee\EmployeeUseCases;
use App\Application\Recruitment\{ApplicantUseCases,OfferingLetterUseCases,VacancyUseCases,ArchiveUseCases};
use App\Presentation\Http\{Request,HttpException};
use App\Presentation\Http\Controllers\PayrollController;
$checks=0;
function ok(bool $value,string $label):void{global $checks;if(!$value)throw new RuntimeException('FAIL: '.$label);$checks++;echo "PASS {$label}\n";}
function fails(callable $f,string $label):void{try{$f();}catch(\App\Domain\Shared\DomainRuleViolation|\App\Domain\Shared\NotAllowed|\App\Domain\Shared\NotFound|HttpException $e){ok(true,$label);return;}throw new RuntimeException('FAIL: '.$label);}
$actor=static fn($id,$role,$division=null)=>new User($id,'Test '.$role->value,$role->value.'@example.test','',$role,$division,$division?DivisionType::Teknis:null,true);
$hr=$actor(1,Role::Hr);$ceo=$actor(2,Role::SuperAdmin);$pic=$actor(3,Role::Pic,'Sipil');$manager=$actor(4,Role::Manajer,'Sipil');
$cipher=new DataCipher();$storage=new LocalFileStorage($cipher);$pdf=new CompanyPdf();
$private=['nik'=>'1234567890123456','bank_account'=>'00000123','full_name'=>'Karyawan Uji'];
$sealed=$cipher->encrypt($private);ok($cipher->decrypt($sealed)===$private,'AES-GCM round trip');
try{$cipher->decrypt(substr($sealed,0,-4).'AAAA');throw new RuntimeException('Tamper accepted');}catch(RuntimeException $e){ok($e->getMessage()!=='Tamper accepted','Ciphertext tamper rejected');}
SelectionPolicy::assertCanRecord($pic,'normal','competency_test',[]);ok(true,'PIC may assess technical test');
fails(fn()=>SelectionPolicy::assertCanRecord($hr,'normal','competency_test',[]),'HR cannot impersonate technical assessor');
fails(fn()=>SelectionPolicy::assertCanRecord($manager,'normal','interview',[]),'Manager cannot record interview');
fails(fn()=>SelectionPolicy::assertCanRecord($hr,'normal','interview',[]),'Normal track requires prior competency pass');
SelectionPolicy::assertCanRecord($hr,'normal','interview',[['stage'=>'competency_test','result'=>'pass']]);ok(true,'Normal interview allowed after passing test');
fails(fn()=>SelectionPolicy::assertCanRecord($pic,'fast','competency_test',[]),'Fast track excludes technical test');
fails(fn()=>SelectionPolicy::assertCanRecord($hr,'fast','interview',[['stage'=>'interview','result'=>'pass']]),'Duplicate stage rejected');
$e=Employee::create($hr,'Karyawan Uji','Engineer','Sipil','PKWTT',10000000,null);
fails(fn()=>$e->validate($hr,[]),'Incomplete onboarding cannot be validated');
$spec=new MrfSpec('Engineer','Tugas','S1','Keahlian','Pengalaman',1,EmploymentStatus::Pkwtt,SelectionTrack::Normal);
$m=Mrf::create($pic,$spec);$m->submit($pic);$m->approve($manager);$m->approve($ceo);ok($m->canBeViewedBy($hr),'PIC > Manager > CEO > HR workflow preserved');
$doc=$pdf->applicant(['fullName'=>'Pelamar Uji','email'=>'uji@example.test','phone'=>'0800','position'=>'Engineer'],['data'=>['identitas'=>['nama'=>'Pelamar Uji'],'pengalaman'=>array_fill(0,40,'Pengalaman kerja untuk menguji halaman PDF.')],'expected_salary'=>10000000],null,null);
ok(str_starts_with($doc,'%PDF-'),'Applicant document is a PDF');file_put_contents($tmp.'/applicant-unit.pdf',$doc);
$path=$storage->storeContent('archives','zip','test archive');ok(str_starts_with(file_get_contents($tmp.'/'.$path),'HRFILE1'),'Archive encrypted on disk');ok(file_get_contents($storage->absolutePath($path))==='test archive','Archive decrypted for download');
$sensitive=$storage->storeContent('employee-docs','pdf','private employee document');
ok(str_starts_with(file_get_contents($tmp.'/'.$sensitive),'HRFILE1') && file_get_contents($storage->absolutePath($sensitive))==='private employee document','Generated employee documents encrypted and readable');
$pdo=null;$db=null;
try{
 if(in_array('--mysql',$argv,true)){
  $pdo=new PDO('mysql:host='.(getenv('TEST_DB_HOST')?:'127.0.0.1').';port='.(getenv('TEST_DB_PORT')?:'3307').';charset=utf8mb4',getenv('TEST_DB_USER')?:'root',getenv('TEST_DB_PASSWORD')?:'',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
  $db='hr_v2_test_'.bin2hex(random_bytes(6));$pdo->exec('CREATE DATABASE `'.$db.'` CHARACTER SET utf8mb4');$pdo->exec('USE `'.$db.'`');
  $pdo->exec(file_get_contents($root.'/database/schema.sql'));$migration=file_get_contents($root.'/database/migrations/2026-10-29-hr-spec-v2.sql');$pdo->exec($migration);$pdo->exec($migration);ok(true,'Fresh schema and v2 migration can resume safely');
  $st=$pdo->prepare('INSERT INTO users(name,email,password_hash,role,division,division_type) VALUES(?,?,?,?,?,?)');
  $actors=[];foreach([$hr,$ceo,$pic,$manager,$actor(5,Role::Manajer,'Arsitektur')] as $u){$st->execute([$u->name,$u->email.($u->division??''),password_hash('test-only',PASSWORD_DEFAULT),$u->role->value,$u->division,$u->divisionType?->value]);$actors[]=new User((int)$pdo->lastInsertId(),$u->name,$u->email,'',$u->role,$u->division,$u->divisionType,true);}
  [$hr,$ceo,$pic,$manager,$otherManager]=$actors;
  $store=new PdoWorkforceStore($pdo,$cipher);$mail=new OutboxMailer($store);$notifications=new Notifications($store,$mail);
  $apps=new PdoApplicantRepository($pdo);$emps=new PdoEmployeeRepository($pdo,$cipher);$mrfs=new PdoMrfRepository($pdo);$vacs=new PdoVacancyRepository($pdo);$users=new PdoUserRepository($pdo);
  $employeeActions=new EmployeeUseCases($emps,$storage,new PdoAuditLog($pdo,$cipher),$store,$notifications,$mail);
  $workforce=new WorkforceUseCases($store,$emps,$employeeActions,$apps,$notifications,$storage);
  $archives=new ArchiveUseCases($store,$apps,$vacs,$storage,$pdf);$vacancyActions=new VacancyUseCases($vacs,$mrfs,$apps,$storage,$archives);
  $ols=new \App\Infrastructure\Persistence\PdoOfferingLetterRepository($pdo);
  $appActions=new ApplicantUseCases($apps,$vacs,$mrfs,$storage,$mail,$emps,$ols,$store,$notifications,$pdf);
  $offerActions=new OfferingLetterUseCases($ols,$apps,$vacs,$storage,$mail,$users,$store,$notifications,$pdf);
  $m=Mrf::create($pic,$spec);$m->submit($pic);$m->approve($manager);$m->approve($ceo);$mrfs->save($m);
  $vac=$vacancyActions->open($hr,(int)$m->id());$cv=$storage->storeContent('cv','pdf',$doc);
  $a=$appActions->register($vac['publicToken'],'Pelamar Uji','candidate@example.test','0800',$cv,null);
  fails(fn()=>$appActions->getForHr($otherManager,$a['id']),'Cross-division applicant access blocked');
  fails(fn()=>$appActions->getFormData($otherManager,$a['id']),'Cross-division form access blocked');
  fails(fn()=>$appActions->getSelectionRecords($otherManager,$a['id']),'Cross-division selection history blocked');
  $brokenMail=new class implements \App\Application\Ports\Mailer {public function send(string $to,string $subject,string $body):void{throw new RuntimeException('Outbox unavailable');}};
  $brokenActions=new ApplicantUseCases($apps,$vacs,$mrfs,$storage,$brokenMail,$emps,$ols,$store,$notifications,$pdf);
  try{$brokenActions->approve($hr,$a['id'],'http://localhost:5174');throw new LogicException('Expected mail failure');}catch(RuntimeException $error){ok($apps->find($a['id'])->status()->value==='new','Outbox failure rolls back approval and form token');}
  $appActions->approve($hr,$a['id'],'http://localhost:5174');ok(count($store->list('email_outbox'))===1,'Approval email durably queued');
  $image=imagecreatetruecolor(120,40);$white=imagecolorallocate($image,255,255,255);imagefill($image,0,0,$white);imageline($image,10,25,110,10,imagecolorallocate($image,0,0,0));ob_start();imagepng($image);$png=ob_get_clean();unset($image);
  $sig=$storage->storeContent('signature','png',$png);$photo=$storage->storeContent('photo','png',$png);
  $apps->submitForm($a['id'],json_encode(['identitas'=>['nama'=>'Pelamar Uji','tanggal_lahir'=>'1990-01-01','tempat_lahir'=>'Denpasar','alamat_tinggal'=>'Alamat uji','no_identitas'=>'1234567890123456'],'pendidikan'=>[['sekolah'=>'Sekolah Uji']]]),10000000,$photo,$sig);
  $appActions->shortlist($manager,$a['id']);$appActions->callToSelection($hr,$a['id']);
  fails(fn()=>$appActions->recordSelectionResult($hr,$a['id'],'interview','pass',null),'Normal-track backend rejects skipped competency test');
  $appActions->recordSelectionResult($pic,$a['id'],'competency_test','pass','Hasil teknis');$result=$appActions->recordSelectionResult($hr,$a['id'],'interview','pass','Hasil wawancara');ok($result['status']==='offer_pending','Technical pass then interview advances to offering');
  $workforce->setSignature($hr,$sig);$workforce->setSignature($ceo,$sig);
  $ol=$offerActions->create($hr,$a['id'],'Engineer',10000000,date('Y-m-d'),'Penawaran resmi untuk posisi Engineer.');$offerActions->submit($hr,$ol['id']);$offerActions->approve($ceo,$ol['id']);
  $signedPdf=$offerActions->pdf($hr,$ol['id']);file_put_contents($tmp.'/offering.pdf',$signedPdf);ok(str_contains($signedPdf,'/Subtype /Image'),'Offering PDF embeds actual logo and signature images');
  $sent=$offerActions->send($hr,$ol['id'],'http://localhost:5174');$offerActions->respond($sent['responseToken'],'contact');ok(count($store->list('hr_notifications',['kind'=>'offer_negotiation']))>0,'Contact HR creates a real notification');
  ok($vacs->find($vac['id'])->isOpen(),'Negotiation keeps public registration open');
  $secondCv=$storage->storeContent('cv','pdf',$doc);
  $second=$appActions->register($vac['publicToken'],'Pelamar Kedua','second@example.test','0802',$secondCv,null);
  $store->update('applicants',$second['id'],['status'=>'offer_pending']);
  $secondOl=$offerActions->create($hr,$second['id'],'Engineer',9000000,date('Y-m-d'),'Penawaran kandidat kedua.');
  $offerActions->submit($hr,$secondOl['id']);$offerActions->approve($ceo,$secondOl['id']);$secondSent=$offerActions->send($hr,$secondOl['id'],'http://localhost:5174');
  $offerActions->respond($sent['responseToken'],'accept');
  ok($vacs->find($vac['id'])->status()->value==='closed','Accepting OL automatically closes public registration');
  ok($apps->find($a['id'])!==null&&$ols->find($secondOl['id'])->status()->value==='sent','Acceptance preserves candidate data and other outstanding offers');
  $blocked=$archives->prepare($hr,$vac['id']);
  fails(fn()=>$archives->purge($hr,(int)$blocked['id'],$blocked['checksum']),'Accepted candidate cannot be purged before onboarding transfer');
  $lateCv=$storage->storeContent('cv','pdf',$doc);
  fails(fn()=>$appActions->register($vac['publicToken'],'Pelamar Terlambat','late@example.test','0803',$lateCv,null),'New applications blocked after accepted OL');
  $employee=$appActions->hire($hr,$a['id']);ok($employee['employmentStatus']==='PKWTT','Hire preserves employment status from MRF');
  fails(fn()=>$appActions->hire($hr,$a['id']),'Repeated hire cannot duplicate employee');
  ok($employee['status']==='onboarding'&&$employee['email']==='candidate@example.test'&&$employee['personalData']['birth_place']==='Denpasar','Start onboarding transfers candidate contacts and form data without activating employee');
  ok($employee['contractStart']===date('Y-m-d'),'Onboarding carries the start date from accepted OL');
  $blocked=$archives->prepare($hr,$vac['id']);
  fails(fn()=>$archives->purge($hr,(int)$blocked['id'],$blocked['checksum']),'Pending offers prevent archive cleanup after onboarding transfer');
  $offerActions->respond($secondSent['responseToken'],'decline');
  ok($vacs->find($vac['id'])->status()->value==='closed','Other candidate may decline after closure without reopening vacancy');

  $raw=$pdo->query('SELECT * FROM employees LIMIT 1')->fetch();ok($raw['nik']===null&&$raw['salary']===null&&str_starts_with($raw['private_data'],'v1:'),'Private employee fields encrypted in MySQL');
  $link=$employeeActions->generateOnboardingLink($hr,$employee['id'],'http://localhost:5174');$token=basename($link['onboardingUrl']);
  ok($link['emailQueued']===true,'Generating onboarding link queues an invitation email');
  $prefill=$employeeActions->getPublic($token);
  ok($prefill['nik']==='1234567890123456'&&$prefill['email']==='candidate@example.test'&&$prefill['personalData']['address']==='Alamat uji','Public onboarding is prefilled from candidate data');

  $employeeActions->submitOnboarding($token,'1234567890123456','candidate@example.test','0800',['birth_date'=>'1990-01-01','birth_place'=>'Denpasar','address'=>'Alamat uji','bank_account'=>'000123','ptkp_status'=>'TK/0']);
  fails(fn()=>$employeeActions->validate($hr,$employee['id']),'HR cannot activate employee without required documents');
  foreach(['ktp','kk','npwp','bpjs','ijazah','foto'] as $type){$f=$storage->storeContent('employee-docs',$type==='foto'?'png':'pdf',$type==='foto'?$png:$doc);$employeeActions->uploadDocument($token,$type,$f);}
  $employeeActions->validate($hr,$employee['id']);ok($emps->find($employee['id'])->status()->value==='active','Complete onboarding may be activated');
  fails(fn()=>$employeeActions->generateOnboardingLink($hr,$employee['id'],'http://localhost:5174'),'Active employee cannot receive an editable onboarding link');
  $changed=$employeeActions->update($hr,$employee['id'],'1234567890123456','candidate@example.test','0801','Engineer','Sipil','PKWTT',11000000,null,null,['birth_date'=>'1990-01-01','birth_place'=>'Denpasar','address'=>'Alamat uji']);
  ok($changed['changePending']===true&&$emps->find($employee['id'])->salary()===10000000.0,'HR sensitive edits remain pending until CEO approval');
  $request=$store->list('employee_change_requests')[0];$workforce->decideChange($ceo,(int)$request['id'],true,'Disetujui');ok($emps->find($employee['id'])->salary()===11000000.0,'CEO approval applies and audits the change');
  fails(fn()=>$employeeActions->update($hr,$employee['id'],'123','candidate@example.test','0801','Engineer','Sipil','PKWTT',11000000,null,null,['birth_date'=>'1990-01-01','birth_place'=>'Denpasar','address'=>'Alamat uji']),'Invalid NIK cannot enter CEO approval queue');
  $employeeActions->update($hr,$employee['id'],'1234567890123456','candidate@example.test','0801','Engineer','Sipil','PKWTT',12000000,null,null,['birth_date'=>'1990-01-01','birth_place'=>'Denpasar','address'=>'Alamat uji']);
  $pending=$store->list('employee_change_requests',['status'=>'pending'])[0];
  fails(fn()=>$workforce->decideChange($hr,(int)$pending['id'],true,''),'HR cannot self-approve sensitive employee changes');
  fails(fn()=>$workforce->decideChange($ceo,(int)$pending['id'],false,''),'CEO rejection requires a reason');
  $employeeActions->update($ceo,$employee['id'],'1234567890123456','candidate@example.test','0801','Engineer','Sipil','PKWTT',11500000,null,null,['birth_date'=>'1990-01-01','birth_place'=>'Denpasar','address'=>'Alamat uji']);
  fails(fn()=>$workforce->decideChange($ceo,(int)$pending['id'],true,''),'Stale approval cannot overwrite newer employee data');
  $workforce->decideChange($ceo,(int)$pending['id'],false,'Data sudah berubah');
  ok($emps->find($employee['id'])->salary()===11500000.0,'Rejecting a stale request preserves current employee data');
  fails(fn()=>$workforce->createRecord($hr,'discipline',['employeeId'=>$employee['id'],'kind'=>'SP1','date'=>date('Y-m-d'),'notes'=>'Peringatan'],null),'SP requires an attached PDF');
  $mrfActions=new \App\Application\Recruitment\MrfUseCases($mrfs,$notifications,$store);
  $input=['position'=>'Teknisi','responsibilities'=>'Tugas','education'=>'S1','skills'=>'Keahlian','experience'=>'Pengalaman','headcount'=>1,'employmentStatus'=>'PKWT','selectionTrack'=>'fast'];
  $draft=$mrfActions->create($pic,$input,true);
  ok(count($store->list('hr_notifications',['recipient_id'=>$manager->id,'kind'=>'mrf_approval']))>0,'Submit-now MRF notifies the division manager');
  $mrfActions->requestRevision($manager,$draft['id'],'Lengkapi kebutuhan');
  ok(count($store->list('hr_notifications',['recipient_id'=>$pic->id,'kind'=>'mrf_revision']))===1,'MRF revision notifies its requester with notes');
  $talent=$workforce->addTalent($hr,$a['id']);$closed=$vacancyActions->close($hr,$vac['id']);$archive=$store->find('vacancy_archives',$closed['archiveId']);
  $zip=new ZipArchive();$zip->open($storage->absolutePath($archive['path']));ok($zip->locateName('pelamar-'.$a['id'].'/form-pelamar.pdf')!==false&&$zip->locateName('pelamar-'.$a['id'].'/offering-letter-'.$ol['id'].'.pdf')!==false,'Archive contains complete application and offering PDFs');$zip->close();
  fails(fn()=>$archives->purge($hr,(int)$archive['id'],str_repeat('0',64)),'Cleanup blocked without matching archive checksum');
  $archives->purge($hr,(int)$archive['id'],$archive['checksum']);ok($apps->find($a['id'])===null&&$mrfs->find((int)$m->id())!==null,'Cleanup removes active applicants and preserves MRF history');ok($emps->find($employee['id'])!==null&&is_file($storage->absolutePath($cv)),'Master employee and talent-pool files survive cleanup');
  ok(file_get_contents($workforce->talentFile($hr,(int)$talent['id'],'cv'))===$doc,'Talent CV remains downloadable after active applicant cleanup');
  fails(fn()=>$workforce->talentFile($pic,(int)$talent['id'],'cv'),'PIC cannot download retained talent documents');
  $retention=new Retention($store,$storage,$apps);$store->update('talent_pool',(int)$talent['id'],['expires_at'=>'2020-01-01 00:00:00']);ok($retention->run(false)===1&&$store->find('talent_pool',(int)$talent['id'])!==null,'Retention dry run does not delete');$retention->run(true);ok($store->find('talent_pool',(int)$talent['id'])===null&&!is_file($tmp.'/'.$cv),'Expired talent and detached files removed');
  $off=$workforce->createRecord($hr,'offboarding',['employeeId'=>$employee['id'],'kind'=>'resignation','date'=>(new DateTimeImmutable('-2 months'))->format('Y-m-d'),'lastDay'=>(new DateTimeImmutable('-1 day'))->format('Y-m-d'),'notes'=>'Pengunduran diri uji'],null);
  fails(fn()=>$workforce->completeOffboarding($hr,(int)$off['id'],[]),'Offboarding requires completed handover checklist');$assets=array_fill_keys(array_keys($off['payload']['assets']),true);$workforce->completeOffboarding($hr,(int)$off['id'],$assets);ok($emps->find($employee['id'])->status()->value==='inactive','Offboarding deactivates employee');
  $payroll=new PayrollController($emps,$store);fails(fn()=>$payroll->index(new Request('GET','',[],[],[]),[]),'Payroll rejects missing integration token');$out=$payroll->index(new Request('GET','',['authorization'=>'Bearer '.PAYROLL_API_TOKEN],[],[]),[])->body;ok($out['items'][0]['barcodeActive']===false,'Payroll integration exposes offboarding deactivation');
 }
 echo "{$checks} checks passed".(in_array('--mysql',$argv,true)?' including isolated MySQL integration.':'. Add --mysql for database integration.')."\n";
}finally{
 if($pdo&&$db&&preg_match('/^hr_v2_test_[a-f0-9]+$/D',$db))$pdo->exec('DROP DATABASE `'.$db.'`');
 if(in_array('--keep-artifacts',$argv,true))echo 'Test artifacts: '.$tmp."\n";
 else{foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($tmp,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::CHILD_FIRST) as $f){$f->isDir()?rmdir($f->getPathname()):unlink($f->getPathname());}rmdir($tmp);}
 ob_end_flush();
}
