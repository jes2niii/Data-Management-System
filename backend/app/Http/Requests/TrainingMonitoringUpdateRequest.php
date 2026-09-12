<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TrainingMonitoringUpdateRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'date' => 'nullable|date',
            'name' => 'sometimes|required|string|max:255',
            'training_id' => 'nullable|exists:trainings,id',
            'training_detail_id' => 'nullable|exists:training_details,id',
            'training_course' => 'nullable|string|max:255',
            'manner_of_conduct' => 'nullable|string|max:255',
            'training_schedule_cbt' => 'nullable|string|max:255',
            'training_schedule_practical' => 'nullable|string|max:255',
            'training_fee' => 'nullable|numeric|min:0',
            'downpayment' => 'nullable|numeric|min:0',
            'balance' => 'nullable|numeric',
            'remarks' => 'nullable|string|in:Full Payment,Partial Payment',
            'system_location' => 'nullable|string|in:Manila,Naga,Legazpi',
            'assisted_by' => 'nullable|string|max:255',
            'print_status' => 'nullable|string|in:To Print,Printed',
        ];
    }
}
