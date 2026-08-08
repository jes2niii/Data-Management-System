<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $query = ActivityLog::with('user');

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

        if ($request->filled('date_from') && $request->filled('date_to')) {
            $query->whereBetween('created_at', [$request->date_from, $request->date_to]);
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

        $logs = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return $this->success($logs);
    }

    public function show($id)
    {
        $log = ActivityLog::with('user')->findOrFail($id);

        return $this->success($log);
    }

    public function export(Request $request, $format)
    {
        $query = ActivityLog::with('user');

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

        if ($request->filled('date_from') && $request->filled('date_to')) {
            $query->whereBetween('created_at', [$request->date_from, $request->date_to]);
        }

        $logs = $query->limit(10000)->get();

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
            $csv = $this->arrayToCsv($exportData);
            return Response::make($csv, 200, [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="activity-logs-export.csv"',
            ]);
        }

        if ($format === 'json') {
            return Response::json($exportData, 200, [
                'Content-Disposition' => 'attachment; filename="activity-logs-export.json"',
            ]);
        }

        return $this->error('Unsupported export format', 400);
    }

    private function arrayToCsv(array $data): string
    {
        if (empty($data)) {
            return '';
        }

        $output = fopen('php://temp', 'r+');
        fputcsv($output, array_keys($data[0]));

        foreach ($data as $row) {
            fputcsv($output, $row);
        }

        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);

        return $csv;
    }
}
