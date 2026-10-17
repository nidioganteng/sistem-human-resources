<?php
declare(strict_types=1);

use App\Infrastructure\Container;
use App\Presentation\Http\Controllers\ApplicantController;
use App\Presentation\Http\Controllers\ApplicantFormController;
use App\Presentation\Http\Controllers\AuthController;
use App\Presentation\Http\Controllers\EmployeeController;
use App\Presentation\Http\Controllers\MrfController;
use App\Presentation\Http\Controllers\OfferingLetterController;
use App\Presentation\Http\Controllers\PublicApplyController;
use App\Presentation\Http\Controllers\PublicOnboardingController;
use App\Presentation\Http\Controllers\PublicOlController;
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
    $r->add('POST', '/mrfs/{id}/recall',    [$mrf, 'recall'],  [$auth]);

    $vac = $c->get(VacancyController::class);
    $r->add('GET',  '/vacancies',                          [$vac, 'index'],           [$auth]);
    $r->add('POST', '/vacancies',                          [$vac, 'store'],           [$auth]);
    $r->add('GET',  '/vacancies/{id}',                     [$vac, 'show'],            [$auth]);
    $r->add('POST', '/vacancies/{id}/close',               [$vac, 'close'],           [$auth]);
    $r->add('POST', '/vacancies/{id}/reopen',              [$vac, 'reopen'],          [$auth]);
    $r->add('POST', '/vacancies/{id}/archive',             [$vac, 'archive'],         [$auth]);
    $r->add('GET',  '/vacancies/{id}/archive-download',    [$vac, 'downloadArchive'], [$auth]);

    $app = $c->get(ApplicantController::class);
    $r->add('GET',  '/candidates',               [$app, 'candidates'],   [$auth]);
    $r->add('GET',  '/vacancies/{id}/applicants',      [$app, 'index'],     [$auth]);
    $r->add('GET',  '/applicants/{id}',                [$app, 'show'],      [$auth]);
    $r->add('GET',  '/applicants/{id}/file/{type}',    [$app, 'serveFile'],    [$auth]);
    $r->add('GET',  '/applicants/{id}/form-data',      [$app, 'showFormData'], [$auth]);
    $r->add('POST', '/applicants/{id}/approve',        [$app, 'approve'],      [$auth]);
    $r->add('POST', '/applicants/{id}/reject',         [$app, 'reject'],       [$auth]);
    $r->add('POST', '/applicants/{id}/shortlist',      [$app, 'shortlist'],    [$auth]);
    $r->add('POST', '/applicants/{id}/call-selection', [$app, 'callToSelection'], [$auth]);
    $r->add('POST', '/applicants/{id}/record-selection', [$app, 'recordSelection'], [$auth]);
    $r->add('GET',  '/applicants/{id}/selections',     [$app, 'listSelections'],  [$auth]);
    $r->add('POST', '/applicants/{id}/hire',           [$app, 'hire'],            [$auth]);

    $ol = $c->get(OfferingLetterController::class);
    $r->add('GET',  '/offering-letters',                  [$ol, 'list'],    [$auth]);
    $r->add('POST', '/offering-letters',                  [$ol, 'store'],   [$auth]);
    $r->add('GET',  '/offering-letters/{id}',             [$ol, 'show'],    [$auth]);
    $r->add('PUT',  '/offering-letters/{id}',             [$ol, 'update'],  [$auth]);
    $r->add('POST', '/offering-letters/{id}/submit',      [$ol, 'submit'],  [$auth]);
    $r->add('POST', '/offering-letters/{id}/approve',     [$ol, 'approve'], [$auth]);
    $r->add('POST', '/offering-letters/{id}/revise',      [$ol, 'revise'],  [$auth]);
    $r->add('POST', '/offering-letters/{id}/send',        [$ol, 'send'],    [$auth]);
    $r->add('POST', '/offering-letters/{id}/resend',      [$ol, 'resend'],  [$auth]);

    $emp = $c->get(EmployeeController::class);
    $r->add('GET',  '/employees',                           [$emp, 'index'],          [$auth]);
    $r->add('POST', '/employees',                           [$emp, 'store'],          [$auth]);
    $r->add('GET',  '/employees/{id}',                      [$emp, 'show'],           [$auth]);
    $r->add('PUT',  '/employees/{id}',                      [$emp, 'update'],         [$auth]);
    $r->add('POST', '/employees/{id}/generate-link',        [$emp, 'generateLink'],   [$auth]);
    $r->add('POST', '/employees/{id}/validate',             [$emp, 'validate'],       [$auth]);
    $r->add('GET',  '/employees/{id}/documents/{docType}',  [$emp, 'serveDocument'],  [$auth]);

    // Endpoint publik (tanpa middleware auth): pendaftaran pelamar
    $pub = $c->get(PublicApplyController::class);
    $r->add('GET',  '/apply/{token}', [$pub, 'show']);
    $r->add('POST', '/apply/{token}', [$pub, 'store']);

    // Endpoint publik (tanpa middleware auth): Form Pelamar digital
    $form = $c->get(ApplicantFormController::class);
    $r->add('GET',  '/form-pelamar/{token}', [$form, 'show']);
    $r->add('POST', '/form-pelamar/{token}', [$form, 'store']);

    // Endpoint publik (tanpa middleware auth): Offering Letter kandidat
    $pubOl = $c->get(PublicOlController::class);
    $r->add('GET',  '/ol/{token}',         [$pubOl, 'show']);
    $r->add('POST', '/ol/{token}/respond', [$pubOl, 'respond']);

    // Endpoint publik (tanpa middleware auth): onboarding karyawan mandiri
    $onb = $c->get(PublicOnboardingController::class);
    $r->add('GET',  '/onboarding/{token}',        [$onb, 'show']);
    $r->add('POST', '/onboarding/{token}',        [$onb, 'submit']);
    $r->add('POST', '/onboarding/{token}/upload', [$onb, 'upload']);
};
