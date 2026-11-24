<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Bill;
use App\Models\Department;
use App\Models\Document;
use App\Models\Employee;
use App\Services\CsvReport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;

class ReportController extends Controller
{
    public function departments()
    {
        return $this->success(Department::orderBy('name')->get(['id', 'name']));
    }

    public function employeeReport(Request $request)
    {
        $employees = $this->employees($request)->get();

        $byDepartment = $employees->groupBy('department_id')->map(function ($group) {
            $dept = $group->first()->department;
            return [
                'department' => $dept->name ?? 'Unknown',
                'total' => $group->count(),
                'active' => $group->where('status', 'active')->count(),
                'inactive' => $group->where('status', 'inactive')->count(),
            ];
        })->values();

        $byStatus = $employees->groupBy('status')->map->count();

        $byType = $employees->groupBy('employment_type')->map->count();

        return $this->success([
            'total_employees' => $employees->count(),
            'by_department' => $byDepartment,
            'by_status' => $byStatus,
            'by_employment_type' => $byType,
            'employees' => $employees,
        ]);
    }

    public function documentReport(Request $request)
    {
        $documents = $this->documents($request)->get();

        $byCategory = $documents->groupBy('category')->map->count();
        $byStatus = $documents->groupBy('status')->map->count();
        $byApprovalStatus = $documents->groupBy('approval_status')->map->count();
        $byType = $documents->groupBy('file_type')->map->count();
        $totalSize = $documents->sum('file_size');

        $monthlyUploads = $documents->filter(fn ($row) => $row->created_at !== null)
            ->groupBy(fn ($row) => $row->created_at->format('Y-m'))->sortKeys()
            ->map(fn ($rows, $month) => ['month' => $month, 'count' => $rows->count()])->values();

        return $this->success([
            'total_documents' => $documents->count(),
            'total_size' => $totalSize,
            'by_category' => $byCategory,
            'by_status' => $byStatus,
            'by_approval_status' => $byApprovalStatus,
            'by_type' => $byType,
            'monthly_uploads' => $monthlyUploads,
            'favorites' => $documents->where('is_favorite', true)->count(),
            'locked' => $documents->where('is_locked', true)->count(),
            'documents' => $documents,
        ]);
    }

    public function billReport(Request $request)
    {
        $bills = $this->bills($request)->get();

        $totalAmount = $bills->sum('amount');
        $paidAmount = $bills->where('status', 'paid')->sum('amount');
        $pendingAmount = $bills->where('status', 'pending')->sum('amount');
        $overdueAmount = $bills->where('status', 'overdue')->sum('amount');

        $monthlyTotals = $bills->groupBy(function ($bill) {
            return $bill->billing_date->format('Y-m');
        })->map(function ($group) {
            return [
                'total' => $group->sum('amount'),
                'count' => $group->count(),
            ];
        });

        return $this->success([
            'total_bills' => $bills->count(),
            'total_amount' => $totalAmount,
            'paid_amount' => $paidAmount,
            'pending_amount' => $pendingAmount,
            'overdue_amount' => $overdueAmount,
            'monthly_totals' => $monthlyTotals,
            'bills' => $bills,
        ]);
    }

