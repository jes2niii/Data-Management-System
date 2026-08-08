<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BillUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            'bill_category_id' => 'sometimes|exists:bill_categories,id',
            'provider' => 'nullable|string|max:255',
            'reference_number' => 'nullable|string|max:100',
            'amount' => 'sometimes|numeric|min:0',
            'billing_date' => 'sometimes|date',
            'due_date' => 'sometimes|date',
            'payment_date' => 'nullable|date',
            'status' => 'nullable|string|in:pending,paid,overdue,cancelled',
            'payment_method' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:2000',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|max:10240',
        ];
    }
}
