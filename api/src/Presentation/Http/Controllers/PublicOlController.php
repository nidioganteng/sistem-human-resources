<?php
declare(strict_types=1);

namespace App\Presentation\Http\Controllers;

use App\Application\Recruitment\OfferingLetterUseCases;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;

final class PublicOlController
{
    public function __construct(private OfferingLetterUseCases $ols) {}

    /** GET /ol/{token} - lihat Offering Letter tanpa autentikasi */
    /** @param array<string,string> $p */
    public function show(Request $req, array $p): Response
    {
        $data = $this->ols->getPublic($p['token']);

        return Response::json($data);
    }

    /** POST /ol/{token}/respond - kandidat merespons (accept/decline/contact) */
    /** @param array<string,string> $p */
    public function respond(Request $req, array $p): Response
    {
        $action = isset($req->body['action']) ? (string) $req->body['action'] : '';
        $this->ols->respond($p['token'], $action);

        return Response::json(['success' => true]);
    }
}
