<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Department::with(['head:id,name', 'users:id,name,department_id'])->withCount('employees');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        $departments = $query->orderBy('name')->get();

        return $this->success($departments);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:departments,code',
            'description' => 'nullable|string',
            'head_id' => 'nullable|exists:users,id',
            'is_active' => 'boolean',
        ]);

        $department = Department::create($request->all());

        return $this->success($department->load('head:id,name'), 'Department created', 201);
    }

    public function show($id)
    {
        $department = Department::with(['head:id,name', 'users:id,name,department_id', 'employees:id,full_name,department_id'])
            ->withCount('employees')->findOrFail($id);

        return $this->success($department);
    }

    public function update(Request $request, $id)
    {
        $department = Department::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50|unique:departments,code,' . $id,
            'description' => 'nullable|string',
            'head_id' => 'nullable|exists:users,id',
            'is_active' => 'boolean',
        ]);

        $department->update($request->all());

        return $this->success($department->load('head:id,name'), 'Department updated');
    }

    public function destroy($id)
    {
        \Illuminate\Support\Facades\DB::transaction(function () use ($id) {
            $department = Department::lockForUpdate()->findOrFail($id);
            abort_if(
                $department->users()->withTrashed()->exists() || $department->employees()->withTrashed()->exists(),
                409,
                'Reassign users and employees before deleting this department.'
            );
            $department->delete();
        });

        return $this->success(null, 'Department deleted');
    }
}
