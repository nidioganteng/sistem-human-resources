<?php
declare(strict_types=1);

namespace App\Presentation\Http\Controllers;

use App\Application\Recruitment\OfferingLetterUseCases;
use App\Domain\Identity\Role;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;

final class OfferingLetterController
{
    public function __construct(private OfferingLetterUseCases $ols) {}

    /** GET /offering-letters */
    /** @param array<string,string> $p */
    public function list(Request $req, array $p): Response
    {
        $actor = $req->requireUser();
        $items = $actor->role === Role::Hr
            ? $this->ols->listForHr($actor)
            : $this->ols->listPendingCeo($actor);

        return Response::json(['items' => $items]);
    }

    /** POST /offering-letters */
    /** @param array<string,string> $p */
    public function store(Request $req, array $p): Response
    {
        $body        = $req->body;
        $applicantId = isset($body['applicantId']) ? (int) $body['applicantId'] : 0;
        $position    = isset($body['position'])    ? (string) $body['position'] : '';
        $salary      = isset($body['salary'])      ? (float) $body['salary']   : 0.0;
        $startDate   = isset($body['startDate'])   ? (string) $body['startDate'] : null;
        $olBody      = isset($body['body'])        ? (string) $body['body']    : '';

        if ($startDate !== null && trim($startDate) === '') {
            $startDate = null;
        }

        $data = $this->ols->create($req->requireUser(), $applicantId, $position, $salary, $startDate, $olBody);

        return Response::json($data, 201);
    }

    /** GET /offering-letters/{id} */
    /** @param array<string,string> $p */
    public function show(Request $req, array $p): Response
    {
        $data = $this->ols->get($req->requireUser(), (int) $p['id']);

        return Response::json($data);
    }

    /** PUT /offering-letters/{id} */
    /** @param array<string,string> $p */
    public function update(Request $req, array $p): Response
    {
        $body      = $req->body;
        $position  = isset($body['position'])  ? (string) $body['position'] : '';
        $salary    = isset($body['salary'])    ? (float) $body['salary']   : 0.0;
        $startDate = isset($body['startDate']) ? (string) $body['startDate'] : null;
        $olBody    = isset($body['body'])      ? (string) $body['body']    : '';

        if ($startDate !== null && trim($startDate) === '') {
            $startDate = null;
        }

        $data = $this->ols->update($req->requireUser(), (int) $p['id'], $position, $salary, $startDate, $olBody);

        return Response::json($data);
    }

    /** POST /offering-letters/{id}/submit */
    /** @param array<string,string> $p */
    public function submit(Request $req, array $p): Response
    {
        $data = $this->ols->submit($req->requireUser(), (int) $p['id']);

        return Response::json($data);
    }

    /** POST /offering-letters/{id}/approve */
    /** @param array<string,string> $p */
    public function approve(Request $req, array $p): Response
    {
        $data = $this->ols->approve($req->requireUser(), (int) $p['id']);

        return Response::json($data);
    }

    /** POST /offering-letters/{id}/revise */
    /** @param array<string,string> $p */
    public function revise(Request $req, array $p): Response
    {
        $comment = isset($req->body['comment']) ? (string) $req->body['comment'] : '';
        $data    = $this->ols->revise($req->requireUser(), (int) $p['id'], $comment);

        return Response::json($data);
    }

    /** POST /offering-letters/{id}/send */
    /** @param array<string,string> $p */
    public function send(Request $req, array $p): Response
    {
        $appBaseUrl = isset($req->body['appBaseUrl']) ? (string) $req->body['appBaseUrl'] : '';
        $data       = $this->ols->send($req->requireUser(), (int) $p['id'], $appBaseUrl);

        return Response::json($data);
    }
}
