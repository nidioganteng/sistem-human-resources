<?php
declare(strict_types=1);

namespace App\Presentation\Http\Controllers;

use App\Application\Employee\EmployeeUseCases;
use App\Application\Ports\FileStorage;
use App\Domain\Identity\Role;
use App\Presentation\Http\HttpException;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;
use finfo;

final class EmployeeController
{
    private const MAX_DOC_BYTES   = 2 * 1024 * 1024; // 2 MB
    private const MAX_IMAGE_BYTES = 500 * 1024; // 500 KB
    private const ALLOWED_MIMES   = ['application/pdf', 'image/jpeg', 'image/png'];

    public function __construct(private EmployeeUseCases $employees, private FileStorage $storage) {}

    /** GET /employees */
    public function index(Request $req, array $p): Response
    {
        return Response::json($this->employees->list($req->requireUser()));
    }

    /** POST /employees */
    public function store(Request $req, array $p): Response
    {
        $b = $req->body;

        $fullName         = trim((string) ($b['fullName'] ?? ''));
        $position         = trim((string) ($b['position'] ?? ''));
        $division         = trim((string) ($b['division'] ?? ''));
        $employmentStatus = trim((string) ($b['employmentStatus'] ?? ''));
        $salary           = isset($b['salary']) && $b['salary'] !== '' ? (float) $b['salary'] : null;
        $applicantId      = isset($b['applicantId']) && $b['applicantId'] !== '' ? (int) $b['applicantId'] : null;
        $contractStart    = isset($b['contractStart']) && $b['contractStart'] !== '' ? (string) $b['contractStart'] : null;
        $contractEnd      = isset($b['contractEnd']) && $b['contractEnd'] !== '' ? (string) $b['contractEnd'] : null;

        if ($fullName === '') {
            throw new HttpException(422, 'Nama lengkap wajib diisi.');
        }
        if ($position === '') {
            throw new HttpException(422, 'Posisi wajib diisi.');
        }
        if (!in_array($employmentStatus, ['PKWT', 'PKWTT', 'FREELANCE'], true)) {
            throw new HttpException(422, 'Status kepegawaian tidak valid.');
        }

        $result = $this->employees->create(
            $req->requireUser(),
            $fullName, $position, $division, $employmentStatus,
            $salary, $applicantId, $contractStart, $contractEnd,
        );

        return Response::json($result, 201);
    }

    /** GET /employees/{id} */
    /** @param array<string,string> $p */
    public function show(Request $req, array $p): Response
    {
        return Response::json($this->employees->get($req->requireUser(), (int) $p['id']));
    }

    /** PUT /employees/{id} */
    /** @param array<string,string> $p */
    public function update(Request $req, array $p): Response
    {
        $b = $req->body;

        $nik              = trim((string) ($b['nik'] ?? ''));
        $email            = trim((string) ($b['email'] ?? ''));
        $phone            = trim((string) ($b['phone'] ?? ''));
        $position         = trim((string) ($b['position'] ?? ''));
        $division         = trim((string) ($b['division'] ?? ''));
        $employmentStatus = trim((string) ($b['employmentStatus'] ?? ''));
        $salary           = isset($b['salary']) && $b['salary'] !== '' ? (float) $b['salary'] : null;
        $contractStart    = isset($b['contractStart']) && $b['contractStart'] !== '' ? (string) $b['contractStart'] : null;
        $contractEnd      = isset($b['contractEnd']) && $b['contractEnd'] !== '' ? (string) $b['contractEnd'] : null;
        $personalData     = isset($b['personalData']) && is_array($b['personalData']) ? $b['personalData'] : [];

        if ($position === '') {
            throw new HttpException(422, 'Posisi wajib diisi.');
        }
        if (!in_array($employmentStatus, ['PKWT', 'PKWTT', 'FREELANCE'], true)) {
            throw new HttpException(422, 'Status kepegawaian tidak valid.');
        }

        $result = $this->employees->update(
            $req->requireUser(), (int) $p['id'],
            $nik, $email, $phone, $position, $division, $employmentStatus,
            $salary, $contractStart, $contractEnd, $personalData,
        );

        return Response::json($result);
    }

