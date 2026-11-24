<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateEmployeeUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'role_id' => 'required|exists:roles,id',
            'password' => 'required|string|min:6|max:72',
            'username' => 'nullable|string|max:255|unique:users,username',
            'email' => 'nullable|email|max:255|unique:users,email',
        ];
    }
}
