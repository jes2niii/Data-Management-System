<?php

namespace App\Http\Middleware;

use App\Models\ActivityLog;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Automatic activity logging for mutating API requests.
 *
 * The activity_logs table was always empty because ActivityLogService::log()
 * was never called from any controller. This middleware closes that gap
 * centrally: every POST/PUT/PATCH/DELETE under /api creates one log row
 * (best-effort, never breaks the request).
 */
class LogActivity
{
    /** Route prefixes that must never create logs (noise / feedback loops). */
    private const SKIPPED_PREFIXES = [
        'api/activity-logs',
        'api/notifications',
        'api/search',
        'api/dashboard',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        /** @var \Illuminate\Http\Response|\Illuminate\Http\JsonResponse $response */
        $response = $next($request);

        try {
            $this->logRequest($request, $response);
        } catch (\Throwable $e) {
            // Logging must never break the actual request.
            report($e);
        }

        return $response;
    }

    private function logRequest(Request $request, $response): void
    {
        if (!in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return;
        }

        $path = trim($request->path(), '/'); // e.g. "api/employees/5/attachments"
        foreach (self::SKIPPED_PREFIXES as $prefix) {
            if (str_starts_with($path, $prefix)) {
                return;
            }
        }

        $statusCode = method_exists($response, 'getStatusCode') ? $response->getStatusCode() : 200;
        $status = $statusCode < 400 ? 'success' : 'failed';

        $segments = explode('/', $path);
        array_shift($segments); // drop "api"
        $resource = $segments[0] ?? 'system';

        [$module, $action] = $this->resolveModuleAction($request, $resource, $path);

        // $request->user() is populated here because auth middleware already ran.
        $user = $request->user();
        $userId = $user?->id;

        // Login has no token yet — resolve the user from the credentials on success.
        if ($userId === null && $resource === 'login' && $status === 'success') {
            $userId = User::where('email', $request->input('email'))->value('id');
            $user = $userId ? User::find($userId) : null;
        }

        $actor = $user?->email ?? $request->input('email') ?? 'System';
        $affectedId = $this->resolveAffectedId($request, $segments);
        if ($affectedId === null && $action === 'create') {
            $affectedId = $this->resolveCreatedId($response);
        }

        $description = match ($action) {
            'login' => "User {$actor} logged in",
            'logout' => "User {$actor} logged out",
            'create' => "Created {$module}" . ($affectedId ? " #{$affectedId}" : '') . " by {$actor}",
            'update' => "Updated {$module}" . ($affectedId ? " #{$affectedId}" : '') . " by {$actor}",
            'delete' => "Deleted {$module}" . ($affectedId ? " #{$affectedId}" : '') . " by {$actor}",
            default => ucfirst($action) . " {$module}" . ($affectedId ? " #{$affectedId}" : '') . " by {$actor}",
        };

        if ($status === 'failed') {
            $description .= " (HTTP {$statusCode})";
        }

        ActivityLog::create([
            'user_id' => $userId,
            'ip_address' => $request->ip(),
            'device' => $this->device($request),
            'browser' => $this->browser($request),
            'operating_system' => $this->os($request),
            'module' => $module,
            'action' => $action,
            'description' => mb_substr($description, 0, 1000),
            'affected_record_id' => is_numeric($affectedId) ? (int) $affectedId : null,
            'affected_record_type' => null,
            'old_values' => null,
            'new_values' => null,
            'status' => $status,
            'created_at' => now(),
        ]);
    }

    private function resolveModuleAction(Request $request, string $resource, string $path): array
    {
        $lower = strtolower($path);

        if (str_contains($lower, 'login')) {
            return ['auth', 'login'];
        }
        if (str_contains($lower, 'logout')) {
            return ['auth', 'logout'];
        }

        $module = match ($resource) {
            'files', 'documents', 'folders', 'folder-tree',
            'document-categories', 'folder-categories' => 'files',
            'bills', 'bill-categories', 'subscriptions' => 'billing',
            'forms', 'form-categories', 'surveys', 'test-exams' => 'forms',
            'users', 'roles', 'permissions' => 'users',
            'employees', 'departments', 'attendances', 'attendance-statuses' => 'employees',
            'settings' => 'settings',
            default => $resource,
        };

        // Specific verbs hidden inside POST URLs (e.g. /files/5/restore).
        $verbs = [
            'restore', 'favorite', 'lock', 'share', 'approve', 'reject',
            'archive', 'move', 'renew', 'pause', 'resume', 'read',
            'mark-paid', 'mark-as-read', 'read-all', 'reset-password',
            'assign-role', 'disable', 'enable', 'adjust', 'upload',
            'download', 'version', 'comments', 'responses', 'analyze',
            'price-history',
        ];
        foreach ($verbs as $verb) {
            if (str_contains($lower, $verb)) {
                return [$module, str_replace('-', '_', $verb)];
            }
        }

        $action = match ($request->method()) {
            'POST' => 'create',
            'PUT', 'PATCH' => 'update',
            'DELETE' => 'delete',
            default => 'update',
        };

        return [$module, $action];
    }

    private function resolveAffectedId(Request $request, array $segments): ?string
    {
        // First numeric segment is usually the affected record id.
        foreach ($segments as $seg) {
            if (is_numeric($seg)) {
                return $seg;
            }
        }
        return null;
    }

    private function resolveCreatedId($response): ?string
    {
        try {
            if (!method_exists($response, 'getData')) {
                return null;
            }
            $data = $response->getData(true);
            $id = $data['data']['id'] ?? null;
            return is_numeric($id) ? (string) $id : null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function device(Request $request): ?string
    {
        $ua = (string) $request->header('User-Agent');
        if ($ua === '') {
            return null;
        }
        if (stripos($ua, 'mobile') !== false || stripos($ua, 'android') !== false || stripos($ua, 'iphone') !== false) {
            return 'Mobile';
        }
        if (stripos($ua, 'tablet') !== false || stripos($ua, 'ipad') !== false) {
            return 'Tablet';
        }
        return 'Desktop';
    }

    private function browser(Request $request): ?string
    {
        $ua = (string) $request->header('User-Agent');
        foreach (['Edge' => '/edg/i', 'Chrome' => '/chrome/i', 'Firefox' => '/firefox/i', 'Safari' => '/safari/i'] as $name => $pattern) {
            if (preg_match($pattern, $ua)) {
                return $name;
            }
        }
        return $ua === '' ? null : 'Unknown';
    }

    private function os(Request $request): ?string
    {
        $ua = (string) $request->header('User-Agent');
        foreach (['Windows' => '/windows/i', 'macOS' => '/macintosh|mac os x/i', 'Linux' => '/linux/i', 'Android' => '/android/i', 'iOS' => '/iphone|ipad|ipod/i'] as $name => $pattern) {
            if (preg_match($pattern, $ua)) {
                return $name;
            }
        }
        return $ua === '' ? null : 'Unknown';
    }
}
