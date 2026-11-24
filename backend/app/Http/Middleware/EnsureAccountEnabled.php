<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->is_disabled) {
            return response()->json(['message' => 'Account is disabled.'], 403);
        }

        return $next($request);
    }
}
