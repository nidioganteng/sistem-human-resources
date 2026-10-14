<?php
declare(strict_types=1);

namespace App\Presentation\Http;

final class Router
{
    /** @var list<array{method:string,regex:string,handler:callable,middleware:list<callable>}> */
    private array $routes = [];

    /** @param list<callable> $middleware callable(Request, callable $next): Response */
    public function add(string $method, string $pattern, callable $handler, array $middleware = []): void
    {
        $regex = '#^' . preg_replace('#\{(\w+)\}#', '(?<$1>[^/]+)', $pattern) . '$#';
        $this->routes[] = compact('method', 'regex', 'handler', 'middleware');
    }

    public function dispatch(Request $req): Response
    {
        $pathMatched = false;

        foreach ($this->routes as $r) {
            if (!preg_match($r['regex'], $req->path, $m)) {
                continue;
            }
            $pathMatched = true;
            if ($r['method'] !== $req->method) {
                continue;
            }

            $params  = array_filter($m, 'is_string', ARRAY_FILTER_USE_KEY);
            $handler = static fn (Request $q): Response => ($r['handler'])($q, $params);

            // Rantai middleware: yang pertama terdaftar paling luar.
            foreach (array_reverse($r['middleware']) as $mw) {
                $next    = $handler;
                $handler = static fn (Request $q): Response => $mw($q, $next);
            }

            return $handler($req);
        }

        throw new HttpException($pathMatched ? 405 : 404, $pathMatched ? 'Metode tidak diizinkan.' : 'Endpoint tidak ditemukan.');
    }
}
