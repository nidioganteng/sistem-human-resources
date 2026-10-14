<?php
declare(strict_types=1);

namespace App\Presentation\Http\Controllers;

use App\Application\Recruitment\VacancyUseCases;
use App\Presentation\Http\HttpException;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;

final class VacancyController
{
    public function __construct(private VacancyUseCases $vacancies) {}

    /** @param array<string,string> $p */
    public function index(Request $req, array $p): Response
    {
        return Response::json(['items' => $this->vacancies->list($req->requireUser())]);
    }

    /** @param array<string,string> $p */
    public function show(Request $req, array $p): Response
    {
        return Response::json($this->vacancies->get($req->requireUser(), (int) $p['id']));
    }

    /** @param array<string,string> $p */
    public function store(Request $req, array $p): Response
    {
        $mrfId = isset($req->body['mrfId']) ? (int) $req->body['mrfId'] : 0;
        if ($mrfId <= 0) {
            throw new HttpException(422, 'mrfId wajib diisi.');
        }

        return Response::json($this->vacancies->open($req->requireUser(), $mrfId), 201);
    }

    /** @param array<string,string> $p */
    public function close(Request $req, array $p): Response
    {
        return Response::json($this->vacancies->close($req->requireUser(), (int) $p['id']));
    }
}
