<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UserStoreRequest;
use App\Http\Requests\UserUpdateRequest;
use App\Models\Role;
use App\Models\User;
use App\Services\RoleAdministration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function __construct(private RoleAdministration $roles) {}

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
        $user = $this->roles->change($request->user(), function (User $actor) use ($request) {
            abort_unless($actor->hasPermission('users', 'create'), 403);
            $data = $request->validated();
            $this->roles->checkRole($actor, Role::findOrFail($data['role_id']));
            $data['password'] = Hash::make($data['password']);

            if ($request->hasFile('photo')) {
                $data['photo'] = $request->file('photo')->store('avatars', 'public');
            }

            return User::create($data);
        });

        return $this->success($user->load(['role', 'department']), 'User created', 201);
    }

    public function show($id)
    {
        $user = User::with(['role.permissions', 'department'])->findOrFail($id);

        return $this->success($user);
    }

    public function update(UserUpdateRequest $request, $id)
    {
        $user = $this->changeUser($id, 'update', function (User $user, User $actor, ?Role $systemRole) use ($request) {
            $data = $request->validated();
            // position is NOT NULL in the schema; an intentionally blank field
            // arrives as null after empty-string conversion, so store it as ''.
            if (array_key_exists('position', $data) && $data['position'] === null) {
                $data['position'] = '';
            }
            if (isset($data['role_id']) && (int) $data['role_id'] !== $user->role_id) {
                $this->roles->checkRole($actor, Role::findOrFail($data['role_id']));
                $this->roles->checkAdministratorRemains($user, $systemRole);
            }
            if (isset($data['status']) && $data['status'] !== 'active') {
                $this->roles->checkAdministratorRemains($user, $systemRole);
            }

            if ($request->filled('password')) {
                $data['password'] = Hash::make($data['password']);
            }

            if ($request->hasFile('photo')) {
                $data['photo'] = $request->file('photo')->store('avatars', 'public');
            }

            $user->update($data);
            if ($user->wasChanged(['role_id', 'department_id', 'password', 'email', 'status'])) {
                $user->tokens()->delete();
            }
        });

        return $this->success($user->load(['role', 'department']), 'User updated');
    }

    public function destroy($id)
    {
        $this->changeUser($id, 'delete', function (User $user, User $actor, ?Role $systemRole) {
            $this->roles->checkAdministratorRemains($user, $systemRole);
            $user->tokens()->delete();
            $user->delete();
        });

        return $this->success(null, 'User deleted');
    }

    public function disable($id)
    {
        $user = $this->changeUser($id, 'update', function (User $user, User $actor, ?Role $systemRole) {
            $this->roles->checkAdministratorRemains($user, $systemRole);
            $user->update(['is_disabled' => true]);
            $user->tokens()->delete();
        });

        return $this->success($user, 'User disabled');
    }

    public function enable($id)
    {
        $user = $this->changeUser($id, 'update', fn (User $user) => $user->update(['is_disabled' => false]));

        return $this->success($user, 'User enabled');
    }

    public function resetPassword(Request $request, $id)
    {
        $data = $request->validate(['password' => 'required|string|min:12|max:72']);
        $this->changeUser($id, 'update', function (User $user) use ($data) {
            $user->update(['password' => Hash::make($data['password'])]);
            $user->tokens()->delete();
        });

        return $this->success(null, 'Password reset');
    }

    public function assignRole(Request $request, $id)
    {
        $request->validate(['role_id' => 'required|exists:roles,id']);

        $user = $this->changeUser($id, 'update', function (User $user, User $actor, ?Role $systemRole) use ($request) {
            $role = Role::findOrFail($request->role_id);
            $this->roles->checkRole($actor, $role);
            if ($role->id !== $user->role_id) {
                $this->roles->checkAdministratorRemains($user, $systemRole);
                $user->update(['role_id' => $role->id]);
                $user->tokens()->delete();
            }
        });

        return $this->success($user->load('role.permissions'), 'Role assigned');
    }

    private function changeUser($id, string $action, \Closure $callback): User
    {
        return $this->roles->change(request()->user(), function (User $actor, ?Role $systemRole) use ($id, $action, $callback) {
            abort_unless($actor->hasPermission('users', $action), 403);
            $target = User::lockForUpdate()->findOrFail($id);
            $this->roles->checkTarget($actor, $target);
            $callback($target, $actor, $systemRole);

            return $target;
        });
    }
}
