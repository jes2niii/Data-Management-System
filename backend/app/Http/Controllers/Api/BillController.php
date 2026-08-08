<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BillStoreRequest;
use App\Http\Requests\BillUpdateRequest;
use App\Models\Bill;
use App\Models\BillAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Storage;

class BillController extends Controller
{
    public function index(Request $request)
    {
        $query = Bill::with(['category', 'creator']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('category_id')) {
            $query->whereHas('category', function ($q) use ($request) {
                $q->where('id', $request->category_id);
            });
        }

        if ($request->filled('bill_category_id')) {
            $query->where('bill_category_id', $request->bill_category_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('provider', 'like', "%{$search}%")
                    ->orWhere('reference_number', 'like', "%{$search}%");
            });
        }

        if ($request->filled('date_from') && $request->filled('date_to')) {
            $query->whereBetween('billing_date', [$request->date_from, $request->date_to]);
        }

        if ($request->filled('due_before')) {
            $query->where('due_date', '<=', $request->due_before)
                ->where('status', '!=', 'paid');
        }

        $bills = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return $this->success($bills);
    }

    public function store(BillStoreRequest $request)
    {
        $data = $request->validated();
        $data['created_by'] = $request->user()->id;

        unset($data['attachments']);

        $bill = Bill::create($data);

        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store('bill-attachments', 'public');
                $bill->attachments()->create([
                    'name' => $file->getClientOriginalName(),
                    'file_path' => $path,
                    'file_type' => $file->getClientOriginalExtension(),
                    'file_size' => $file->getSize(),
                ]);
            }
        }

        return $this->success($bill->load(['category', 'attachments', 'creator']), 'Bill created', 201);
    }

    public function show($id)
    {
        $bill = Bill::with(['category', 'creator', 'attachments'])->findOrFail($id);

        return $this->success($bill);
    }

    public function update(BillUpdateRequest $request, $id)
    {
        $bill = Bill::findOrFail($id);
        $data = $request->validated();

        unset($data['attachments']);

        $bill->update($data);

        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store('bill-attachments', 'public');
                $bill->attachments()->create([
                    'name' => $file->getClientOriginalName(),
                    'file_path' => $path,
                    'file_type' => $file->getClientOriginalExtension(),
                    'file_size' => $file->getSize(),
                ]);
            }
        }

        return $this->success($bill->load(['category', 'attachments', 'creator']), 'Bill updated');
    }

    public function destroy($id)
    {
        $bill = Bill::findOrFail($id);

        foreach ($bill->attachments as $attachment) {
            Storage::disk('public')->delete($attachment->file_path);
        }

        $bill->delete();

        return $this->success(null, 'Bill deleted');
    }

    public function markAsPaid(Request $request, $id)
    {
        $bill = Bill::findOrFail($id);

        $request->validate([
            'payment_date' => 'required|date',
            'payment_method' => 'nullable|string|max:50',
        ]);

        $bill->update([
            'status' => 'paid',
            'payment_date' => $request->payment_date,
            'payment_method' => $request->payment_method,
        ]);

        return $this->success($bill->load('category'), 'Bill marked as paid');
    }

    public function analytics(Request $request)
    {
        $year = $request->get('year', now()->year);

        $monthlyTotals = Bill::whereYear('billing_date', $year)
            ->selectRaw('MONTH(billing_date) as month, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        $yearlyTotals = Bill::selectRaw('YEAR(billing_date) as year, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('year')
            ->orderBy('year')
            ->get();

        $categoryBreakdown = Bill::join('bill_categories', 'bills.bill_category_id', '=', 'bill_categories.id')
            ->selectRaw('bill_categories.name as category, SUM(bills.amount) as total, COUNT(*) as count')
            ->groupBy('bill_categories.id', 'bill_categories.name')
            ->orderBy('total', 'desc')
            ->get();

        $statusBreakdown = Bill::selectRaw('status, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('status')
            ->get();

        $totalUnpaid = Bill::where('status', '!=', 'paid')->sum('amount');
        $totalPaid = Bill::where('status', 'paid')->sum('amount');
        $overdueBills = Bill::where('status', 'overdue')
            ->orWhere(function ($q) {
                $q->where('status', 'pending')
                    ->where('due_date', '<', now());
            })
            ->count();

        return $this->success([
            'monthly_totals' => $monthlyTotals,
            'yearly_totals' => $yearlyTotals,
            'category_breakdown' => $categoryBreakdown,
            'status_breakdown' => $statusBreakdown,
            'total_unpaid' => $totalUnpaid,
            'total_paid' => $totalPaid,
            'overdue_bills' => $overdueBills,
            'total_bills' => Bill::count(),
            'total_amount' => Bill::sum('amount'),
        ]);
    }

    public function export(Request $request, $format)
    {
        $query = Bill::with(['category', 'creator']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('date_from') && $request->filled('date_to')) {
            $query->whereBetween('billing_date', [$request->date_from, $request->date_to]);
        }

        $bills = $query->get();

        $exportData = $bills->map(function ($bill) {
            return [
                'ID' => $bill->id,
                'Name' => $bill->name,
                'Category' => $bill->category->name ?? '',
                'Provider' => $bill->provider,
                'Reference' => $bill->reference_number,
                'Amount' => $bill->amount,
                'Billing Date' => $bill->billing_date?->format('Y-m-d'),
                'Due Date' => $bill->due_date?->format('Y-m-d'),
                'Payment Date' => $bill->payment_date?->format('Y-m-d'),
                'Status' => $bill->status,
                'Payment Method' => $bill->payment_method,
            ];
        })->toArray();

        if ($format === 'csv') {
            $csv = $this->arrayToCsv($exportData);
            return Response::make($csv, 200, [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="bills-export.csv"',
            ]);
        }

        if ($format === 'json') {
            return Response::json($exportData, 200, [
                'Content-Disposition' => 'attachment; filename="bills-export.json"',
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
