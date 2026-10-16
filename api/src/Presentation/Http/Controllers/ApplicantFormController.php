<?php
declare(strict_types=1);

namespace App\Presentation\Http\Controllers;

use App\Application\Ports\FileStorage;
use App\Domain\Recruitment\ApplicantRepository;
use App\Domain\Recruitment\VacancyRepository;
use App\Presentation\Http\HttpException;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;
use DateTimeImmutable;
use finfo;

/**
 * Controller untuk Form Pelamar digital.
 * Endpoint publik: tidak memerlukan autentikasi (token sekali pakai dari email).
 */
final class ApplicantFormController
{
    private const MAX_IMAGE_BYTES = 500 * 1024; // 500 KB

    public function __construct(
        private ApplicantRepository $applicants,
        private VacancyRepository $vacancies,
        private FileStorage $storage,
    ) {}

    /**
     * GET /form-pelamar/{token}
     * Kembalikan info pelamar dan lowongan untuk mengisi form.
     *
     * @param array<string,string> $p
     */
    public function show(Request $req, array $p): Response
    {
        $formRow = $this->resolveToken($p['token']);

        $applicant = $this->applicants->find($formRow['applicant_id']);
        if ($applicant === null) {
            throw new HttpException(404, 'Data pelamar tidak ditemukan.');
        }

        $vacancy = $this->vacancies->find($applicant->vacancyId());
        if ($vacancy === null) {
            throw new HttpException(404, 'Lowongan tidak ditemukan.');
        }

        return Response::json([
            'applicantName'    => $applicant->fullName(),
            'applicantPhone'   => $applicant->phone(),
            'vacancyPosition'  => $vacancy->position(),
            'vacancyDivision'  => $vacancy->division(),
            'expiresAt'        => $formRow['expires_at'],
        ]);
    }

