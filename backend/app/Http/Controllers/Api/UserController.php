<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UserStoreRequest;
use App\Http\Requests\UserUpdateRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with(['role', 'department']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('username', 'like', "%{$search}%")
                    ->orWhere('position', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('role_id')) {
            $query->where('role_id', $request->role_id);
        }

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        $users = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return $this->success($users);
    }

    public function store(UserStoreRequest $request)
    {
        $data = $request->validated();
        $data['password'] = Hash::make($data['password']);

        if ($request->hasFile('photo')) {
            $data['photo'] = $request->file('photo')->store('avatars', 'public');
        }

        $user = User::create($data);

        return $this->success($user->load(['role', 'department']), 'User created', 201);
    }

    public function show($id)
    {
        $user = User::with(['role.permissions', 'department'])->findOrFail($id);

        return $this->success($user);
    }

    public function update(UserUpdateRequest $request, $id)
    {
        $user = User::findOrFail($id);
        $data = $request->validated();

        if ($request->filled('password')) {
            $data['password'] = Hash::make($data['password']);
        }

        if ($request->hasFile('photo')) {
            $data['photo'] = $request->file('photo')->store('avatars', 'public');
        }

        $user->update($data);

        return $this->success($user->load(['role', 'department']), 'User updated');
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return $this->success(null, 'User deleted');
    }

    public function disable($id)
    {
        $user = User::findOrFail($id);
        $user->update(['is_disabled' => true]);

        return $this->success($user, 'User disabled');
    }

    public function enable($id)
    {
        $user = User::findOrFail($id);
        $user->update(['is_disabled' => false]);

        return $this->success($user, 'User enabled');
    }

    public function resetPassword($id)
    {
        $user = User::findOrFail($id);
        $newPassword = \Illuminate\Support\Str::random(10);
        $user->update(['password' => Hash::make($newPassword)]);

        return $this->success(['password' => $newPassword], 'Password reset');
    }

    public function assignRole(Request $request, $id)
    {
        $request->validate(['role_id' => 'required|exists:roles,id']);

        $user = User::findOrFail($id);
        $user->update(['role_id' => $request->role_id]);

        return $this->success($user->load('role.permissions'), 'Role assigned');
    }
}
