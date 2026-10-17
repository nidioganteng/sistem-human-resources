<?php
declare(strict_types=1);

namespace App\Presentation\Http\Controllers;

use App\Application\Ports\FileStorage;
use App\Application\Recruitment\ApplicantUseCases;
use App\Application\Recruitment\VacancyUseCases;
use App\Presentation\Http\HttpException;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;
use finfo;

final class PublicApplyController
{
    private const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

    public function __construct(
        private VacancyUseCases $vacancies,
        private ApplicantUseCases $applicants,
        private FileStorage $storage,
    ) {}

    /**
     * GET /apply/{token}
     * Endpoint publik: kembalikan info lowongan (posisi, divisi, status).
     * Tautan tertutup mengembalikan data dengan status = 'closed'.
     *
     * @param array<string,string> $p
     */
    public function show(Request $req, array $p): Response
    {
        return Response::json($this->vacancies->getByToken($p['token']));
    }

    /**
     * POST /apply/{token}   (multipart/form-data)
     * Endpoint publik: terima pendaftaran pelamar.
     *
     * @param array<string,string> $p
     */
    public function store(Request $req, array $p): Response
    {
        // Ambil field teks dari body (sudah diisi dari $_POST oleh Request::fromGlobals)
        $fullName = trim((string) ($req->body['full_name'] ?? ''));
        $email    = trim((string) ($req->body['email'] ?? ''));
        $phone    = trim((string) ($req->body['phone'] ?? ''));
        $consent  = (string) ($req->body['consent'] ?? '');
        $message  = trim((string) ($req->body['message'] ?? '')) ?: null;

        if ($fullName === '') {
            throw new HttpException(422, 'Nama lengkap wajib diisi.');
        }
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new HttpException(422, 'Alamat email tidak valid.');
        }
        if ($phone === '') {
            throw new HttpException(422, 'Nomor HP wajib diisi.');
        }
        if ($consent !== '1') {
            throw new HttpException(422, 'Persetujuan penyimpanan data wajib diberikan.');
        }

        // Validasi dan simpan CV (wajib)
        $cvTmp = $this->validateUploadedFile($req->files['cv'] ?? [], 'CV', true);
        $cvPath = $this->storage->storeUpload($cvTmp, 'cv', 'pdf');

        // Validasi dan simpan portofolio (opsional)
        $portfolioPath = null;
        $portFile = $req->files['portfolio'] ?? [];
        if (!empty($portFile['tmp_name']) && ($portFile['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
            $portTmp       = $this->validateUploadedFile($portFile, 'portofolio', false);
            $portfolioPath = $this->storage->storeUpload($portTmp, 'portfolio', 'pdf');
        }

        $result = $this->applicants->register(
            $p['token'],
            $fullName,
            strtolower($email),
            $phone,
            $cvPath,
            $portfolioPath,
            $message,
        );

        return Response::json(['success' => true, 'applicant' => $result], 201);
    }

    /**
     * Validasi file unggahan: error PHP, ukuran, tipe MIME.
     * Mengembalikan tmp_name jika valid, melempar HttpException jika tidak.
     *
     * @param array<string,mixed> $file
     */
    private function validateUploadedFile(array $file, string $label, bool $required): string
    {
        $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);

        if ($error === UPLOAD_ERR_NO_FILE || ($file['tmp_name'] ?? '') === '') {
            if ($required) {
                throw new HttpException(422, "File {$label} wajib diunggah.");
            }
            return '';
        }

        if ($error !== UPLOAD_ERR_OK) {
            $msg = match ($error) {
                UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => "Ukuran file {$label} melebihi batas.",
                default => "Upload {$label} gagal (kode {$error}).",
            };
            throw new HttpException(422, $msg);
        }

        $size = (int) ($file['size'] ?? 0);
        if ($size > self::MAX_BYTES) {
            throw new HttpException(422, "Ukuran file {$label} melebihi batas 2 MB.");
        }

        $tmpName = (string) $file['tmp_name'];
        $finfo   = new finfo(FILEINFO_MIME_TYPE);
        $mime    = $finfo->file($tmpName);
        if ($mime !== 'application/pdf') {
            throw new HttpException(422, "File {$label} harus berformat PDF.");
        }

        return $tmpName;
    }
}
