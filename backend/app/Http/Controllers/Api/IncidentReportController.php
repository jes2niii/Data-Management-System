<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IncidentReportStoreRequest;
use App\Http\Requests\IncidentReportUpdateRequest;
use App\Models\IncidentReport;
use App\Services\CsvReport;
use App\Services\IncidentNumberGenerator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Illuminate\Validation\ValidationException;

class IncidentReportController extends Controller
{
    public function __construct(private IncidentNumberGenerator $numbers)
    {
    }

    public function index(Request $request)
    {
        return $this->success($this->filtered($request)
            ->with('creator:id,name', 'updater:id,name')
            ->orderBy($this->sortColumn($request), $this->sortDirection($request))
            ->paginate(min(100, max(1, (int) $request->get('per_page', 15)))));
    }

    public function stats()
    {
        $rows = IncidentReport::all(['date_reported', 'incident_type']);

        $byType = collect(IncidentReport::TYPES)->map(fn (string $type) => [
            'type' => $type,
            'count' => $rows->where('incident_type', $type)->count(),
        ])->values();

        $monthly = [];
        for ($i = 11; $i >= 0; $i--) {
            $key = now()->subMonths($i)->format('Y-m');
            $monthly[] = [
                'month' => $key,
                'count' => $rows->filter(fn (IncidentReport $row) => $row->date_reported->format('Y-m') === $key)->count(),
            ];
        }

        $yearly = $rows->groupBy(fn (IncidentReport $row) => $row->date_reported->format('Y'))
            ->map(fn ($group, $year) => ['year' => (string) $year, 'count' => $group->count()])
            ->sortByDesc('year')->values()->take(5);

        return $this->success([
            'total' => $rows->count(),
            'lost' => $rows->where('incident_type', 'Lost')->count(),
            'damaged' => $rows->where('incident_type', 'Damaged')->count(),
            'stolen' => $rows->where('incident_type', 'Stolen')->count(),
            'this_month' => $rows->filter(fn (IncidentReport $row) => $row->date_reported->isSameMonth(now()))->count(),
            'this_year' => $rows->filter(fn (IncidentReport $row) => $row->date_reported->year === now()->year)->count(),
            'by_type' => $byType,
            'monthly' => $monthly,
            'yearly' => $yearly,
        ]);
    }

    public function show($id)
    {
        return $this->success(IncidentReport::with('creator:id,name', 'updater:id,name')->findOrFail($id));
    }

    public function store(IncidentReportStoreRequest $request)
    {
        $attempt = 0;
        while (true) {
            try {
                $report = DB::transaction(function () use ($request) {
                    $data = $request->validated();
                    $data['ir_number'] = $this->numbers->next();
                    $data['created_by'] = $request->user()->id;
                    $data['updated_by'] = $request->user()->id;

                    return IncidentReport::create($data);
                }, 3);

                return $this->success($report->load('creator:id,name'), 'Incident report created', 201);
            } catch (UniqueConstraintViolationException $error) {
                if (++$attempt >= 3) {
                    throw $error;
                }
            }
        }
    }

    public function update(IncidentReportUpdateRequest $request, $id)
    {
        $report = IncidentReport::findOrFail($id);
        $data = $request->validated();

        $dateReported = $data['date_reported'] ?? $report->date_reported->toDateString();
        $dateOfIncident = $data['date_of_incident'] ?? $report->date_of_incident->toDateString();
        if ($dateOfIncident > $dateReported) {
            throw ValidationException::withMessages([
                'date_of_incident' => 'Date of incident cannot be later than date reported.',
            ]);
        }

        $data['updated_by'] = $request->user()->id;
        $report->update($data);

        return $this->success($report->load('creator:id,name', 'updater:id,name'), 'Incident report updated');
    }

    public function destroy($id)
    {
        IncidentReport::findOrFail($id)->delete();

        return $this->success(null, 'Incident report deleted');
    }

    public function export(Request $request, CsvReport $csv, $format)
    {
        $rows = $this->filtered($request)->with('creator:id,name')
            ->orderBy('ir_number')->get()
            ->map(fn (IncidentReport $report) => [
                'IR #' => $report->ir_number,
                "Filer's Name" => $report->filer_name,
                'Date Reported' => $report->date_reported->toDateString(),
                'Item' => $report->item,
                'Property Code' => $report->property_code ?? '',
                'Type of Incident' => $report->incident_type,
                'Date of Incident' => $report->date_of_incident->toDateString(),
                'Place of Incident' => $report->place_of_incident,
                'Detailed Narration' => $report->detailed_narration,
                'Remarks' => $report->remarks ?? '',
                'JO #' => $report->jo_number ?? '',
                'Notes' => $report->notes ?? '',
                'Reported By' => $report->creator?->name ?? '',
            ])->all();

        $headers = [
            'IR #', "Filer's Name", 'Date Reported', 'Item', 'Property Code',
            'Type of Incident', 'Date of Incident', 'Place of Incident',
            'Detailed Narration', 'Remarks', 'JO #', 'Notes', 'Reported By',
        ];

        if ($format === 'csv') {
            return $csv->download('incident-reports.csv', $headers, $rows);
        }
        if ($format === 'json') {
            return Response::json($rows, 200, [
                'Content-Disposition' => 'attachment; filename="incident-reports.json"',
                'Cache-Control' => 'private, no-store',
            ]);
        }

        return $this->error('Unsupported export format. Use CSV or JSON.', 400);
    }

    private function filtered(Request $request): Builder
    {
        $request->validate([
            'search' => 'nullable|string|max:255',
            'incident_type' => 'nullable|in:Lost,Damaged,Stolen',
            'date_reported_from' => 'nullable|date',
            'date_reported_to' => 'nullable|date',
            'date_of_incident_from' => 'nullable|date',
            'date_of_incident_to' => 'nullable|date',
        ]);

        $query = IncidentReport::query();
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('ir_number', 'like', "%{$search}%")
                    ->orWhere('filer_name', 'like', "%{$search}%")
                    ->orWhere('item', 'like', "%{$search}%")
                    ->orWhere('property_code', 'like', "%{$search}%");
            });
        }
        if ($request->filled('incident_type')) {
            $query->where('incident_type', $request->incident_type);
        }
        if ($request->filled('date_reported_from')) {
            $query->where('date_reported', '>=', $request->date_reported_from);
        }
        if ($request->filled('date_reported_to')) {
            $query->where('date_reported', '<=', $request->date_reported_to);
        }
        if ($request->filled('date_of_incident_from')) {
            $query->where('date_of_incident', '>=', $request->date_of_incident_from);
        }
        if ($request->filled('date_of_incident_to')) {
            $query->where('date_of_incident', '<=', $request->date_of_incident_to);
        }

        return $query;
    }

    private function sortColumn(Request $request): string
    {
        $allowed = [
            'ir_number', 'filer_name', 'date_reported', 'item', 'property_code',
            'incident_type', 'date_of_incident', 'place_of_incident',
            'detailed_narration', 'remarks', 'jo_number', 'created_at',
        ];

        return in_array($request->get('sort_by'), $allowed, true) ? $request->get('sort_by') : 'created_at';
    }

    private function sortDirection(Request $request): string
    {
        return strtolower((string) $request->get('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';
    }
}