    public function activityReport(Request $request)
    {
        $query = $this->activities($request);

        $totalActions = $query->count();
        $byModule = (clone $query)->select('module', DB::raw('COUNT(*) as count'))
            ->groupBy('module')
            ->get()
            ->pluck('count', 'module');

        $byAction = (clone $query)->select('action', DB::raw('COUNT(*) as count'))
            ->groupBy('action')
            ->get()
            ->pluck('count', 'action');

        $byStatus = (clone $query)->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status');

        $dailyActivity = (clone $query)->select(DB::raw('DATE(created_at) as date'), DB::raw('COUNT(*) as count'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $logs = $query->with('user:id,name')->orderBy('created_at', 'desc')->limit(200)->get();

        return $this->success([
            'total_actions' => $totalActions,
            'by_module' => $byModule,
            'by_action' => $byAction,
            'by_status' => $byStatus,
            'daily_activity' => $dailyActivity,
            'logs' => $logs,
        ]);
    }

    public function export(Request $request, CsvReport $csv, $type, $format)
    {
        $reports = [
            'employee' => ['employeeReport', 'employees'],
            'document' => ['documentReport', 'documents'],
            'bill' => ['billReport', 'bills'],
            'activity' => ['activityReport', 'activity_logs'],
        ];
        $report = $reports[$type] ?? null;
        if ($report === null) {
            return $this->error('Invalid report type', 400);
        }

        [$method, $module] = $report;
        abort_unless($request->user()->hasPermission($module, 'read'), 403);
        if ($format === 'json') {
            return Response::json($this->{$method}($request)->getData(true), 200, [
                'Content-Disposition' => "attachment; filename=\"{$type}-report.json\"",
                'Cache-Control' => 'private, no-store',
            ]);
        }
        if ($format !== 'csv') {
            return $this->error('Unsupported export format. Use CSV or JSON.', 400);
        }
        [$query, $headers, $row] = match ($type) {
            'employee' => [
                $this->employees($request)->select('id', 'employee_id', 'full_name', 'department_id', 'position', 'date_hired', 'status')
                    ->with('department:id,name'),
                ['Employee ID', 'Name', 'Department', 'Position', 'Hire Date', 'Status'],
                fn (Employee $employee) => [$employee->employee_id, $employee->full_name, $employee->department?->name,
                    $employee->position, $employee->date_hired?->toDateString(), $employee->status],
            ],
            'document' => [
                $this->documents($request)->without('folder')
                    ->select('id', 'original_name', 'name', 'file_type', 'file_size', 'created_by', 'created_at'),
                ['File Name', 'Type', 'Size (bytes)', 'Uploaded By', 'Upload Date'],
                fn (Document $document) => [$document->original_name ?: $document->name, $document->file_type,
                    $document->file_size, $document->creator?->name, $document->created_at?->toDateTimeString()],
            ],
            'bill' => [
                $this->bills($request)->select('id', 'name', 'bill_category_id', 'provider', 'amount', 'billing_date', 'due_date', 'status')
                    ->with('category:id,name'),
                ['Bill Name', 'Category', 'Provider', 'Amount', 'Billing Date', 'Due Date', 'Status'],
                fn (Bill $bill) => [$bill->name, $bill->category?->name, $bill->provider, $bill->amount,
                    $bill->billing_date?->toDateString(), $bill->due_date?->toDateString(), $bill->status],
            ],
            'activity' => [
                $this->activities($request)->select('id', 'user_id', 'created_at', 'module', 'action', 'description')->with('user:id,name'),
                ['Timestamp', 'User', 'Module', 'Action', 'Description'],
                fn (ActivityLog $log) => [$log->created_at?->toDateTimeString(), $log->user?->name,
                    $log->module, $log->action, $log->description],
            ],
        };

        return $csv->download("{$type}-report.csv", $headers, $query->lazyById(500)->map($row));
    }

    private function employees(Request $request): Builder
    {
        $filters = $request->validate([
            'department_id' => 'nullable|integer|min:1',
            'status' => 'nullable|string|max:50',
            'employment_type' => 'nullable|string|max:50',
        ]);
        $query = Employee::with('department');
        foreach (['department_id', 'status', 'employment_type'] as $column) {
            if (isset($filters[$column])) {
                $query->where($column, $filters[$column]);
            }
        }

        return $query;
    }

    private function documents(Request $request): Builder
    {
        $filters = $request->validate(['category' => 'nullable|string|max:100']);
        $query = Document::query()->visibleTo($request->user())->with(['folder', 'creator:id,name']);
        if (isset($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        return $this->dateRange($request, $query, 'created_at');
    }

    private function bills(Request $request): Builder
    {
        $filters = $request->validate(['status' => 'nullable|string|max:50', 'category_id' => 'nullable|integer|min:1']);
        $query = Bill::with('category');
        if (isset($filters['status'])) {
            $query->where('status', $filters['status'] === 'unpaid' ? 'pending' : $filters['status']);
        }
        if (isset($filters['category_id'])) {
            $query->where('bill_category_id', $filters['category_id']);
        }

        return $this->dateRange($request, $query, 'billing_date');
    }

    private function activities(Request $request): Builder
    {
        $filters = $request->validate(['user_id' => 'nullable|integer|min:1', 'module' => 'nullable|string|max:100']);
        $query = ActivityLog::query();
        foreach (['user_id', 'module'] as $column) {
            if (isset($filters[$column])) {
                $query->where($column, $filters[$column]);
            }
        }

        return $this->dateRange($request, $query, 'created_at');
    }

    private function dateRange(Request $request, Builder $query, string $column): Builder
    {
        $endRules = 'nullable|date_format:Y-m-d'.($request->filled('date_from') ? '|after_or_equal:date_from' : '');
        $dates = $request->validate(['date_from' => 'nullable|date_format:Y-m-d', 'date_to' => $endRules]);
        if (isset($dates['date_from'])) {
            $query->where($column, '>=', $dates['date_from']);
        }
        if (isset($dates['date_to'])) {
            $query->where($column, '<', Carbon::parse($dates['date_to'])->addDay()->toDateString());
        }

        return $query;
    }
}
