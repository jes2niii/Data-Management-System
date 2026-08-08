<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            return $this->error('Invalid credentials', 401);
        }

        $user = User::where('email', $request->email)->first();

        if ($user->is_disabled) {
            return $this->error('Account is disabled', 403);
        }

        $token = $user->createToken('api-token')->plainTextToken;
        $user->update(['last_login_at' => now()]);

        $user->load('role.permissions', 'department');

        return $this->success([
            'user' => $user,
            'token' => $token,
            'permissions' => $user->role->permissions ?? [],
        ], 'Login successful');
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

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
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'username' => 'sometimes|string|max:255|unique:users,username,' . $user->id,
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'gender' => 'nullable|string|in:male,female,other',
            'birthdate' => 'nullable|date',
            'civil_status' => 'nullable|string|max:50',
            'photo' => 'nullable|image|max:2048',
        ]);

        $data = $request->only([
            'name', 'email', 'username', 'phone', 'address',
            'gender', 'birthdate', 'civil_status',
        ]);

        if ($request->hasFile('photo')) {
            $data['photo'] = $request->file('photo')->store('avatars', 'public');
        }

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        return $this->success($user->load('role.permissions', 'department'), 'Profile updated');
    }
}
