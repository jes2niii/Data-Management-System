<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TrainingMonitoringStoreRequest;
use App\Http\Requests\TrainingMonitoringUpdateRequest;
use App\Models\Training;
use App\Models\TrainingDetail;
use App\Models\TrainingMonitoring;
use App\Services\CsvReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Illuminate\Validation\ValidationException;

class TrainingMonitoringController extends Controller
{
    public function index(Request $request)
    {
        $records = $this->filteredQuery($request)
            ->with(['creator', 'training', 'trainingDetail'])
            ->orderBy('date', 'desc')->orderBy('id', 'desc')
            ->paginate($request->get('per_page', 15));

        return $this->success($records);
    }

    private function filteredQuery(Request $request): \Illuminate\Database\Eloquent\Builder
    {
        $query = TrainingMonitoring::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('training_course', 'like', "%{$search}%")
                  ->orWhere('assisted_by', 'like', "%{$search}%")
                  ->orWhere('remarks', 'like', "%{$search}%")
                  ->orWhere('system_location', 'like', "%{$search}%");
            });
        }

        if ($request->filled('training_id')) {
            $query->where('training_id', $request->training_id);
        }

        if ($request->filled('training_course')) {
            $query->where('training_course', $request->training_course);
        }

        if ($request->filled('system_location')) {
            $query->where('system_location', $request->system_location);
        }

        if ($request->filled('print_status')) {
            $query->where('print_status', $request->print_status);
        }

        if ($request->filled('manner_of_conduct')) {
            $query->where('manner_of_conduct', $request->manner_of_conduct);
        }

        if ($request->filled('remarks')) {
            $query->where('remarks', $request->remarks);
        }

        if ($request->filled('assisted_by')) {
            $query->where('assisted_by', 'like', "%{$request->assisted_by}%");
        }

        if ($request->filled('date_from') && $request->filled('date_to')) {
            $query->whereBetween('date', [$request->date_from, $request->date_to]);
        } elseif ($request->filled('date_from')) {
            $query->where('date', '>=', $request->date_from);
        } elseif ($request->filled('date_to')) {
            $query->where('date', '<=', $request->date_to);
        }

        if ($request->filled('date')) {
            $query->whereDate('date', $request->date);
        }

        return $query;
    }

    public function stats(Request $request)
    {
        $baseQuery = TrainingMonitoring::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $baseQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('training_course', 'like', "%{$search}%")
                  ->orWhere('assisted_by', 'like', "%{$search}%");
            });
        }
        if ($request->filled('system_location')) {
            $baseQuery->where('system_location', $request->system_location);
        }
        if ($request->filled('print_status')) {
            $baseQuery->where('print_status', $request->print_status);
        }
        if ($request->filled('training_id')) {
            $baseQuery->where('training_id', $request->training_id);
        }

        if ($request->filled('training_course')) {
            $baseQuery->where('training_course', $request->training_course);
        }
        if ($request->filled('remarks')) {
            $baseQuery->where('remarks', $request->remarks);
        }
        if ($request->filled('manner_of_conduct')) {
            $baseQuery->where('manner_of_conduct', $request->manner_of_conduct);
        }
        if ($request->filled('date_from') && $request->filled('date_to')) {
            $baseQuery->whereBetween('date', [$request->date_from, $request->date_to]);
        }

        $total = (clone $baseQuery)->count();

        $byCourse = (clone $baseQuery)
            ->selectRaw('training_course, COUNT(*) as count, SUM(training_fee) as total_fee, SUM(downpayment) as total_downpayment, SUM(balance) as total_balance')
            ->groupBy('training_course')
            ->orderBy('count', 'desc')
            ->get();

        $bySystem = (clone $baseQuery)
            ->selectRaw('system_location, COUNT(*) as count')
            ->groupBy('system_location')
            ->get();

        $byPrintStatus = (clone $baseQuery)
            ->selectRaw('print_status, COUNT(*) as count')
            ->groupBy('print_status')
            ->get();

        $byManner = (clone $baseQuery)
            ->selectRaw('manner_of_conduct, COUNT(*) as count')
            ->groupBy('manner_of_conduct')
            ->get();

        $byRemarks = (clone $baseQuery)
            ->selectRaw('remarks, COUNT(*) as count')
            ->groupBy('remarks')
            ->get();

        $totalFee = (clone $baseQuery)->sum('training_fee');
        $totalDown = (clone $baseQuery)->sum('downpayment');
        $totalBalance = (clone $baseQuery)->sum('balance');

        $recentCount = TrainingMonitoring::whereDate('created_at', today())->count();

        return $this->success([
            'total' => $total,
            'by_course' => $byCourse,
            'by_system' => $bySystem,
            'by_print_status' => $byPrintStatus,
            'by_manner' => $byManner,
            'by_remarks' => $byRemarks,
            'total_fee' => $totalFee,
            'total_downpayment' => $totalDown,
            'total_balance' => $totalBalance,
            'recent_count' => $recentCount,
        ]);
    }

    public function store(TrainingMonitoringStoreRequest $request)
    {
        $data = $request->validated();
        $data['created_by'] = $request->user()->id;

        // Balance and remarks auto-calculated in model, ensure provided values are ignored (model will override)
        unset($data['balance']);
        $data = $this->syncTrainingReference($data);
        // Auto-fill training_course and training_fee from training if training_id present
        if (!empty($data['training_id'])) {
            $training = Training::find($data['training_id']);
            if ($training) {
                if (empty($data['training_course'])) {
                    $data['training_course'] = $training->name;
                }
                if (!isset($data['training_fee']) || $data['training_fee'] === null || $data['training_fee'] === '') {
                    $data['training_fee'] = $training->price;
                }
            }
        }
        $record = TrainingMonitoring::create($data);

        return $this->success($record->load(['creator', 'training', 'trainingDetail']), 'Training record created', 201);
    }

    public function show($id)
    {
        $record = TrainingMonitoring::with(['creator', 'training', 'trainingDetail'])->findOrFail($id);
        return $this->success($record);
    }

    public function update(TrainingMonitoringUpdateRequest $request, $id)
    {
        $record = TrainingMonitoring::findOrFail($id);
        $data = $request->validated();
        unset($data['balance']);

        // Keep the chosen course package consistent with its training.
        $data = $this->syncTrainingReference($data, $record);
        if (array_key_exists('training_id', $data) && $data['training_id'] !== null
            && (int) $data['training_id'] !== (int) $record->training_id
            && !array_key_exists('training_detail_id', $data)
            && $record->training_detail_id !== null
            && (int) $record->trainingDetail?->training_id !== (int) $data['training_id']) {
            $data['training_detail_id'] = null;
        }

        // If training_id changed, ensure course/fee sync if not explicitly provided
        if (isset($data['training_id']) && $data['training_id'] != $record->training_id) {
            $training = Training::find($data['training_id']);
            if ($training) {
                if (!isset($data['training_course']) || empty($data['training_course'])) {
                    $data['training_course'] = $training->name;
                }
                if (!isset($data['training_fee']) || $data['training_fee'] === null || $data['training_fee'] === '') {
                    $data['training_fee'] = $training->price;
                }
            }
        }
        $record->update($data);
        return $this->success($record->load(['creator', 'training', 'trainingDetail']), 'Training record updated');
    }

    public function destroy($id)
    {
        $record = TrainingMonitoring::findOrFail($id);
        $record->delete();
        return $this->success(null, 'Training record deleted');
    }

    public function export(Request $request, CsvReport $csv, $format)
    {
        $records = $this->filteredQuery($request)->orderBy('date', 'desc')->orderBy('id', 'desc')->get();

        $exportData = $records->map(function ($r, $idx) {
            return [
                'No' => $idx + 1,
                'Date' => $r->date ? $r->date->format('Y-m-d') : '',
                'Name' => $r->name,
                'Training Course' => $r->training_course,
                'Manner of Conduct' => $r->manner_of_conduct,
                'Training Schedule (CBT/Face to Face)' => $r->training_schedule_cbt,
                'Training Schedule (Practical)' => $r->training_schedule_practical,
                'Training Fee' => $r->training_fee,
                'Downpayment' => $r->downpayment,
                'Balance' => $r->balance,
                'Remarks' => $r->remarks,
                'System (Manila/Naga/Legazpi)' => $r->system_location,
                'Assisted By' => $r->assisted_by,
                'Note/Status (To Print/Printed)' => $r->print_status,
            ];
        })->toArray();

        if ($format === 'csv') {
            return $csv->download('training-monitoring-export.csv', [
                'No', 'Date', 'Name', 'Training Course', 'Manner of Conduct',
                'Training Schedule (CBT/Face to Face)', 'Training Schedule (Practical)',
                'Training Fee', 'Downpayment', 'Balance', 'Remarks',
                'System (Manila/Naga/Legazpi)', 'Assisted By', 'Note/Status (To Print/Printed)',
            ], $exportData);
        }

        if ($format === 'json') {
            return Response::json($exportData, 200, [
                'Content-Disposition' => 'attachment; filename="training-monitoring-export.json"',
                'Cache-Control' => 'private, no-store',
            ]);
        }

        return $this->error('Unsupported export format', 400);
    }

    private function syncTrainingReference(array $data, ?TrainingMonitoring $record = null): array
    {
        if (!array_key_exists('training_detail_id', $data) || $data['training_detail_id'] === null) {
            return $data;
        }

        $detail = TrainingDetail::findOrFail($data['training_detail_id']);
        if (array_key_exists('training_id', $data) && $data['training_id'] !== null) {
            $trainingId = (int) $data['training_id'];
        } elseif ($record !== null) {
            $trainingId = (int) $record->training_id;
        } else {
            $trainingId = (int) $detail->training_id;
        }

        if ((int) $detail->training_id !== $trainingId) {
            throw ValidationException::withMessages([
                'training_detail_id' => 'The selected course package does not belong to the selected training.',
            ]);
        }

        $data['training_id'] = $trainingId;
        if (empty($data['training_course'])) {
            $data['training_course'] = $detail->title ?: Training::find($trainingId)?->name;
        }
        if (!array_key_exists('training_fee', $data) || $data['training_fee'] === null || $data['training_fee'] === '') {
            $data['training_fee'] = $detail->price;
        }

        return $data;
    }
}
