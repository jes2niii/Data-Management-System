<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceStatus;
use App\Models\Employee;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $query = Attendance::with(['employee', 'status', 'recorder']);

        if ($request->filled('date')) {
            $query->where('date', $request->date);
        }
        if ($request->filled('from') && $request->filled('to')) {
            $query->whereBetween('date', [$request->from, $request->to]);
        } elseif ($request->filled('from')) {
            $query->where('date', '>=', $request->from);
        } elseif ($request->filled('to')) {
            $query->where('date', '<=', $request->to);
        }
        if ($request->filled('department_id')) {
            $query->whereHas('employee', function ($q) use ($request) {
                $q->where('department_id', $request->department_id);
            });
        }
        if ($request->filled('status_id')) {
            $query->where('status_id', $request->status_id);
        }
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        $attendances = $query->orderBy('date', 'desc')->orderBy('time_in', 'desc')
            ->paginate($request->get('per_page', 30));

        return $this->success($attendances);
    }

    public function store(Request $request)
    {
        $request->validate([
            'records' => 'required|array|min:1',
            'records.*.employee_id' => 'required|exists:employees,id',
            'records.*.date' => 'required|date',
            'records.*.status_id' => 'nullable|exists:attendance_statuses,id',
            'records.*.time_in' => 'nullable|date_format:H:i',
            'records.*.time_out' => 'nullable|date_format:H:i',
            'records.*.minutes_late' => 'nullable|integer|min:0',
            'records.*.hours_worked' => 'nullable|integer|min:0',
            'records.*.remarks' => 'nullable|string',
        ]);

        $saved = [];
        foreach ($request->records as $rec) {
            $attendance = Attendance::updateOrCreate(
                ['employee_id' => $rec['employee_id'], 'date' => $rec['date']],
                [
                    'status_id' => $rec['status_id'] ?? null,
                    'time_in' => $rec['time_in'] ?? null,
                    'time_out' => $rec['time_out'] ?? null,
                    'minutes_late' => $rec['minutes_late'] ?? null,
                    'hours_worked' => $rec['hours_worked'] ?? null,
                    'remarks' => $rec['remarks'] ?? null,
                    'recorded_by' => $request->user()->id,
                ]
            );
            $saved[] = $attendance->load(['employee', 'status']);
        }

        return $this->success($saved, 'Attendance recorded', 201);
    }

    public function update(Request $request, $id)
    {
        $attendance = Attendance::findOrFail($id);
        $request->validate([
            'status_id' => 'nullable|exists:attendance_statuses,id',
            'time_in' => 'nullable|date_format:H:i',
            'time_out' => 'nullable|date_format:H:i',
            'minutes_late' => 'nullable|integer|min:0',
            'hours_worked' => 'nullable|integer|min:0',
            'remarks' => 'nullable|string',
        ]);
        $attendance->update(array_merge(
            $request->only(['status_id', 'time_in', 'time_out', 'minutes_late', 'hours_worked', 'remarks']),
            ['recorded_by' => $request->user()->id]
        ));
        return $this->success($attendance->load(['employee', 'status']), 'Attendance updated');
    }

    public function destroy($id)
    {
        Attendance::findOrFail($id)->delete();
        return $this->success(null, 'Attendance deleted');
    }

    public function summary(Request $request)
    {
        $from = $request->get('from', now()->startOfMonth()->toDateString());
        $to = $request->get('to', now()->toDateString());

        $query = Attendance::with('employee')->whereBetween('date', [$from, $to]);

        if ($request->filled('department_id')) {
            $query->whereHas('employee', function ($q) use ($request) {
                $q->where('department_id', $request->department_id);
            });
        }

        $attendances = $query->get();
        $summary = [
            'total' => $attendances->count(),
            'by_status' => $attendances->groupBy('status_id')->map(fn($g) => $g->count())->toArray(),
            'avg_minutes_late' => round($attendances->whereNotNull('minutes_late')->avg('minutes_late') ?? 0, 2),
            'total_hours_worked' => $attendances->sum('hours_worked'),
            'employees_tracked' => $attendances->pluck('employee_id')->unique()->count(),
        ];

        return $this->success(['range' => ['from' => $from, 'to' => $to], 'summary' => $summary]);
    }

    public function getStatuses()
    {
        return $this->success(AttendanceStatus::orderBy('name')->get());
    }
}
