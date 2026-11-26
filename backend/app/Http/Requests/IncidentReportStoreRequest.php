<?php

namespace App\Http\Requests;

use App\Models\IncidentReport;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IncidentReportStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'filer_name' => 'required|string|max:255',
            'date_reported' => 'required|date',
            'item' => 'required|string|max:255',
            'property_code' => 'nullable|string|max:50',
            'incident_type' => ['required', Rule::in(IncidentReport::TYPES)],
            'date_of_incident' => ['required', 'date', 'before_or_equal:date_reported'],
            'place_of_incident' => 'required|string|max:255',
            'detailed_narration' => 'required|string|max:5000',
            'remarks' => 'nullable|string|max:1000',
            'jo_number' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:1000',
        ];
    }
}
