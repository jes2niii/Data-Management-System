<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Bill;
use App\Models\Document;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $totalEmployees = Employee::count();
        $activeUsers = User::where('status', 'active')->where('is_disabled', false)->count();
        $totalDocuments = Document::count();
        $totalFiles = Document::count() + Document::has('versions')->count();
        $totalMonthlyBills = Bill::whereMonth('billing_date', now()->month)
            ->whereYear('billing_date', now()->year)
            ->sum('amount');
        $upcomingDueBills = Bill::where('status', '!=', 'paid')
            ->where('due_date', '>=', now())
            ->where('due_date', '<=', now()->addDays(30))
            ->sum('amount');

        $recentActivities = ActivityLog::with('user')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        $latestFiles = Document::with(['creator', 'folder'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        $monthlyBillingData = Bill::selectRaw('DATE_FORMAT(billing_date, "%Y-%m") as month, SUM(amount) as total')
            ->where('billing_date', '>=', now()->subMonths(12))
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        $documentUploadData = Document::selectRaw('DATE_FORMAT(created_at, "%Y-%m") as month, COUNT(*) as count')
            ->where('created_at', '>=', now()->subMonths(12))
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        $employeeStats = [
            'by_department' => Employee::with('department')
                ->select('department_id', DB::raw('COUNT(*) as count'))
                ->groupBy('department_id')
                ->get()
                ->map(function ($item) {
                    return [
                        'department' => $item->department->name ?? 'Unknown',
                        'count' => $item->count,
                    ];
                }),
            'by_status' => Employee::select('status', DB::raw('COUNT(*) as count'))
                ->groupBy('status')
                ->get()
                ->pluck('count', 'status'),
        ];

        $storageUsage = Document::sum('file_size');

        $userLoginStats = User::selectRaw('DATE(last_login_at) as date, COUNT(*) as count')
            ->whereNotNull('last_login_at')
            ->where('last_login_at', '>=', now()->subDays(30))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return $this->success([
            'total_employees' => $totalEmployees,
            'active_users' => $activeUsers,
            'total_documents' => $totalDocuments,
            'total_files' => $totalFiles,
            'total_monthly_bills' => $totalMonthlyBills,
            'upcoming_due_bills' => $upcomingDueBills,
            'recent_activities' => $recentActivities,
            'latest_files' => $latestFiles,
            'monthly_billing_data' => $monthlyBillingData,
            'document_upload_data' => $documentUploadData,
            'employee_stats' => $employeeStats,
            'storage_usage' => $storageUsage,
            'user_login_stats' => $userLoginStats,
        ]);
    }
}
