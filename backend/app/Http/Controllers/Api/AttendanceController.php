<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceStatus;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AttendanceController extends Controller
{
    private const RECORD_FIELDS = ['status_id', 'time_in', 'time_out', 'minutes_late', 'hours_worked', 'remarks'];

    public function recording(Request $request)
    {
        $date = $request->validate(['date' => 'required|date_format:Y-m-d'])['date'];
        $records = $this->forDay($date)->whereIn('session', ['morning', 'afternoon'])
            ->get(['id', 'employee_id', 'session', ...self::RECORD_FIELDS]);
        $employees = Employee::where(fn ($query) => $query->where('status', 'active')
            ->orWhereIn('id', $records->pluck('employee_id')->unique()))
            ->orderBy('full_name')->get(['id', 'full_name']);

        return $this->success([
            'employees' => $employees,
            'records' => $records->map(fn (Attendance $record) => [
                ...$record->only(['employee_id', 'session', ...self::RECORD_FIELDS]),
                'expected_version' => $this->recordVersion($record),
            ]),
        ]);
    }

    public function index(Request $request)
    {
        $query = Attendance::with(['employee.department', 'status', 'recorder']);

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
        $data = $request->validate([
            'records' => 'required|array|list|min:1|max:500',
            'records.*' => 'array:employee_id,date,session,expected_version,status_id,time_in,time_out,minutes_late,hours_worked,remarks',
            'records.*.employee_id' => ['required', 'integer', Rule::exists('employees', 'id')->whereNull('deleted_at')],
            'records.*.date' => 'required|date_format:Y-m-d',
            'records.*.session' => 'nullable|in:morning,afternoon',
            'records.*.expected_version' => 'sometimes|nullable|string|regex:/^[a-f0-9]{64}$/D',
            'records.*.status_id' => 'nullable|exists:attendance_statuses,id',
            'records.*.time_in' => 'nullable|date_format:H:i',
            'records.*.time_out' => 'nullable|date_format:H:i',
            'records.*.minutes_late' => 'nullable|integer|min:0',
            'records.*.hours_worked' => 'nullable|integer|min:0',
            'records.*.remarks' => 'nullable|string',
        ]);

        $seen = [];
        foreach ($data['records'] as $index => $rec) {
            $key = (int) $rec['employee_id'].'|'.$rec['date'].'|'.($rec['session'] ?? '');
            if (isset($seen[$key])) {
                throw ValidationException::withMessages(["records.{$index}" => 'Each employee, date and session may only appear once.']);
            }
            $seen[$key] = true;
        }

        $saved = DB::transaction(function () use ($data, $request) {
            $ids = array_unique(array_map('intval', array_column($data['records'], 'employee_id')));
            $employees = Employee::whereIn('id', $ids)->orderBy('id')->lockForUpdate()->pluck('id');
            abort_if($employees->count() !== count($ids), 409, 'An employee is no longer available.');

            $records = new \Illuminate\Database\Eloquent\Collection;
            foreach ($data['records'] as $rec) {
                $key = ['employee_id' => $rec['employee_id'], 'session' => $rec['session'] ?? null];
                $matches = $this->forDay($rec['date'])->where($key)->orderBy('id')->lockForUpdate()->limit(2)->get();
                abort_if($matches->count() > 1, 409, 'Attendance records already conflict for this employee, date and session.');
                $attendance = $matches->first();
                if (array_key_exists('expected_version', $rec)) {
                    $current = $attendance ? $this->recordVersion($attendance) : null;
                    abort_if($rec['expected_version'] !== $current, 409, 'Attendance changed since this dialog was opened. Reload before saving.');
                }
                $attendance ??= new Attendance($key + ['date' => $rec['date']]);
                $attendance->fill(Arr::only($rec, self::RECORD_FIELDS) + ['recorded_by' => $request->user()->id])->save();
                $records->push($attendance);
            }

            return $records->load(['employee:id,full_name,department_id', 'employee.department:id,name', 'status']);
        }, 3);

        return $this->success($saved, 'Attendance recorded', 201);
    }

    private function forDay(string $date): \Illuminate\Database\Eloquent\Builder
    {
        return Attendance::where('date', '>=', $date)->where('date', '<', Carbon::parse($date)->addDay()->toDateString());
    }

    private function recordVersion(Attendance $record): string
    {
        return hash('sha256', json_encode($record->only(['id', ...self::RECORD_FIELDS]), JSON_THROW_ON_ERROR));
    }

    public function update(Request $request, $id)
    {
        $fields = $request->validate([
            'session' => 'nullable|in:morning,afternoon',
            'status_id' => 'nullable|exists:attendance_statuses,id',
            'time_in' => 'nullable|date_format:H:i',
            'time_out' => 'nullable|date_format:H:i',
            'minutes_late' => 'nullable|integer|min:0',
            'hours_worked' => 'nullable|integer|min:0',
            'remarks' => 'nullable|string',
        ]);
        $attendance = DB::transaction(function () use ($id, $fields, $request) {
            $employeeId = Attendance::findOrFail($id)->employee_id;
            Employee::lockForUpdate()->findOrFail($employeeId);
            $record = Attendance::lockForUpdate()->findOrFail($id);
            if (array_key_exists('session', $fields) && $fields['session'] !== $record->session) {
                $existing = $this->forDay($record->date->toDateString())->where('employee_id', $employeeId)
                    ->where('session', $fields['session'])->where('id', '!=', $record->id)->exists();
                abort_if($existing, 409, 'That attendance session is already recorded.');
            }
            $record->update($fields + ['recorded_by' => $request->user()->id]);

            return $record;
        }, 3);

        return $this->success($attendance->load(['employee:id,full_name,department_id', 'employee.department:id,name', 'status']), 'Attendance updated');
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