    /**
     * POST /form-pelamar/{token}   (multipart/form-data)
     * Terima dan simpan data Form Pelamar lengkap.
     *
     * @param array<string,string> $p
     */
    public function store(Request $req, array $p): Response
    {
        $formRow = $this->resolveToken($p['token']);

        // Ambil semua field teks dari body (sudah diisi dari $_POST oleh Request::fromGlobals)
        $identitas = [
            'nama_panggilan'     => trim((string) ($req->body['nama_panggilan'] ?? '')),
            'tempat_lahir'       => trim((string) ($req->body['tempat_lahir'] ?? '')),
            'tanggal_lahir'      => trim((string) ($req->body['tanggal_lahir'] ?? '')),
            'alamat_tinggal'     => trim((string) ($req->body['alamat_tinggal'] ?? '')),
            'no_identitas'       => trim((string) ($req->body['no_identitas'] ?? '')),
            'agama'              => trim((string) ($req->body['agama'] ?? '')),
            'status_perkawinan'  => trim((string) ($req->body['status_perkawinan'] ?? '')),
            'kewarganegaraan'    => trim((string) ($req->body['kewarganegaraan'] ?? 'WNI')),
        ];

        // Validasi field wajib identitas
        $requiredIdentitas = [
            'nama_panggilan'    => 'Nama panggilan',
            'tempat_lahir'      => 'Tempat lahir',
            'tanggal_lahir'     => 'Tanggal lahir',
            'alamat_tinggal'    => 'Alamat tinggal',
            'no_identitas'      => 'Nomor identitas KTP/SIM',
            'agama'             => 'Agama',
            'status_perkawinan' => 'Status perkawinan',
        ];
        foreach ($requiredIdentitas as $key => $label) {
            if ($identitas[$key] === '') {
                throw new HttpException(422, "{$label} wajib diisi.");
            }
        }

        $validStatusPerkawinan = ['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati'];
        if (!in_array($identitas['status_perkawinan'], $validStatusPerkawinan, true)) {
            throw new HttpException(422, 'Status perkawinan tidak valid.');
        }

        // Pendidikan formal: JSON string dari frontend
        $pendidikanFormalJson = trim((string) ($req->body['pendidikan_formal'] ?? '[]'));
        $pendidikanFormal = json_decode($pendidikanFormalJson, true);
        if (!is_array($pendidikanFormal) || count($pendidikanFormal) === 0) {
            throw new HttpException(422, 'Riwayat pendidikan formal minimal harus diisi satu baris.');
        }

        // Pendidikan non-formal: opsional
        $pendidikanNonFormalJson = trim((string) ($req->body['pendidikan_non_formal'] ?? '[]'));
        $pendidikanNonFormal = json_decode($pendidikanNonFormalJson, true);
        if (!is_array($pendidikanNonFormal)) {
            $pendidikanNonFormal = [];
        }

        // Pengalaman kerja: opsional
        $pengalamanKerjaJson = trim((string) ($req->body['pengalaman_kerja'] ?? '[]'));
        $pengalamanKerja = json_decode($pengalamanKerjaJson, true);
        if (!is_array($pengalamanKerja)) {
            $pengalamanKerja = [];
        }

        // Penguasaan bahasa: minimal 1
        $penguasaanBahasaJson = trim((string) ($req->body['penguasaan_bahasa'] ?? '[]'));
        $penguasaanBahasa = json_decode($penguasaanBahasaJson, true);
        if (!is_array($penguasaanBahasa) || count($penguasaanBahasa) === 0) {
            throw new HttpException(422, 'Penguasaan bahasa minimal harus diisi satu bahasa.');
        }

        // Soft skill: array
        $softSkillJson = trim((string) ($req->body['soft_skill'] ?? '[]'));
        $softSkill = json_decode($softSkillJson, true);
        if (!is_array($softSkill)) {
            $softSkill = [];
        }

        // Pengalaman organisasi: opsional
        $organisasiJson = trim((string) ($req->body['pengalaman_organisasi'] ?? '[]'));
        $pengalamanOrganisasi = json_decode($organisasiJson, true);
        if (!is_array($pengalamanOrganisasi)) {
            $pengalamanOrganisasi = [];
        }

        // Informasi lainnya
        $infoLainnya = [
            'sumber_info'       => trim((string) ($req->body['sumber_info'] ?? '')),
            'tentang_gsg'       => trim((string) ($req->body['tentang_gsg'] ?? '')),
            'alasan_bergabung'  => trim((string) ($req->body['alasan_bergabung'] ?? '')),
            'misi_kontribusi'   => trim((string) ($req->body['misi_kontribusi'] ?? '')),
        ];

        $requiredInfo = [
            'sumber_info'      => 'Sumber informasi lowongan',
            'tentang_gsg'      => 'Pengetahuan tentang Gaharu Sempana Group',
            'alasan_bergabung' => 'Alasan tertarik bergabung',
            'misi_kontribusi'  => 'Misi kontribusi',
        ];
        foreach ($requiredInfo as $key => $label) {
            if ($infoLainnya[$key] === '') {
                throw new HttpException(422, "{$label} wajib diisi.");
            }
        }

        $gajiHarapanRaw = trim((string) ($req->body['gaji_harapan'] ?? ''));
        if ($gajiHarapanRaw === '' || !is_numeric($gajiHarapanRaw)) {
            throw new HttpException(422, 'Gaji yang diharapkan wajib diisi dan harus berupa angka.');
        }
        $gajiHarapan = (float) $gajiHarapanRaw;

        // Tanda tangan: kota
        $kotaTandaTangan = trim((string) ($req->body['kota_tanda_tangan'] ?? ''));
        if ($kotaTandaTangan === '') {
            throw new HttpException(422, 'Kota tanda tangan wajib diisi.');
        }

        // Handle upload foto (opsional, maks 500 KB, harus gambar)
        $photoPath = null;
        $photoFile = $req->files['photo'] ?? [];
        if (!empty($photoFile['tmp_name']) && ((int) ($photoFile['error'] ?? UPLOAD_ERR_NO_FILE)) !== UPLOAD_ERR_NO_FILE) {
            $photoPath = $this->validateAndStoreImage($photoFile, 'Foto', 'photo');
        }

        // Handle upload tanda tangan (wajib, maks 500 KB, harus gambar)
        $signaturePath = null;
        $signatureFile = $req->files['signature'] ?? [];
        $signatureDataUrl = trim((string) ($req->body['signature_data_url'] ?? ''));

        if (!empty($signatureFile['tmp_name']) && ((int) ($signatureFile['error'] ?? UPLOAD_ERR_NO_FILE)) !== UPLOAD_ERR_NO_FILE) {
            $signaturePath = $this->validateAndStoreImage($signatureFile, 'Tanda tangan', 'signature');
        } elseif ($signatureDataUrl !== '') {
            // Tanda tangan dari canvas (data URL base64)
            $signaturePath = $this->storeSignatureDataUrl($signatureDataUrl);
        } else {
            throw new HttpException(422, 'Tanda tangan wajib dilengkapi.');
        }

        // Susun data JSON lengkap
        $formData = [
            'identitas'             => $identitas,
            'pendidikan_formal'     => $pendidikanFormal,
            'pendidikan_non_formal' => $pendidikanNonFormal,
            'pengalaman_kerja'      => $pengalamanKerja,
            'penguasaan_bahasa'     => $penguasaanBahasa,
            'soft_skill'            => $softSkill,
            'pengalaman_organisasi' => $pengalamanOrganisasi,
            'info_lainnya'          => $infoLainnya,
            'kota_tanda_tangan'     => $kotaTandaTangan,
        ];

        $this->applicants->submitForm(
            $formRow['applicant_id'],
            (string) json_encode($formData, JSON_UNESCAPED_UNICODE),
            $gajiHarapan,
            $photoPath,
            $signaturePath,
        );

        return Response::json(['success' => true]);
    }

