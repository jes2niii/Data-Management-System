<?php

namespace App\Http\Requests;

use App\Models\IncidentReport;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IncidentReportUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'filer_name' => 'sometimes|required|string|max:255',
            'date_reported' => 'sometimes|required|date',
            'item' => 'sometimes|required|string|max:255',
            'property_code' => 'nullable|string|max:50',
            'incident_type' => ['sometimes', 'required', Rule::in(IncidentReport::TYPES)],
            'date_of_incident' => 'sometimes|required|date',
            'place_of_incident' => 'sometimes|required|string|max:255',
            'detailed_narration' => 'sometimes|required|string|max:5000',
            'remarks' => 'nullable|string|max:1000',
            'jo_number' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:1000',
        ];
    }
}
