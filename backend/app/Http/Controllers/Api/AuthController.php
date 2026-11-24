<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        return DB::transaction(function () use ($request) {
            $user = User::where('email', $request->email)->lockForUpdate()->first();
            if (!$user || !Hash::check($request->password, $user->password)) {
                return $this->error('Invalid credentials', 401);
            }

            if ($user->is_disabled) {
                return $this->error('Account is disabled', 403);
            }

            if (Hash::needsRehash($user->password)) {
                $user->password = Hash::make($request->password);
            }
            $token = $user->createToken('api-token', ['*'], now()->addMinutes(config('sanctum.expiration')))->plainTextToken;
            $user->update(['last_login_at' => now()]);

            $user->load('role.permissions', 'department');

            return $this->success([
                'user' => $user,
                'token' => $token,
                'permissions' => $user->role->permissions ?? [],
            ], 'Login successful')->header('Cache-Control', 'no-store');
        });
    }

    public function logout(Request $request)
    {
        $token = $request->user()->currentAccessToken();
        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        return $this->success(null, 'Logged out successfully');
    }

    public function me(Request $request)
    {
        $user = $request->user()->load('role.permissions', 'department');

        return $this->success([
            'user' => $user,
            'permissions' => $user->role->permissions ?? [],
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name' => 'sometimes|required|string|min:2|max:255',
            'email' => 'sometimes|email|max:255|unique:users,email,' . $user->id,
            'username' => 'sometimes|string|max:255|unique:users,username,' . $user->id,
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'gender' => 'nullable|string|in:male,female,other',
            'birthdate' => 'nullable|date',
            'civil_status' => 'nullable|string|max:50',
            'photo' => 'nullable|image|max:2048',
            'password' => [
                'bail', 'sometimes', 'required', 'string', 'min:12', 'max:72', 'confirmed',
                function ($attribute, $value, $fail) {
                    if (strlen($value) > 72) {
                        $fail('The password must be no more than 72 bytes.');
                    }
                },
            ],
            'current_password' => 'required_with:password|string',
        ]);

        $data = $request->only([
            'name', 'email', 'username', 'phone', 'address',
            'gender', 'birthdate', 'civil_status',
        ]);

        $user = DB::transaction(function () use ($data, $user, $request) {
            $user = User::lockForUpdate()->findOrFail($user->id);
            abort_if($user->is_disabled, 403);
            if ($request->filled('password')) {
                if (!Hash::check($request->current_password, $user->password)) {
                    throw ValidationException::withMessages(['current_password' => 'The current password is incorrect.']);
                }
                $data['password'] = Hash::make($request->password);
            }
            if ($request->hasFile('photo')) {
                $path = $request->file('photo')->store('avatars', 'public');
                if ($path === false) {
                    throw new \RuntimeException('Could not store the profile photo.');
                }
                $data['photo'] = $path;
            }
            $user->update($data);
            if (isset($data['password'])) {
                $user->tokens()->delete();
            }

            return $user;
        });

        return $this->success($user->load('role.permissions', 'department'), 'Profile updated');
    }
}
