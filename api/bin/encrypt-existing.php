<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit('CLI only');
define('APP_ENTRY',true);require dirname(__DIR__).'/src/bootstrap.php';
$c=\App\Infrastructure\Wiring::build();$pdo=$c->get(PDO::class);$repo=$c->get(\App\Domain\Employee\EmployeeRepository::class);$cipher=$c->get(\App\Infrastructure\Security\DataCipher::class);
$apply=in_array('--apply',$argv,true);$count=0;
foreach($pdo->query('SELECT id FROM employees WHERE private_data IS NULL')->fetchAll(PDO::FETCH_COLUMN) as $id){
    if($apply){$pdo->beginTransaction();try{$pdo->prepare('SELECT id FROM employees WHERE id=? FOR UPDATE')->execute([$id]);$e=$repo->find((int)$id);if($e)$repo->save($e);$pdo->commit();}catch(Throwable $e){$pdo->rollBack();throw $e;}}
    $count++;
}
$files=0;
foreach($pdo->query('SELECT file_path FROM employee_documents')->fetchAll(PDO::FETCH_COLUMN) as $relative){
    if(!preg_match('~^employee-docs/[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$~D',$relative))throw new RuntimeException('Jalur dokumen lama tidak valid.');
    $path=rtrim(STORAGE_PATH,'/').'/'.$relative;if(!is_file($path))continue;
    $data=(string)file_get_contents($path);if(str_starts_with($data,'HRFILE1'))continue;
    if($apply){$tmp=$path.'.encrypting';if(file_put_contents($tmp,$cipher->seal($data),LOCK_EX)===false||!rename($tmp,$path))throw new RuntimeException('Enkripsi berkas gagal.');}
    $files++;
}
$logs=0;
foreach($pdo->query('SELECT id,old_values,new_values FROM audit_logs')->fetchAll(PDO::FETCH_ASSOC) as $row){
    $update=[];
    foreach(['old_values','new_values'] as $key){$value=json_decode($row[$key]??'{}',true);if(!isset($value['encrypted']))$update[$key]=json_encode(['encrypted'=>$cipher->encrypt($value??[])],JSON_THROW_ON_ERROR);}
    if($update){$logs++;if($apply){$sql='UPDATE audit_logs SET '.implode(',',array_map(static fn($key)=>$key.'=?',array_keys($update))).' WHERE id=?';$pdo->prepare($sql)->execute([...array_values($update),$row['id']]);}}
}
echo ($apply?'Terenkripsi: ':'Dry run: ')."{$count} karyawan, {$files} dokumen, {$logs} audit log.\n";
