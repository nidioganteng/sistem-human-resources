<?php
declare(strict_types=1);

namespace App\Presentation\Http\Controllers;

use App\Application\Recruitment\ApplicantUseCases;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;

final class ApplicantController
{
    public function __construct(private ApplicantUseCases $applicants) {}

    /** GET /vacancies/{id}/applicants */
    /** @param array<string,string> $p */
    public function index(Request $req, array $p): Response
    {
        $items = $this->applicants->listByVacancy($req->requireUser(), (int) $p['id']);

        return Response::json(['items' => $items]);
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
}
