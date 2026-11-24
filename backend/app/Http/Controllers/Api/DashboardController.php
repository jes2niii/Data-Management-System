<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Bill;
use App\Models\Document;
use App\Models\Employee;
use App\Models\InventoryItem;
use App\Models\Training;
use App\Models\TrainingMonitoring;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $canRead = fn (string $module) => $user->hasPermission($module, 'read');
        $documents = Document::query()->visibleTo($user);
        $versions = \App\Models\DocumentVersion::whereHas('document', fn ($query) => $query->visibleTo($user));
        $totalDocuments = $canRead('documents') ? (clone $documents)->count() : 0;
        $totalFiles = $totalDocuments + ($canRead('documents') ? (clone $versions)->count() : 0);

        $employeeStats = $canRead('employees') ? [
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
        ] : [];

        $storageBreakdown = [
            'documents' => $canRead('documents') ? (int) (clone $documents)->sum('file_size') : 0,
            'document_versions' => $canRead('documents') ? (int) (clone $versions)->sum('file_size') : 0,
            'books' => $canRead('book_inventories') ? (int) \App\Models\BookInventory::sum('file_size') : 0,
            'employee_attachments' => $canRead('employees') ? (int) \App\Models\EmployeeAttachment::sum('file_size') : 0,
            'bill_attachments' => $canRead('bills') ? (int) \App\Models\BillAttachment::sum('file_size') : 0,
        ];

        return $this->success([
            'total_employees' => $canRead('employees') ? Employee::count() : 0,
            'active_users' => $canRead('users') ? User::where('status', 'active')->where('is_disabled', false)->count() : 0,
            'total_documents' => $totalDocuments,
            'total_files' => $totalFiles,
            'total_monthly_bills' => $canRead('bills') ? Bill::whereMonth('billing_date', now()->month)
                ->whereYear('billing_date', now()->year)->sum('amount') : 0,
            'upcoming_due_bills' => $canRead('bills') ? Bill::where('status', '!=', 'paid')
                ->whereBetween('due_date', [now(), now()->addDays(30)])->sum('amount') : 0,
            'recent_activities' => $canRead('activity_logs') ? ActivityLog::with('user:id,name')
                ->latest()->limit(10)->get() : [],
            'latest_files' => $canRead('documents') ? (clone $documents)
                ->select('id', 'name', 'original_name', 'file_size', 'file_type', 'created_at', 'created_by', 'folder_id')
                ->with(['creator:id,name', 'folder:id,name'])->latest()->limit(5)->get() : [],
            'monthly_billing_data' => $canRead('bills') ? Bill::selectRaw('DATE_FORMAT(billing_date, "%Y-%m") as month, SUM(amount) as total')
                ->where('billing_date', '>=', now()->subMonths(12))->groupBy('month')->orderBy('month')->get() : [],
            'document_upload_data' => $canRead('documents') ? (clone $documents)->selectRaw('DATE_FORMAT(created_at, "%Y-%m") as month, COUNT(*) as count')
                ->where('created_at', '>=', now()->subMonths(12))->groupBy('month')->orderBy('month')->get() : [],
            'employee_stats' => $employeeStats,
            'storage_usage' => array_sum($storageBreakdown),
            'storage_breakdown' => $storageBreakdown,
            'user_login_stats' => $canRead('users') ? User::selectRaw('DATE(last_login_at) as date, COUNT(*) as count')
                ->where('last_login_at', '>=', now()->subDays(30))->groupBy('date')->orderBy('date')->get() : [],
            'training_stats' => $canRead('training_monitorings') ? $this->trainingStats() : [],
            'inventory_stats' => $canRead('inventory') ? $this->inventoryStats() : [],
        ]);
    }

    private function trainingStats(): array
    {
        // Training revenue stats
        $trainingTotalCount = TrainingMonitoring::count();
        $trainingTotalRevenue = (float) TrainingMonitoring::sum('training_fee');
        $trainingTotalDownpayment = (float) TrainingMonitoring::sum('downpayment');
        $trainingTotalBalance = (float) TrainingMonitoring::sum('balance');
        $trainingAvgFee = $trainingTotalCount > 0 ? round($trainingTotalRevenue / $trainingTotalCount, 2) : 0;

        $trainingByCourse = TrainingMonitoring::selectRaw('training_course, COUNT(*) as count, SUM(training_fee) as revenue, SUM(downpayment) as collected, SUM(balance) as outstanding, AVG(training_fee) as avg_fee')
            ->whereNotNull('training_course')
            ->where('training_course', '!=', '')
            ->groupBy('training_course')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get();

        $trainingMonthlyRevenue = TrainingMonitoring::selectRaw('DATE_FORMAT(date, "%Y-%m") as month, SUM(training_fee) as revenue, SUM(downpayment) as collected, SUM(balance) as outstanding, COUNT(*) as count')
            ->whereNotNull('date')
            ->where('date', '>=', now()->subMonths(12)->startOfMonth())
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        $trainingBySystem = TrainingMonitoring::selectRaw('system_location as system, COUNT(*) as count, SUM(training_fee) as revenue')
            ->whereNotNull('system_location')
            ->groupBy('system_location')
            ->get();

        $trainingByCategory = TrainingMonitoring::leftJoin('trainings', 'training_monitorings.training_id', '=', 'trainings.id')
            ->leftJoin('training_categories', 'trainings.category_id', '=', 'training_categories.id')
            ->selectRaw("COALESCE(training_categories.name, trainings.category, 'Uncategorized') as category, COUNT(*) as count, SUM(training_monitorings.training_fee) as revenue")
            ->groupBy(DB::raw("COALESCE(training_categories.name, trainings.category, 'Uncategorized')"))
            ->orderByDesc('revenue')
            ->get();

        $trainingByRemarks = TrainingMonitoring::selectRaw('remarks, COUNT(*) as count, SUM(training_fee) as revenue')
            ->whereNotNull('remarks')
            ->groupBy('remarks')
            ->get();

        // Monthly enrollments total (count per month) for last 12 months
        $trainingMonthlyEnrollments = TrainingMonitoring::selectRaw('DATE_FORMAT(date, "%Y-%m") as month, COUNT(*) as count')
            ->whereNotNull('date')
            ->where('date', '>=', now()->subMonths(12)->startOfMonth())
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        // Monthly course summary: enrollments per course per month (last 6 months, top 5 courses)
        $topCourses = TrainingMonitoring::selectRaw('training_course, COUNT(*) as cnt')
            ->whereNotNull('training_course')
            ->where('training_course', '!=', '')
            ->groupBy('training_course')
            ->orderByDesc('cnt')
            ->limit(5)
            ->pluck('training_course')
            ->toArray();

        $rawMonthlyCourse = TrainingMonitoring::selectRaw('DATE_FORMAT(date, "%Y-%m") as month, training_course, COUNT(*) as count')
            ->whereNotNull('date')
            ->where('date', '>=', now()->subMonths(6)->startOfMonth())
            ->whereIn('training_course', $topCourses)
            ->groupBy('month', 'training_course')
            ->orderBy('month')
            ->get();

        // Precompute unique short names for top courses (for chart keys)
        $courseToShort = [];
        $shortCourses = [];
        $seenShorts = [];
        foreach ($topCourses as $course) {
            $short = strlen($course) > 18 ? substr($course, 0, 18) . '…' : $course;
            $originalShort = $short;
            $counter = 1;
            while (in_array($short, $seenShorts)) {
                $short = $originalShort . $counter;
                $counter++;
            }
            $seenShorts[] = $short;
            $shortCourses[] = $short;
            $courseToShort[$course] = $short;
        }

        // Build months list last 6 months
        $months = [];
        for ($i = 5; $i >= 0; $i--) {
            $m = now()->subMonths($i)->format('Y-m');
            $months[] = $m;
        }
        // Overall monthly totals for total line (all courses)
        $monthlyTotalsMap = TrainingMonitoring::selectRaw('DATE_FORMAT(date, "%Y-%m") as month, COUNT(*) as cnt')
            ->whereNotNull('date')
            ->where('date', '>=', now()->subMonths(6)->startOfMonth())
            ->groupBy('month')
            ->pluck('cnt', 'month')
            ->toArray();
        $monthlyCourseSummary = [];
        foreach ($months as $m) {
            $entry = ['month' => $m];
            foreach ($topCourses as $course) {
                $found = $rawMonthlyCourse->firstWhere(fn($r) => $r->month === $m && $r->training_course === $course);
                $short = $courseToShort[$course];
                $entry[$short] = $found ? (int) $found->count : 0;
                // Keep mapping for tooltip
                $entry[$short . '_full'] = $course;
            }
            // Total for month (overall, not just top 5)
            $entry['total'] = $monthlyTotalsMap[$m] ?? 0;
            $monthlyCourseSummary[] = $entry;
        }

        return [
            'total_count' => $trainingTotalCount,
            'total_revenue' => $trainingTotalRevenue,
            'total_collected' => $trainingTotalDownpayment,
            'total_outstanding' => $trainingTotalBalance,
            'avg_fee' => $trainingAvgFee,
            'by_course' => $trainingByCourse,
            'monthly_revenue' => $trainingMonthlyRevenue,
            'monthly_enrollments' => $trainingMonthlyEnrollments,
            'monthly_course_summary' => $monthlyCourseSummary,
            'monthly_course_summary_courses' => $shortCourses ?? array_map(fn($c) => strlen($c) > 18 ? substr($c, 0, 18) . '…' : $c, $topCourses),
            'monthly_course_summary_full' => $topCourses,
            'by_system' => $trainingBySystem,
            'by_category' => $trainingByCategory,
            'by_remarks' => $trainingByRemarks,
        ];
    }

    private function inventoryStats(): array
    {
        // Inventory stats (Supply Chain Management Department)
        $totals = InventoryItem::query()->selectRaw(
            'COUNT(*) AS item_count, SUM(quantity) AS quantity_sum, SUM(quantity * unit_cost) AS value_sum, '
            .'COUNT(CASE WHEN status = ? THEN 1 END) AS low_count, COUNT(CASE WHEN status = ? THEN 1 END) AS out_count',
            ['low_stock', 'out_of_stock']
        )->toBase()->first();
        $inventoryByCategory = InventoryItem::leftJoin('inventory_categories','inventory_items.inventory_category_id','=','inventory_categories.id')
            ->selectRaw('COALESCE(inventory_categories.name, "Uncategorized") as category, COUNT(*) as count, SUM(inventory_items.quantity) as total_qty, SUM(inventory_items.quantity * inventory_items.unit_cost) as total_value')
            ->groupBy('category')
            ->orderByDesc('total_value')
            ->limit(6)
            ->get();
        $inventoryByStatus = InventoryItem::selectRaw('status, COUNT(*) as count, SUM(quantity) as total_qty')->groupBy('status')->get();
        $inventoryLowStockItems = InventoryItem::with('category')->whereIn('status',['low_stock','out_of_stock'])->orderBy('quantity')->limit(5)->get();

        return [
            'total_items' => (int) $totals->item_count,
            'total_quantity' => (float) $totals->quantity_sum,
            'total_value' => (float) $totals->value_sum,
            'low_stock' => (int) $totals->low_count,
            'out_of_stock' => (int) $totals->out_count,
            'by_category' => $inventoryByCategory,
            'by_status' => $inventoryByStatus,
            'low_stock_items' => $inventoryLowStockItems,
        ];

    }
}
