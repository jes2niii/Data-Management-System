<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UserStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'username' => 'required|string|max:255|unique:users,username',
            'password' => 'required|string|min:6',
            'position' => 'required|string|max:255',
            'department_id' => 'required|exists:departments,id',
            'role_id' => 'required|exists:roles,id',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'gender' => 'nullable|string|in:male,female,other',
            'birthdate' => 'nullable|date',
            'civil_status' => 'nullable|string|max:50',
            'date_hired' => 'nullable|date',
            'salary' => 'nullable|numeric|min:0',
            'employment_type' => 'nullable|string|max:50',
            'emergency_contact' => 'nullable|json',
            'government_ids' => 'nullable|json',
            'status' => 'nullable|string|in:active,inactive,suspended',
            'photo' => 'nullable|image|max:2048',
        ];
    }
}
