<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Bill;
use App\Models\Document;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;

class ReportController extends Controller
{
    public function employeeReport(Request $request)
    {
        $query = Employee::with('department');

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('employment_type')) {
            $query->where('employment_type', $request->employment_type);
        }

        $employees = $query->get();

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
        $query = Document::with(['folder', 'creator']);

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('date_from') && $request->filled('date_to')) {
            $query->whereBetween('created_at', [$request->date_from, $request->date_to]);
        }

        $documents = $query->get();

        $byCategory = $documents->groupBy('category')->map->count();
        $byStatus = $documents->groupBy('status')->map->count();
        $byApprovalStatus = $documents->groupBy('approval_status')->map->count();
        $byType = $documents->groupBy('file_type')->map->count();
        $totalSize = $documents->sum('file_size');

        $monthlyUploads = Document::selectRaw('DATE_FORMAT(created_at, "%Y-%m") as month, COUNT(*) as count')
            ->groupBy('month')
            ->orderBy('month')
            ->get();

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
        $query = Bill::with('category');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('category_id')) {
            $query->where('bill_category_id', $request->category_id);
        }

        if ($request->filled('date_from') && $request->filled('date_to')) {
            $query->whereBetween('billing_date', [$request->date_from, $request->date_to]);
        }

        $bills = $query->get();

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
        $query = ActivityLog::query();

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('module')) {
            $query->where('module', $request->module);
        }

        if ($request->filled('date_from') && $request->filled('date_to')) {
            $query->whereBetween('created_at', [$request->date_from, $request->date_to]);
        }

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

        $logs = $query->with('user')->orderBy('created_at', 'desc')->limit(200)->get();

        return $this->success([
            'total_actions' => $totalActions,
            'by_module' => $byModule,
            'by_action' => $byAction,
            'by_status' => $byStatus,
            'daily_activity' => $dailyActivity,
            'logs' => $logs,
        ]);
    }

    public function export(Request $request, $type, $format)
    {
        $method = $type . 'Report';
        if (!method_exists($this, $method)) {
            return $this->error('Invalid report type', 400);
        }

        $report = $this->{$method}($request);
        $data = $report->getData(true);

        if ($format === 'json') {
            return Response::json($data, 200, [
                'Content-Disposition' => "attachment; filename=\"{$type}-report.json\"",
            ]);
        }

        return $this->error('Unsupported export format', 400);
    }
}
