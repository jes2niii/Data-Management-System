<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user()?->canSignIn()) {
            return response()->json(['message' => 'Account is not active.'], 403);
        }

        return $next($request);
    }
}
