<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UserUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->route('user');

        return [
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $userId,
            'username' => 'sometimes|string|max:255|unique:users,username,' . $userId,
            'password' => 'sometimes|string|min:6',
            'position' => 'sometimes|string|max:255',
            'department_id' => 'sometimes|exists:departments,id',
            'role_id' => 'sometimes|exists:roles,id',
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
