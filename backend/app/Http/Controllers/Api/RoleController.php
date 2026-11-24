<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\RoleAdministration;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    public function __construct(private RoleAdministration $roles) {}

    public function index(Request $request)
    {
        $query = Role::withCount(['users', 'permissions']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('name', 'like', "%{$search}%");
        }

        $roles = $query->orderBy('name')->get();

        return $this->success($roles);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:roles,name',
            'description' => 'nullable|string',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $role = $this->roles->change($request->user(), function (User $actor) use ($request) {
            abort_unless($actor->hasPermission('roles', 'create'), 403);
            $this->rejectReservedName($request->name);
            $permissions = Permission::whereIn('id', $request->input('permissions') ?? [])->get();
            $this->roles->checkPermissions($actor, $permissions);
            $role = Role::create($request->only(['name', 'description']));
            $role->permissions()->sync($permissions->modelKeys());

            return $role;
        });

        return $this->success($role->load('permissions'), 'Role created', 201);
    }

    public function show($id)
    {
        $role = Role::with('permissions')->withCount('users')->findOrFail($id);

        return $this->success($role);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255|unique:roles,name,' . $id,
            'description' => 'nullable|string',
        ]);

        $role = $this->changeRole($request, $id, 'update', function (Role $role) use ($request) {
            $data = $request->only(['name', 'description']);
            if (isset($data['name']) && $data['name'] !== $role->name) {
                abort_if($role->name === Role::SUPER_ADMIN, 403);
                $this->rejectReservedName($data['name']);
            }
            $role->update($data);
        });

        return $this->success($role->load('permissions'), 'Role updated');
    }

    public function destroy($id)
    {
        $this->changeRole(request(), $id, 'delete', function (Role $role) {
            abort_if($role->name === Role::SUPER_ADMIN, 403);
            abort_if($role->users()->withTrashed()->exists(), 409, 'Reassign users before deleting this role.');
            $role->delete();
        });

        return $this->success(null, 'Role deleted');
    }

    public function permissions($id)
    {
        $role = Role::findOrFail($id);

        return $this->success($role->permissions);
    }

    public function syncPermissions(Request $request, $id)
    {
        $request->validate([
            'attach' => 'nullable|array',
            'attach.*' => 'string|exists:permissions,name',
            'detach' => 'nullable|array',
            'detach.*' => 'string|exists:permissions,name',
        ]);

        $role = $this->changeRole($request, $id, 'update', function (Role $role, User $actor) use ($request) {
            $attach = Permission::whereIn('name', $request->input('attach') ?? [])->get();
            $detach = Permission::whereIn('name', $request->input('detach') ?? [])->get();
            $this->roles->checkPermissions($actor, $attach);
            $role->permissions()->syncWithoutDetaching($attach->modelKeys());
            $role->permissions()->detach($detach->modelKeys());
        });

        return $this->success($role->load('permissions'), 'Permissions synced');
    }

    private function changeRole(Request $request, $id, string $action, \Closure $callback): Role
    {
        return $this->roles->change($request->user(), function (User $actor) use ($id, $action, $callback) {
            abort_unless($actor->hasPermission('roles', $action), 403);
            $role = Role::findOrFail($id);
            $this->roles->checkRole($actor, $role);
            $callback($role, $actor);

            return $role;
        });
    }

    private function rejectReservedName(string $name): void
    {
        abort_if(strcasecmp(trim($name), Role::SUPER_ADMIN) === 0, 403);
    }
}
