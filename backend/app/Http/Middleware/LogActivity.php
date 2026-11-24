<?php

namespace App\Http\Middleware;

use App\Models\ActivityLog;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
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
    /** Fields never copied into log values (identifiers, audit columns, secrets). */
    private const HIDDEN_FIELDS = [
        'id', 'created_at', 'updated_at', 'deleted_at', 'created_by', 'updated_by',
        'recorded_by', 'changed_by', 'approved_by', 'locked_by', 'shared_by',
        'password', 'password_confirmation', 'current_password', 'smtp_password',
        'remember_token', 'api_token', 'token', 'access_token',
    ];

    private const SKIPPED_PREFIXES = [
        'api/activity-logs',
        'api/notifications',
        'api/search',
        'api/dashboard',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $before = $this->snapshotBefore($request);

        /** @var \Illuminate\Http\Response|\Illuminate\Http\JsonResponse $response */
        $response = $next($request);

        try {
            $this->logRequest($request, $response, $before);
        } catch (\Throwable $e) {
            // Logging must never break the actual request.
            report($e);
        }

        return $response;
    }

    private function logRequest(Request $request, $response, ?array $before): void
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

        [$module, $action] = $this->resolveModuleAction($request, $resource, $segments);

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

        $label = $this->recordLabel($response, $request);
        $after = $this->stateAfter($response, $resource, $affectedId);
        $changes = $status === 'success' ? $this->describeChanges($before, $after, $action) : '';
        $subject = $this->moduleLabel($module).($label !== '' ? " {$label}" : '').($changes !== '' ? " {$changes}" : '');
        $verb = str_replace('_', ' ', $action);

        if ($status === 'failed') {
            $description = "Failed to {$verb} {$subject} by {$actor} (HTTP {$statusCode})";
        } else {
            $description = match ($action) {
                'login' => "User {$actor} logged in",
                'logout' => "User {$actor} logged out",
                default => $this->actionLabel($action).' '.$subject.' by '.$actor,
            };
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
            'affected_record_type' => Str::studly(Str::singular($module)),
            'old_values' => $before ? $this->filterValues($before) : null,
            'new_values' => $after ? $this->filterValues($after) : null,
            'status' => $status,
            'created_at' => now(),
        ]);
    }

    private function resolveModuleAction(Request $request, string $resource, array $segments): array
    {
        if (in_array('login', $segments, true)) {
            return ['auth', 'login'];
        }
        if (in_array('logout', $segments, true)) {
            return ['auth', 'logout'];
        }

        $module = match ($resource) {
            'files' => 'documents',
            'folder-tree' => 'folders',
            'surveys', 'test-exams' => 'items',
            'attendance-statuses' => 'attendances',
            default => Str::snake($resource),
        };

        // Specific verbs are route segments, not substrings, so "remove" is
        // never mistaken for "move" and "mark-as-read" stays distinct from "read".
        $verbs = [
            'restore', 'favorite', 'lock', 'share', 'approve', 'reject',
            'archive', 'move', 'renew', 'pause', 'resume', 'read',
            'mark-paid', 'mark-as-read', 'read-all', 'reset-password',
            'assign-role', 'disable', 'enable', 'adjust', 'upload',
            'download', 'version', 'comments', 'responses', 'analyze',
            'price-history',
        ];
        foreach ($verbs as $verb) {
            if (in_array($verb, $segments, true)) {
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

    private function actionLabel(string $action): string
    {
        return match ($action) {
            'create' => 'Created',
            'update' => 'Updated',
            'delete' => 'Deleted',
            'restore' => 'Restored',
            'favorite' => 'Favorited',
            'lock' => 'Locked',
            'share' => 'Shared',
            'approve' => 'Approved',
            'reject' => 'Rejected',
            'archive' => 'Archived',
            'move' => 'Moved',
            'renew' => 'Renewed',
            'pause' => 'Paused',
            'resume' => 'Resumed',
            'mark_paid' => 'Marked as paid',
            'mark_as_read', 'read' => 'Marked as read',
            'read_all' => 'Marked all as read',
            'reset_password' => 'Reset password for',
            'assign_role' => 'Assigned role to',
            'disable' => 'Disabled',
            'enable' => 'Enabled',
            'adjust' => 'Adjusted',
            'upload' => 'Uploaded',
            'download' => 'Downloaded',
            'version' => 'Uploaded version for',
            'comments' => 'Commented on',
            'responses' => 'Responded to',
            'analyze' => 'Analyzed',
            'price_history' => 'Viewed price history for',
            default => ucfirst(str_replace('_', ' ', $action)),
        };
    }

    private function moduleLabel(string $module): string
    {
        return Str::lower(Str::singular(Str::headline($module)));
    }

    private function snapshotBefore(Request $request): ?array
    {
        if (!in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return null;
        }

        $path = trim($request->path(), '/');
        foreach (self::SKIPPED_PREFIXES as $prefix) {
            if (str_starts_with($path, $prefix)) {
                return null;
            }
        }

        $segments = explode('/', $path);
        array_shift($segments);
        $modelClass = $this->modelFor($segments[0] ?? '');
        $id = $this->resolveAffectedId($request, $segments);
        if ($modelClass === null || $id === null || !is_numeric($id)) {
            return null;
        }

        try {
            return $modelClass::find((int) $id)?->toArray();
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function stateAfter($response, string $resource, ?string $affectedId): ?array
    {
        $data = $this->responseData($response);
        if ($data !== null) {
            if (isset($data['item']) && is_array($data['item'])) {
                return $data['item'];
            }
            if (isset($data['id'])) {
                return $data;
            }
        }

        if ($affectedId === null || !is_numeric($affectedId)) {
            return null;
        }
        $modelClass = $this->modelFor($resource);

        try {
            return $modelClass !== null ? $modelClass::find((int) $affectedId)?->toArray() : null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function responseData($response): ?array
    {
        if (!method_exists($response, 'getData')) {
            return null;
        }
        try {
            $data = $response->getData(true)['data'] ?? null;
        } catch (\Throwable $e) {
            return null;
        }

        return is_array($data) && !array_is_list($data) ? $data : null;
    }

    private function modelFor(string $resource): ?string
    {
        return match ($resource) {
            'departments' => \App\Models\Department::class,
            'users' => \App\Models\User::class,
            'roles' => \App\Models\Role::class,
            'employees' => \App\Models\Employee::class,
            'files', 'documents' => \App\Models\Document::class,
            'folders' => \App\Models\Folder::class,
            'forms' => \App\Models\Form::class,
            'surveys' => \App\Models\SurveyForm::class,
            'test-exams' => \App\Models\TestExam::class,
            'bills' => \App\Models\Bill::class,
            'bill-categories' => \App\Models\BillCategory::class,
            'subscriptions' => \App\Models\Subscription::class,
            'inventory' => \App\Models\InventoryItem::class,
            'book-inventories' => \App\Models\BookInventory::class,
            'trainings' => \App\Models\Training::class,
            'training-monitorings' => \App\Models\TrainingMonitoring::class,
            'training-details' => \App\Models\TrainingDetail::class,
            default => null,
        };
    }

    private function recordLabel($response, Request $request): string
    {
        $data = $this->responseData($response);
        if (isset($data['item']) && is_array($data['item'])) {
            $data = $data['item'];
        }

        $name = $this->findName($data);
        if ($name === null) {
            foreach (['name', 'title', 'email', 'code'] as $key) {
                $value = $request->input($key);
                if (is_string($value) && $value !== '') {
                    $name = $value;
                    break;
                }
            }
        }

        return $name !== null ? '"'.$name.'"' : '';
    }

    private function findName(?array $data): ?string
    {
        if ($data === null) {
            return null;
        }
        foreach (['name', 'title', 'full_name', 'email', 'username', 'code', 'reference_number'] as $key) {
            if (isset($data[$key]) && is_scalar($data[$key]) && (string) $data[$key] !== '') {
                return (string) $data[$key];
            }
        }

        return null;
    }

    private function filterValues(array $values): array
    {
        $filtered = [];
        foreach ($values as $key => $value) {
            if (in_array($key, self::HIDDEN_FIELDS, true)) {
                continue;
            }
            if (is_array($value)) {
                $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            } elseif ($value instanceof \DateTimeInterface) {
                $value = $value->format('Y-m-d H:i:s');
            } elseif (!is_scalar($value) && $value !== null) {
                continue;
            }
            $filtered[$key] = $value;
        }

        return $filtered;
    }

    private function describeChanges(?array $before, ?array $after, string $action): string
    {
        if ($action === 'create') {
            $values = $this->filterValues($after ?? []);
            return $values !== [] ? '('.$this->formatPairs($values).')' : '';
        }

        $before = $this->filterValues($before ?? []);
        if ($action === 'delete') {
            return $before !== [] ? '(removed: '.$this->formatPairs($before).')' : '';
        }

        $after = $this->filterValues($after ?? []);
        $pairs = [];
        foreach ($after as $key => $value) {
            if (!array_key_exists($key, $before)) {
                continue;
            }
            $old = $this->formatValue($before[$key]);
            $new = $this->formatValue($value);
            if ($old === $new) {
                continue;
            }
            $pairs[] = Str::headline($key).': '.$old.' → '.$new;
            if (count($pairs) >= 4) {
                break;
            }
        }

        return $pairs !== [] ? '('.implode('; ', $pairs).')' : '';
    }

    private function formatPairs(array $values): string
    {
        $parts = [];
        foreach ($values as $key => $value) {
            $parts[] = Str::headline($key).': '.$this->formatValue($value);
            if (count($parts) >= 4) {
                break;
            }
        }

        return implode('; ', $parts);
    }

    private function formatValue(mixed $value): string
    {
        if ($value === null || $value === '') {
            return 'empty';
        }
        if (is_bool($value)) {
            return $value ? 'yes' : 'no';
        }
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d H:i:s');
        }

        return '"'.mb_substr((string) $value, 0, 80).'"';
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
