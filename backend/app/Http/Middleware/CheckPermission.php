<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        [$module, $action] = explode('.', $permission, 2);
        if ($user->hasPermission($module, $action)) {
            return $next($request);
        }

        return response()->json(['message' => 'Forbidden. You do not have the required permission.'], 403);
    }
}
