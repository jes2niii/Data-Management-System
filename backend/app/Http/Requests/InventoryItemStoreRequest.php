<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class InventoryItemStoreRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'sku' => 'nullable|string|max:50|unique:inventory_items,sku',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'inventory_category_id' => 'nullable|exists:inventory_categories,id',
            'supplier_id' => 'nullable|exists:inventory_suppliers,id',
            'department_id' => 'nullable|exists:departments,id',
            'quantity' => 'required|numeric|min:0',
            'unit' => 'nullable|string|max:20',
            'location' => 'nullable|string|max:255',
            'reorder_point' => 'nullable|integer|min:0',
            'unit_cost' => 'required|numeric|min:0',
            'expiry_date' => 'nullable|date',
            'notes' => 'nullable|string|max:2000',
        ];
    }
}
