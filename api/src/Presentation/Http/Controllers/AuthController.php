<?php
declare(strict_types=1);

namespace App\Presentation\Http\Controllers;

use App\Application\Identity\Login;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;

final class AuthController
{
    public function __construct(private Login $login) {}

    /** @param array<string,string> $p */
    public function login(Request $req, array $p): Response
    {
        $result = $this->login->execute((string) ($req->body['email'] ?? ''), (string) ($req->body['password'] ?? ''));

        return Response::json($result);
    }

    /** @param array<string,string> $p */
    public function me(Request $req, array $p): Response
    {
        return Response::json(['user' => $req->requireUser()->toPublicArray()]);
    }
}
