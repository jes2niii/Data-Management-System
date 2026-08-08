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

        $role = $user->role;

        if (!$role) {
            return response()->json(['message' => 'Forbidden. No role assigned.'], 403);
        }

        if ($role->name === 'Super Admin') {
            return $next($request);
        }

        [$module, $action] = str_contains($permission, '.') ? explode('.', $permission, 2) : [$permission, null];

        $query = $role->permissions()->where('module', $module);

        if ($action) {
            $query->where('action', $action);
        }

        if ($query->exists()) {
            return $next($request);
        }

        return response()->json(['message' => 'Forbidden. You do not have the required permission.'], 403);
    }
}
