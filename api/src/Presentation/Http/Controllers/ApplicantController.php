<?php
declare(strict_types=1);

namespace App\Presentation\Http\Controllers;

use App\Application\Recruitment\ApplicantUseCases;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;

final class ApplicantController
{
    public function __construct(private ApplicantUseCases $applicants) {}

    /** GET /candidates */
    /** @param array<string,string> $p */
    public function candidates(Request $req, array $p): Response
    {
        $items = $this->applicants->listCandidates($req->requireUser());

        return Response::json(['items' => $items]);
    }

    /** GET /vacancies/{id}/applicants */
    /** @param array<string,string> $p */
    public function index(Request $req, array $p): Response
    {
        $items = $this->applicants->listByVacancy($req->requireUser(), (int) $p['id']);

        return Response::json(['items' => $items]);
    }

    /** GET /applicants/{id} */
    /** @param array<string,string> $p */
    public function show(Request $req, array $p): Response
    {
        $data = $this->applicants->getForHr($req->requireUser(), (int) $p['id']);

        return Response::json($data);
    }

    /** GET /applicants/{id}/file/{type} - stream berkas (cv atau portfolio) */
    /** @param array<string,string> $p */
    public function serveFile(Request $req, array $p): Response
    {
        $fullPath = $this->applicants->resolveFilePath(
            $req->requireUser(),
            (int) $p['id'],
            $p['type'],
        );

        $ext      = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));
        $mimeType = match ($ext) {
            'pdf'  => 'application/pdf',
            'jpg', 'jpeg' => 'image/jpeg',
            'png'  => 'image/png',
            default => 'application/octet-stream',
        };

        $filename = $p['type'] . '.' . $ext;

        header('Content-Type: ' . $mimeType);
        header('Content-Disposition: inline; filename="' . $filename . '"');
        header('Content-Length: ' . filesize($fullPath));
        header('Cache-Control: private, no-store');
        header('X-Content-Type-Options: nosniff');
        readfile($fullPath);
        exit();
    }

    /** GET /applicants/{id}/form-data */
    /** @param array<string,string> $p */
    public function showFormData(Request $req, array $p): Response
    {
        $data = $this->applicants->getFormData($req->requireUser(), (int) $p['id']);

        return Response::json($data);
    }

    /** POST /applicants/{id}/approve */
    /** @param array<string,string> $p */
    public function approve(Request $req, array $p): Response
    {
        $appBaseUrl = isset($req->body['appBaseUrl']) ? (string) $req->body['appBaseUrl'] : '';
        $this->applicants->approve($req->requireUser(), (int) $p['id'], $appBaseUrl);

        return Response::json(['success' => true]);
    }

    /** POST /applicants/{id}/reject */
    /** @param array<string,string> $p */
    public function reject(Request $req, array $p): Response
    {
        $this->applicants->reject($req->requireUser(), (int) $p['id']);

        return Response::json(['success' => true]);
    }

    /** POST /applicants/{id}/shortlist */
    /** @param array<string,string> $p */
    public function shortlist(Request $req, array $p): Response
    {
        $data = $this->applicants->shortlist($req->requireUser(), (int) $p['id']);

        return Response::json($data);
    }

    /** POST /applicants/{id}/call-selection */
    /** @param array<string,string> $p */
    public function callToSelection(Request $req, array $p): Response
    {
        $data = $this->applicants->callToSelection($req->requireUser(), (int) $p['id']);

        return Response::json($data);
    }

    /** POST /applicants/{id}/record-selection */
    /** @param array<string,string> $p */
    public function recordSelection(Request $req, array $p): Response
    {
        $stage  = isset($req->body['stage'])  ? (string) $req->body['stage']  : '';
        $result = isset($req->body['result']) ? (string) $req->body['result'] : '';
        $notes  = isset($req->body['notes'])  ? (string) $req->body['notes']  : null;

        if ($notes !== null && trim($notes) === '') {
            $notes = null;
        }

        $data = $this->applicants->recordSelectionResult(
            $req->requireUser(),
            (int) $p['id'],
            $stage,
            $result,
            $notes,
        );

        return Response::json($data);
    }

    /** GET /applicants/{id}/selections */
    /** @param array<string,string> $p */
    public function listSelections(Request $req, array $p): Response
    {
        $records = $this->applicants->getSelectionRecords($req->requireUser(), (int) $p['id']);

        return Response::json(['items' => $records]);
    }

    /** POST /applicants/{id}/hire */
    /** @param array<string,string> $p */
    public function hire(Request $req, array $p): Response
    {
        $data = $this->applicants->hire($req->requireUser(), (int) $p['id']);

        return Response::json($data, 201);
    }
}
