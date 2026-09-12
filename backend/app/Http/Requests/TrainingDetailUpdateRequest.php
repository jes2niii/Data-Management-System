<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TrainingDetailUpdateRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'training_id' => 'sometimes|required|exists:trainings,id',
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'price' => 'sometimes|required|numeric|min:0',
            'duration' => 'nullable|string|max:255',
            'manner_of_conduct' => 'nullable|string|max:255',
            'requirements' => 'nullable|string|max:2000',
            'is_active' => 'nullable|boolean',
        ];
    }
}
