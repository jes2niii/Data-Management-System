<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TrainingStoreRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name' => 'nullable|string|max:255|unique:trainings,name',
            'title' => 'nullable|string|max:255',
            'code' => 'nullable|string|max:50|unique:trainings,code',
            'slug' => 'nullable|string|max:255|unique:trainings,slug',
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

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            if (!$this->filled('name') && !$this->filled('title')) {
                $validator->errors()->add('name', 'Name or title is required.');
                $validator->errors()->add('title', 'Name or title is required.');
            }
            if (!$this->filled('price') && !$this->filled('fee')) {
                $validator->errors()->add('price', 'Price or fee is required.');
                $validator->errors()->add('fee', 'Price or fee is required.');
            }
        });
    }
}