    /** POST /employees/{id}/generate-link */
    /** @param array<string,string> $p */
    public function generateLink(Request $req, array $p): Response
    {
        $appBaseUrl = trim((string) ($req->body['appBaseUrl'] ?? ''));
        if ($appBaseUrl === '') {
            throw new HttpException(422, 'appBaseUrl wajib diisi.');
        }

        $result = $this->employees->generateOnboardingLink(
            $req->requireUser(), (int) $p['id'], $appBaseUrl,
        );

        return Response::json($result);
    }

    /** POST /employees/{id}/validate */
    /** @param array<string,string> $p */
    public function validate(Request $req, array $p): Response
    {
        return Response::json($this->employees->validate($req->requireUser(), (int) $p['id']));
    }

    /** POST /employees/{id}/documents/{docType} */
    public function uploadDocument(Request $req, array $p): Response
    {
        $actor = $req->requireUser();
        if ($actor->role !== Role::Hr) throw new HttpException(403, 'Hanya HR yang dapat mengganti dokumen karyawan.');
        $type = $p['docType'];
        if (!in_array($type, ['ktp','kk','npwp','bpjs','ijazah','foto','lainnya'], true)) throw new HttpException(422, 'Jenis dokumen tidak valid.');
        $this->employees->get($actor, (int) $p['id']);
        $file = $req->files['file'] ?? [];
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'] ?? '')) {
            throw new HttpException(422, 'Berkas gagal diunggah. Pilih berkas yang sesuai batas ukuran lalu coba lagi.');
        }
        $path = $file['tmp_name'];
        $size = filesize($path);
        $max = $type === 'foto' ? self::MAX_IMAGE_BYTES : self::MAX_DOC_BYTES;
        if ($size === false || $size === 0 || $size > $max) throw new HttpException(422, $type === 'foto' ? 'Pasfoto maksimal 500 KB.' : 'Dokumen maksimal 2 MB.');
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($path);
        if (!in_array($mime, self::ALLOWED_MIMES, true) || ($type === 'foto' && $mime === 'application/pdf')) {
            throw new HttpException(422, $type === 'foto' ? 'Pasfoto harus JPEG atau PNG.' : 'Dokumen harus PDF, JPEG, atau PNG.');
        }
        if ($mime !== 'application/pdf' && !getimagesize($path)) throw new HttpException(422, 'Berkas gambar tidak valid.');
        $extension = match ($mime) { 'image/jpeg' => 'jpg', 'image/png' => 'png', default => 'pdf' };
        $stored = $this->storage->storeUpload($path, 'employee-docs', $extension);
        try {
            $result = $this->employees->replaceDocument($actor, (int) $p['id'], $type, $stored);
        } catch (\Throwable $error) {
            $this->storage->delete($stored);
            throw $error;
        }
        return Response::json($result);
    }

    /** GET /employees/{id}/documents/{docType} */
    /** @param array<string,string> $p */
    public function serveDocument(Request $req, array $p): Response
    {
        $absPath = $this->employees->serveDocument(
            $req->requireUser(), (int) $p['id'], $p['docType'],
        );

        if (!is_readable($absPath)) {
            throw new HttpException(404, 'Berkas tidak ditemukan di storage.');
        }

        $finfo    = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = (string) ($finfo->file($absPath) ?: 'application/octet-stream');

        http_response_code(200);
        header('Content-Type: ' . $mimeType);
        header('Content-Disposition: inline; filename="' . basename($absPath) . '"');
        header('Content-Length: ' . filesize($absPath));
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: no-store');
        readfile($absPath);

        // Hentikan eksekusi setelah streaming berkas; tidak mengirim JSON.
        exit;
    }
}
