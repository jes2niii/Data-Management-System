<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EmployeeUpdateRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $employeeId = $this->route('employee');
        return [
            'employee_id' => 'sometimes|string|max:50|unique:employees,employee_id,' . $employeeId,
            'employee_no' => 'nullable|string|max:50',
            'user_id' => 'nullable|exists:users,id',
            'full_name' => 'nullable|string|max:255',
            'first_name' => 'nullable|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'suffix' => 'nullable|string|max:50',
            'birthdate' => 'nullable|date',
            'place_of_birth' => 'nullable|string|max:255',
            'nationality' => 'nullable|string|max:100',
            'gender' => 'nullable|string|in:male,female,other',
            'civil_status' => 'nullable|string|max:50',
            'department_id' => 'sometimes|exists:departments,id',
            'position' => 'sometimes|string|max:255',
            'employment_type' => 'nullable|string|max:50',
            'date_hired' => 'nullable|date',
            'regularization_date' => 'nullable|date',
            'salary' => 'nullable|numeric|min:0',
            'payroll_type' => 'nullable|string|max:50',
            'status' => 'nullable|string|in:active,inactive,terminated,on_leave',
            'notes' => 'nullable|string|max:1000',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'mobile_number' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'present_address' => 'nullable|string|max:500',
            'permanent_address' => 'nullable|string|max:500',
            'emergency_contact' => 'nullable|string|max:500',
            'emergency_contact_person' => 'nullable|string|max:255',
            'emergency_contact_number' => 'nullable|string|max:50',
            'emergency_relationship' => 'nullable|string|max:100',
            'government_ids' => 'nullable|json',
            'sss_no' => 'nullable|string|max:50',
            'philhealth_no' => 'nullable|string|max:50',
            'pagibig_no' => 'nullable|string|max:50',
            'tin' => 'nullable|string|max:50',
            'bank_name' => 'nullable|string|max:255',
            'bank_account' => 'nullable|string|max:100',
            'photo' => 'nullable|image|max:2048',
        ];
    }
}
