<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EmployeeStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'employee_id' => 'nullable|string|max:50|unique:employees,employee_id',
            'user_id' => 'nullable|exists:users,id',
            'full_name' => 'nullable|string|max:255',
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'birthdate' => 'nullable|date',
            'gender' => 'nullable|string|in:male,female,other',
            'civil_status' => 'nullable|string|max:50',
            'department_id' => 'required|exists:departments,id',
            'position' => 'required|string|max:255',
            'employment_type' => 'nullable|string|max:50',
            'date_hired' => 'nullable|date',
            'salary' => 'nullable|numeric|min:0',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'emergency_contact' => 'nullable|string|max:500',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:50',
            'government_ids' => 'nullable|json',
            'status' => 'nullable|string|in:active,inactive,terminated,on_leave',
            'notes' => 'nullable|string|max:1000',
            'photo' => 'nullable|image|max:2048',
        ];
    }
}
