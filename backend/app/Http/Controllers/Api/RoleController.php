<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\Request;

class RoleController extends Controller
{
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

        $role = Role::create($request->only(['name', 'description']));

        if ($request->has('permissions')) {
            $role->permissions()->sync($request->permissions);
        }

        return $this->success($role->load('permissions'), 'Role created', 201);
    }

    public function show($id)
    {
        $role = Role::with('permissions')->withCount('users')->findOrFail($id);

        return $this->success($role);
    }

    public function update(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|max:255|unique:roles,name,' . $id,
            'description' => 'nullable|string',
        ]);

        $role->update($request->only(['name', 'description']));

        return $this->success($role->load('permissions'), 'Role updated');
    }

    public function destroy($id)
    {
        $role = Role::findOrFail($id);
        $role->delete();

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
            'attach.*' => 'string',
            'detach' => 'nullable|array',
            'detach.*' => 'string',
        ]);

        $role = Role::findOrFail($id);

        if ($request->has('attach')) {
            $ids = Permission::whereIn('name', $request->attach)->pluck('id');
            $role->permissions()->syncWithoutDetaching($ids);
        }

        if ($request->has('detach')) {
            $ids = Permission::whereIn('name', $request->detach)->pluck('id');
            $role->permissions()->detach($ids);
        }

        return $this->success($role->load('permissions'), 'Permissions synced');
    }
}