    /**
     * Validasi token: cari di DB, cek belum expired, cek belum submitted.
     * Melempar HttpException jika ada masalah.
     *
     * @return array{applicant_id:int,expires_at:string,submitted_at:string|null}
     */
    private function resolveToken(string $token): array
    {
        if ($token === '') {
            throw new HttpException(404, 'Token tidak valid.');
        }

        $formRow = $this->applicants->findFormByToken($token);
        if ($formRow === null) {
            throw new HttpException(404, 'Tautan Form Pelamar tidak ditemukan.');
        }

        if ($formRow['submitted_at'] !== null) {
            throw new HttpException(422, 'Form Pelamar ini sudah pernah diisi.');
        }

        $expiresAt = new DateTimeImmutable($formRow['expires_at']);
        if ($expiresAt < new DateTimeImmutable()) {
            throw new HttpException(422, 'Tautan Form Pelamar sudah kedaluwarsa.');
        }

        return $formRow;
    }

    /**
     * Validasi file gambar (tipe MIME + ukuran) dan simpan ke storage.
     *
     * @param array<string,mixed> $file
     */
    private function validateAndStoreImage(array $file, string $label, string $category): string
    {
        $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);

        if ($error !== UPLOAD_ERR_OK) {
            $msg = match ($error) {
                UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => "Ukuran file {$label} melebihi batas.",
                default => "Upload {$label} gagal (kode {$error}).",
            };
            throw new HttpException(422, $msg);
        }

        $size = (int) ($file['size'] ?? 0);
        if ($size > self::MAX_IMAGE_BYTES) {
            throw new HttpException(422, "Ukuran file {$label} melebihi batas 500 KB.");
        }

        $tmpName = (string) $file['tmp_name'];
        $finfo   = new finfo(FILEINFO_MIME_TYPE);
        $mime    = $finfo->file($tmpName);

        $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!in_array($mime, $allowedMimes, true)) {
            throw new HttpException(422, "File {$label} harus berformat JPEG, PNG, atau WebP.");
        }

        $ext = match ($mime) {
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp',
            default      => 'bin',
        };

        return $this->storage->storeUpload($tmpName, $category, $ext);
    }

    /**
     * Simpan tanda tangan dari canvas (data URL base64) ke storage.
     * Hanya menerima data URL dengan prefix image/png atau image/jpeg.
     */
    private function storeSignatureDataUrl(string $dataUrl): string
    {
        // Format: data:image/png;base64,<data>
        if (!preg_match('#^data:(image/png|image/jpeg);base64,([A-Za-z0-9+/=]+)$#', $dataUrl, $m)) {
            throw new HttpException(422, 'Format tanda tangan tidak valid.');
        }

        $mime   = $m[1];
        $binary = base64_decode($m[2], true);

        if ($binary === false) {
            throw new HttpException(422, 'Data tanda tangan tidak dapat didekode.');
        }

        if (strlen($binary) > self::MAX_IMAGE_BYTES) {
            throw new HttpException(422, 'Ukuran tanda tangan melebihi batas 500 KB.');
        }

        $ext = ($mime === 'image/jpeg') ? 'jpg' : 'png';
        $dir = rtrim(STORAGE_PATH, '/') . '/signature';

        if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
            throw new \RuntimeException("Tidak dapat membuat folder penyimpanan: {$dir}");
        }

        $filename     = bin2hex(random_bytes(16)) . '.' . $ext;
        $relativePath = 'signature/' . $filename;
        $destination  = $dir . '/' . $filename;

        if (file_put_contents($destination, $binary) === false) {
            throw new \RuntimeException('Gagal menyimpan tanda tangan.');
        }

        return $relativePath;
    }
}
