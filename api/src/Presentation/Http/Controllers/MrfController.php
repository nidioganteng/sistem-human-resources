<?php
declare(strict_types=1);

namespace App\Presentation\Http\Controllers;

use App\Application\Recruitment\MrfUseCases;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;

final class MrfController
{
    public function __construct(private MrfUseCases $mrfs) {}

    /** @param array<string,string> $p */
    public function index(Request $req, array $p): Response
    {
        $status = isset($req->query['status']) ? (string) $req->query['status'] : null;

        return Response::json(['items' => $this->mrfs->list($req->requireUser(), $status)]);
    }

    /** @param array<string,string> $p */
    public function show(Request $req, array $p): Response
    {
        return Response::json($this->mrfs->get($req->requireUser(), (int) $p['id']));
    }

    /** @param array<string,string> $p */
    public function store(Request $req, array $p): Response
    {
        $submit = (bool) ($req->body['submit'] ?? false);

        return Response::json($this->mrfs->create($req->requireUser(), $req->body, $submit), 201);
    }

    /** @param array<string,string> $p */
    public function update(Request $req, array $p): Response
    {
        $submit = (bool) ($req->body['submit'] ?? false);

        return Response::json($this->mrfs->update($req->requireUser(), (int) $p['id'], $req->body, $submit));
    }

    /** @param array<string,string> $p */
    public function submit(Request $req, array $p): Response
    {
        return Response::json($this->mrfs->submit($req->requireUser(), (int) $p['id']));
    }

    /** @param array<string,string> $p */
    public function approve(Request $req, array $p): Response
    {
        $comment = isset($req->body['comment']) ? (string) $req->body['comment'] : null;

        return Response::json($this->mrfs->approve($req->requireUser(), (int) $p['id'], $comment));
    }

    /** @param array<string,string> $p */
    public function revise(Request $req, array $p): Response
    {
        return Response::json($this->mrfs->requestRevision(
            $req->requireUser(), (int) $p['id'], (string) ($req->body['comment'] ?? '')
        ));
    }

    /** @param array<string,string> $p */
    public function cancel(Request $req, array $p): Response
    {
        return Response::json($this->mrfs->cancel($req->requireUser(), (int) $p['id']));
    }
}
