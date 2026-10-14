<?php
declare(strict_types=1);

namespace App\Presentation\Http;

use App\Domain\Shared\DomainRuleViolation;
use App\Domain\Shared\NotAllowed;
use App\Domain\Shared\NotFound;
use App\Domain\Shared\Unauthenticated;
use App\Infrastructure\Wiring;
use Throwable;

final class Kernel
{
    public static function handle(): void
    {
        try {
            $request   = Request::fromGlobals();
            $container = Wiring::build();
            $router    = new Router();
            (require __DIR__ . '/routes.php')($router, $container);

            $router->dispatch($request)->send();
        } catch (HttpException $e) {
            Response::json(['message' => $e->getMessage()], $e->status)->send();
        } catch (Unauthenticated $e) {
            Response::json(['message' => $e->getMessage()], 401)->send();
        } catch (NotAllowed $e) {
            Response::json(['message' => $e->getMessage()], 403)->send();
        } catch (NotFound $e) {
            Response::json(['message' => $e->getMessage()], 404)->send();
        } catch (DomainRuleViolation $e) {
            Response::json(['message' => $e->getMessage()], 422)->send();
        } catch (Throwable $e) {
            error_log('[sistem-hr] ' . $e::class . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
            $debug = defined('APP_ENV') && APP_ENV === 'local';
            Response::json(['message' => $debug ? $e->getMessage() : 'Terjadi kesalahan pada server.'], 500)->send();
        }
    }
}
