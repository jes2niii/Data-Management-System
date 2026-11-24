<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\EmployeeStoreRequest;
use App\Http\Requests\EmployeeUpdateRequest;
use App\Http\Requests\CreateEmployeeUserRequest;
use App\Models\Employee;
use App\Models\EmployeeAttachment;
use App\Models\Role;
use App\Models\User;
use App\Services\RoleAdministration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        $query = Employee::with(['department', 'user']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                    ->orWhere('employee_id', 'like', "%{$search}%")
                    ->orWhere('position', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        if ($request->filled('employment_type')) {
            $query->where('employment_type', $request->employment_type);
        }

        $employees = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return $this->success($employees);
    }

    public function store(EmployeeStoreRequest $request)
    {
        $data = $request->validated();

        if (empty($data['employee_id'])) {
            $data['employee_id'] = 'EMP-' . str_pad((Employee::max('id') ?? 0) + 1, 5, '0', STR_PAD_LEFT);
        }

        $last = $request->last_name ?? '';
        $first = $request->first_name ?? '';
        $middle = $request->middle_name ?? '';
        $suffix = $request->suffix ?? '';
        $nameParts = [$last, $first];
        if ($middle) $nameParts[] = $middle;
        if ($suffix) $nameParts[] = $suffix;
        $data['full_name'] = implode(', ', $nameParts);

        if ($request->filled('emergency_contact_person') || $request->filled('emergency_contact_number')) {
            $data['emergency_contact'] = trim($request->emergency_contact_person . ' (' . $request->emergency_contact_number . ')');
        }

        if ($request->hasFile('photo')) {
            $data['photo'] = $request->file('photo')->store('employees', 'public');
        }

        $employee = Employee::create($data);

        return $this->success($employee->load(['department', 'user']), 'Employee created', 201);
    }

    public function show($id)
    {
        $employee = Employee::with(['department', 'user', 'attachments', 'histories'])->findOrFail($id);

        return $this->success($employee);
    }

    public function update(EmployeeUpdateRequest $request, $id)
    {
        $employee = Employee::findOrFail($id);
        $data = $request->validated();

        $last = $request->last_name ?? $employee->last_name;
        $first = $request->first_name ?? $employee->first_name;
        $middle = $request->middle_name ?? $employee->middle_name;
        $suffix = $request->suffix ?? $employee->suffix;
        $nameParts = [$last, $first];
        if ($middle) $nameParts[] = $middle;
        if ($suffix) $nameParts[] = $suffix;
        $data['full_name'] = implode(', ', $nameParts);

        if ($request->filled('emergency_contact_person') || $request->filled('emergency_contact_number')) {
            $data['emergency_contact'] = trim(($request->emergency_contact_person ?? $employee->emergency_contact_person)
                . ' (' . ($request->emergency_contact_number ?? $employee->emergency_contact_number) . ')');
        }

        if ($request->hasFile('photo')) {
            $data['photo'] = $request->file('photo')->store('employees', 'public');
        }

        $employee->update($data);

        return $this->success($employee->load(['department', 'user']), 'Employee updated');
    }

    public function destroy($id)
    {
        $employee = Employee::findOrFail($id);
        $employee->delete();

        return $this->success(null, 'Employee deleted');
    }

    public function uploadAttachment(Request $request, $id)
    {
        $employee = Employee::findOrFail($id);

        $request->validate([
            'file' => 'required|file|max:10240',
            'name' => 'nullable|string|max:255',
            'category' => 'nullable|string|max:100',
            'employee_attachment_category_id' => 'nullable|exists:employee_attachment_categories,id',
        ]);

        $file = $request->file('file');
        $path = $file->store('employee-attachments', 'public');

        $attachment = $employee->attachments()->create([
            'name' => $request->name ?? $file->getClientOriginalName(),
            'file_path' => $path,
            'file_type' => $file->getClientOriginalExtension(),
            'category' => $request->category ?? 'other',
            'employee_attachment_category_id' => $request->employee_attachment_category_id,
            'file_size' => $file->getSize(),
        ]);

        return $this->success($attachment, 'Attachment uploaded', 201);
    }

    public function deleteAttachment($employeeId, $attachmentId)
    {
        $attachment = EmployeeAttachment::where('employee_id', $employeeId)
            ->where('id', $attachmentId)
            ->firstOrFail();

        \Illuminate\Support\Facades\Storage::disk('public')->delete($attachment->file_path);
        $attachment->delete();

        return $this->success(null, 'Attachment deleted');
    }

    /**
     * Create a user account from an employee record and link the two records.
     * Only the role and password come from the caller; identity fields are
     * taken from the employee so they cannot be spoofed.
     */
    public function createUser(CreateEmployeeUserRequest $request, RoleAdministration $roles, $id)
    {
        $data = $request->validated();

        $user = DB::transaction(function () use ($data, $request, $roles, $id) {
            $employee = Employee::lockForUpdate()->findOrFail($id);
            abort_if($employee->user_id !== null, 409, 'This employee already has a user account.');

            $role = Role::findOrFail($data['role_id']);
            $roles->change($request->user(), function (User $actor) use ($roles, $role) {
                abort_unless($actor->hasPermission('users', 'create'), 403);
                $roles->checkRole($actor, $role);
            });

            $email = $data['email'] ?? $employee->email;
            $username = $data['username'] ?? $employee->employee_no;
            if (!$email) {
                throw ValidationException::withMessages(['email' => 'The employee has no email address. Provide one.']);
            }
            if (!$username) {
                throw ValidationException::withMessages(['username' => 'The employee has no employee number. Provide a username.']);
            }
            if (!$employee->department_id) {
                throw ValidationException::withMessages(['department_id' => 'Assign the employee to a department first.']);
            }
            if (User::where('email', $email)->exists()) {
                throw ValidationException::withMessages(['email' => 'This email already belongs to another user.']);
            }
            if (User::where('username', $username)->exists()) {
                throw ValidationException::withMessages(['username' => 'This username is already taken.']);
            }

            $gender = strtolower((string) $employee->gender);
            $user = User::create([
                'name' => $employee->full_name,
                'email' => $email,
                'username' => $username,
                'password' => Hash::make($data['password']),
                'role_id' => $role->id,
                'department_id' => $employee->department_id,
                'position' => $employee->position ?: '',
                'phone' => $employee->phone ?: $employee->mobile_number,
                'address' => $employee->address ?: $employee->present_address,
                'gender' => in_array($gender, ['male', 'female', 'other'], true) ? $gender : null,
                'status' => 'active',
                'is_disabled' => false,
            ]);
            $employee->update(['user_id' => $user->id]);

            return $user;
        }, 3);

        return $this->success($user->load(['role', 'department']), 'User account created from employee', 201);
    }
}
