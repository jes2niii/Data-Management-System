<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Services\CsvReport;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Response;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $logs = $this->filteredQuery($request)->with('user')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return $this->success($logs);
    }

    private function filteredQuery(Request $request): \Illuminate\Database\Eloquent\Builder
    {
        $query = ActivityLog::query();

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('module')) {
            $query->where('module', $request->module);
        }

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('date_from')) {
            $query->where('created_at', '>=', Carbon::parse($request->date_from)->startOfDay());
        }
        if ($request->filled('date_to')) {
            $query->where('created_at', '<=', Carbon::parse($request->date_to)->endOfDay());
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhere('module', 'like', "%{$search}%")
                    ->orWhere('action', 'like', "%{$search}%");
            });
        }

        if ($request->filled('affected_record_type') && $request->filled('affected_record_id')) {
            $query->where('affected_record_type', $request->affected_record_type)
                ->where('affected_record_id', $request->affected_record_id);
        }

        return $query;
    }

    public function show($id)
    {
        $log = ActivityLog::with('user')->findOrFail($id);

        return $this->success($log);
    }

    public function export(Request $request, CsvReport $csv, $format)
    {
        $logs = $this->filteredQuery($request)->with('user')
            ->orderBy('created_at', 'desc')->limit(10000)->get();

        $exportData = $logs->map(function ($log) {
            return [
                'ID' => $log->id,
                'User' => $log->user->name ?? 'System',
                'Module' => $log->module,
                'Action' => $log->action,
                'Description' => $log->description,
                'IP Address' => $log->ip_address,
                'Device' => $log->device,
                'Browser' => $log->browser,
                'Status' => $log->status,
                'Date' => $log->created_at?->format('Y-m-d H:i:s'),
            ];
        })->toArray();

        if ($format === 'csv') {
            return $csv->download('activity-logs-export.csv', [
                'ID', 'User', 'Module', 'Action', 'Description',
                'IP Address', 'Device', 'Browser', 'Status', 'Date',
            ], $exportData);
        }

        if ($format === 'json') {
            return Response::json($exportData, 200, [
                'Content-Disposition' => 'attachment; filename="activity-logs-export.json"',
                'Cache-Control' => 'private, no-store',
            ]);
        }

        return $this->error('Unsupported export format', 400);
    }
}
