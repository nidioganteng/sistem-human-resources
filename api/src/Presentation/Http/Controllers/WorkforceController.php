<?php
declare(strict_types=1);
namespace App\Presentation\Http\Controllers;
use App\Application\Workforce\{WorkforceUseCases, Notifications};
use App\Application\Ports\FileStorage;
use App\Presentation\Http\{Request, Response, HttpException};

final class WorkforceController
{
    public function __construct(private WorkforceUseCases $workforce, private Notifications $notifications, private FileStorage $storage, private \App\Application\Recruitment\ArchiveUseCases $archives) {}
    public function index(Request $r, array $p): Response { return Response::json(['items'=>$this->workforce->list($r->requireUser(),$p['module'])]); }
    public function downloadArchive(Request $r, array $p): Response { $this->archives->download($r->requireUser(),(int)$p['id']); exit(); }
    public function purgeArchive(Request $r, array $p): Response
    {
        $this->archives->purge($r->requireUser(),(int)$p['id'],(string)($r->body['checksum']??''));
        return Response::json(['success'=>true]);
    }
    public function notifications(Request $r, array $p): Response { return Response::json(['items'=>$this->notifications->list($r->requireUser())]); }
    public function read(Request $r, array $p): Response { $this->notifications->read($r->requireUser(),(int)$p['id']); return Response::json(['success'=>true]); }
    public function record(Request $r, array $p): Response
    {
        $file = $r->files['file'] ?? null; $path = null;
        if ($file && ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
            $path = $this->upload($file,'discipline',2*1024*1024,['application/pdf'=>'pdf']);
        }
        try { return Response::json($this->workforce->createRecord($r->requireUser(),$p['module'],$r->body,$path),201); }
        catch (\Throwable $e) { if ($path) $this->storage->delete($path); throw $e; }
    }
    public function complete(Request $r, array $p): Response
    {
        return Response::json($this->workforce->completeOffboarding($r->requireUser(),(int)$p['id'],(array)($r->body['assets'] ?? [])));
    }
    public function decide(Request $r, array $p): Response
    {
        $action = $r->body['action'] ?? '';
        if (!in_array($action,['approve','reject'],true)) throw new HttpException(422,'Keputusan tidak valid.');
        return Response::json($this->workforce->decideChange($r->requireUser(),(int)$p['id'],$action==='approve',(string)($r->body['comment']??'')));
    }
    public function talent(Request $r, array $p): Response { return Response::json($this->workforce->addTalent($r->requireUser(),(int)($r->body['applicantId']??0)),201); }
    public function signature(Request $r, array $p): Response
    {
        $user = $r->requireUser();
        if (!$user->hasRole(\App\Domain\Identity\Role::Hr,\App\Domain\Identity\Role::SuperAdmin)) throw new HttpException(403,'Hanya HR atau CEO.');
        $path = $this->upload($r->files['file'] ?? [],'user-signatures',500*1024,['image/png'=>'png','image/jpeg'=>'jpg']);
        try { $this->workforce->setSignature($user,$path); } catch (\Throwable $e) { $this->storage->delete($path); throw $e; }
        return Response::json(['success'=>true]);
    }
    public function file(Request $r, array $p): Response
    {
        $path = $this->workforce->recordFile($r->requireUser(),(int)$p['id']);
        header('Content-Type: application/pdf'); header('Content-Disposition: inline; filename="dokumen-karyawan.pdf"');
        header('Cache-Control: private, no-store'); readfile($path); exit();
    }
    public function talentFile(Request $r, array $p): Response
    {
        $path = $this->workforce->talentFile($r->requireUser(),(int)$p['id'],$p['type']);
        header('Content-Type: application/pdf'); header('Content-Disposition: attachment; filename="dokumen-kandidat.pdf"');
        header('Cache-Control: private, no-store'); readfile($path); exit();
    }
    private function upload(array $file, string $category, int $max, array $mimes): string
    {
        if (($file['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name']??'')) throw new HttpException(422,'Berkas wajib diunggah.');
        if ((int)$file['size']>$max) throw new HttpException(422,'Berkas melebihi batas ukuran.');
        $mime=(new \finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
        if (!isset($mimes[$mime])) throw new HttpException(422,'Format berkas tidak valid.');
        if (str_starts_with($mime,'image/') && !getimagesize($file['tmp_name'])) throw new HttpException(422,'Gambar tidak valid.');
        return $this->storage->storeUpload($file['tmp_name'],$category,$mimes[$mime]);
    }
}
