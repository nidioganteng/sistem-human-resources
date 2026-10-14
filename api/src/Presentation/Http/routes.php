<?php
declare(strict_types=1);

use App\Infrastructure\Container;
use App\Presentation\Http\Controllers\ApplicantController;
use App\Presentation\Http\Controllers\AuthController;
use App\Presentation\Http\Controllers\MrfController;
use App\Presentation\Http\Controllers\PublicApplyController;
use App\Presentation\Http\Controllers\VacancyController;
use App\Presentation\Http\Middleware\Authenticate;
use App\Presentation\Http\Response;
use App\Presentation\Http\Router;

/** Daftar rute API. Tambah modul baru: tambahkan controller + rute di sini. */
return static function (Router $r, Container $c): void {
    $auth = $c->get(Authenticate::class);

    $r->add('GET', '/ping', static fn () => Response::json(['status' => 'ok']));

    $r->add('POST', '/auth/login', [$c->get(AuthController::class), 'login']);
    $r->add('GET', '/auth/me', [$c->get(AuthController::class), 'me'], [$auth]);

    $mrf = $c->get(MrfController::class);
    $r->add('GET',  '/mrfs',                [$mrf, 'index'],   [$auth]);
    $r->add('POST', '/mrfs',                [$mrf, 'store'],   [$auth]);
    $r->add('GET',  '/mrfs/{id}',           [$mrf, 'show'],    [$auth]);
    $r->add('PUT',  '/mrfs/{id}',           [$mrf, 'update'],  [$auth]);
    $r->add('POST', '/mrfs/{id}/submit',    [$mrf, 'submit'],  [$auth]);
    $r->add('POST', '/mrfs/{id}/approve',   [$mrf, 'approve'], [$auth]);
    $r->add('POST', '/mrfs/{id}/revise',    [$mrf, 'revise'],  [$auth]);
    $r->add('POST', '/mrfs/{id}/cancel',    [$mrf, 'cancel'],  [$auth]);

    $vac = $c->get(VacancyController::class);
    $r->add('GET',  '/vacancies',            [$vac, 'index'], [$auth]);
    $r->add('POST', '/vacancies',            [$vac, 'store'], [$auth]);
    $r->add('GET',  '/vacancies/{id}',       [$vac, 'show'],  [$auth]);
    $r->add('POST', '/vacancies/{id}/close', [$vac, 'close'], [$auth]);

    $app = $c->get(ApplicantController::class);
    $r->add('GET',  '/vacancies/{id}/applicants', [$app, 'index'],   [$auth]);
    $r->add('POST', '/applicants/{id}/approve',   [$app, 'approve'], [$auth]);
    $r->add('POST', '/applicants/{id}/reject',    [$app, 'reject'],  [$auth]);

    // Endpoint publik (tanpa middleware auth): pendaftaran pelamar
    $pub = $c->get(PublicApplyController::class);
    $r->add('GET',  '/apply/{token}', [$pub, 'show']);
    $r->add('POST', '/apply/{token}', [$pub, 'store']);
};
