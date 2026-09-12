<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubscriptionUpdateRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|required|string|max:255',
            'bill_category_id' => 'nullable|exists:bill_categories,id',
            'provider' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:2000',
            'amount' => 'sometimes|required|numeric|min:0',
            'is_variable_amount' => 'nullable|boolean',
            'estimated_amount' => 'nullable|numeric|min:0',
            'variable_notes' => 'nullable|string|max:500',
            'billing_cycle' => 'sometimes|required|string|in:weekly,monthly,quarterly,yearly,custom',
            'billing_frequency' => 'nullable|integer|min:1|max:12',
            'start_date' => 'nullable|date',
            'next_billing_date' => 'sometimes|required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => 'nullable|string|in:active,paused,cancelled,expired,trial',
            'auto_renew' => 'nullable|boolean',
            'payment_method' => 'nullable|string|max:50',
            'reference_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:2000',
        ];
    }
}
