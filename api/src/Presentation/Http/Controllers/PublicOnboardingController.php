<?php
declare(strict_types=1);

namespace App\Presentation\Http\Controllers;

use App\Application\Employee\EmployeeUseCases;
use App\Application\Ports\FileStorage;
use App\Presentation\Http\HttpException;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;
use finfo;

final class PublicOnboardingController
{
    private const MAX_DOC_BYTES   = 2 * 1024 * 1024; // 2 MB untuk PDF
    private const MAX_IMAGE_BYTES = 1 * 1024 * 1024; // 1 MB untuk gambar
    private const ALLOWED_MIMES   = ['application/pdf', 'image/jpeg', 'image/png'];

    public function __construct(
        private EmployeeUseCases $employees,
        private FileStorage $storage,
    ) {}

    /**
     * GET /onboarding/{token}
     * Publik: kembalikan info karyawan untuk formulir onboarding.
     *
     * @param array<string,string> $p
     */
    public function show(Request $req, array $p): Response
    {
        return Response::json($this->employees->getPublic($p['token']));
    }

    /**
     * POST /onboarding/{token}   (application/json)
     * Publik: karyawan mengirim data teks.
     *
     * @param array<string,string> $p
     */
    public function submit(Request $req, array $p): Response
    {
        $b = $req->body;

        $nik          = trim((string) ($b['nik'] ?? ''));
        $email        = trim((string) ($b['email'] ?? ''));
        $phone        = trim((string) ($b['phone'] ?? ''));
        $personalData = isset($b['personalData']) && is_array($b['personalData']) ? $b['personalData'] : [];

        if ($nik === '') {
            throw new HttpException(422, 'NIK wajib diisi.');
        }
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new HttpException(422, 'Alamat email tidak valid.');
        }
        if ($phone === '') {
            throw new HttpException(422, 'Nomor HP wajib diisi.');
        }

        $result = $this->employees->submitOnboarding($p['token'], $nik, $email, $phone, $personalData);

        return Response::json($result);
    }

    /**
     * POST /onboarding/{token}/upload   (multipart/form-data)
     * Publik: karyawan mengunggah satu berkas dokumen.
     *
     * @param array<string,string> $p
     */
    public function upload(Request $req, array $p): Response
    {
        $docType = trim((string) ($req->body['docType'] ?? ''));
        if ($docType === '') {
            throw new HttpException(422, 'docType wajib diisi.');
        }

        $fileData = $req->files['file'] ?? [];
        $tmpPath  = $this->validateUploadedFile($fileData);

        $ext      = $this->mimeToExtension($tmpPath);
        $filePath = $this->storage->storeUpload($tmpPath, 'employee-docs', $ext);

        $this->employees->uploadDocument($p['token'], $docType, $filePath);

        return Response::json(['success' => true]);
    }

    /**
     * Validasi berkas unggahan: error PHP, ukuran, tipe MIME.
     * Mengembalikan tmp_name jika valid, melempar HttpException jika tidak.
     *
     * @param array<string,mixed> $file
     */
    private function validateUploadedFile(array $file): string
    {
        $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);

        if ($error === UPLOAD_ERR_NO_FILE || ($file['tmp_name'] ?? '') === '') {
            throw new HttpException(422, 'Berkas wajib diunggah.');
        }
        if ($error !== UPLOAD_ERR_OK) {
            $msg = match ($error) {
                UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Ukuran berkas melebihi batas.',
                default => "Upload gagal (kode {$error}).",
            };
            throw new HttpException(422, $msg);
        }

        $tmpName = (string) $file['tmp_name'];
        $finfo   = new finfo(FILEINFO_MIME_TYPE);
        $mime    = $finfo->file($tmpName);

        if (!in_array($mime, self::ALLOWED_MIMES, true)) {
            throw new HttpException(422, 'Berkas harus berformat PDF, JPEG, atau PNG.');
        }

        $size    = (int) ($file['size'] ?? 0);
        $maxSize = $mime === 'application/pdf' ? self::MAX_DOC_BYTES : self::MAX_IMAGE_BYTES;

        if ($size > $maxSize) {
            $maxMb = $maxSize / (1024 * 1024);
            throw new HttpException(422, "Ukuran berkas melebihi batas {$maxMb} MB.");
        }

        return $tmpName;
    }

    private function mimeToExtension(string $tmpPath): string
    {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime  = $finfo->file($tmpPath);

        return match ($mime) {
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            default      => 'pdf',
        };
    }
}
