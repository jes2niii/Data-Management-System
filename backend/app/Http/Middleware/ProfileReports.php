<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProfileReports
{
    public const STATE = '_dms_performance';

    public function handle(Request $request, Closure $next): Response
    {
        $route = $request->route()?->uri();
        if (!config('dms.profile_reports') || !app()->environment('staging', 'testing') || !$request->isMethod('GET')
            || !is_string($route) || ($route !== 'api/dashboard' && !str_starts_with($route, 'api/reports/'))) {
            return $next($request);
        }

        $metrics = (object) ['started' => hrtime(true), 'queryCount' => 0, 'dbMs' => 0.0];
        $request->attributes->set(self::STATE, $metrics);
        try {
            $response = $next($request);
        } finally {
            $request->attributes->remove(self::STATE);
        }
        if (!$response->isSuccessful()) {
            return $response;
        }

        if ($response instanceof StreamedResponse && ($callback = $response->getCallback()) !== null) {
            $response->setCallback(function () use ($callback, $request, $route, $response, $metrics) {
                $request->attributes->set(self::STATE, $metrics);
                $completed = false;
                try {
                    $callback();
                    $completed = true;
                } finally {
                    $request->attributes->remove(self::STATE);
                    $this->record($route, $response, $metrics, true, $completed);
                }
            });
        } else {
            $this->record($route, $response, $metrics, false, true);
        }

        return $response;
    }

    private function record(string $route, Response $response, object $metrics, bool $streamed, bool $completed): void
    {
        try {
            Log::info('dms.performance', [
                'route' => $route,
                'status' => $response->getStatusCode(),
                'app_ms' => round((hrtime(true) - $metrics->started) / 1e6, 2),
                'db_queries' => $metrics->queryCount,
                'db_ms' => round($metrics->dbMs, 2),
                'response_bytes' => $streamed ? null : strlen((string) $response->getContent()),
                'streamed' => $streamed,
                'completed' => $completed,
            ]);
        } catch (\Throwable) {
            error_log('DMS performance metrics could not be written.');
        }
    }
}
