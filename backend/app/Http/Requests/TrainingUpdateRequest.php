<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TrainingUpdateRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|required|string|max:255|unique:trainings,name,' . $this->route('training'),
            'title' => 'nullable|string|max:255',
            'code' => 'nullable|string|max:50|unique:trainings,code,' . $this->route('training'),
            'slug' => 'nullable|string|max:255|unique:trainings,slug,' . $this->route('training'),
            'description' => 'nullable|string|max:2000',
            'price' => 'nullable|numeric|min:0',
            'fee' => 'nullable|numeric|min:0',
            'duration' => 'nullable|string|max:255',
            'category' => 'nullable|string|max:255',
            'category_id' => 'nullable|integer',
            'prerequisites' => 'nullable|string|max:2000',
            'learning_outcomes' => 'nullable|string|max:2000',
            'max_participants' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
            'archived_at' => 'nullable|date',
            'sort_order' => 'nullable|integer',
        ];
    }
}
