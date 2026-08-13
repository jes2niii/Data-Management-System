<?php

namespace Database\Seeders;

use App\Models\BillCategory;
use App\Models\Department;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $roles = $this->createRoles();
        $permissions = $this->createPermissions();
        $this->assignPermissionsToRoles($roles, $permissions);
        $this->createDefaultDepartments();
        $this->createUsers($roles);
        $this->createDefaultBillCategories();
        $this->createDefaultFormCategories();
        $this->createDefaultDocumentCategories();
        $this->createDefaultFolderCategories();
        $this->createDefaultEmployeeAttachmentCategories();
        $this->createDefaultAttendanceStatuses();
        $this->createDefaultSettings();
    }

    private function createRoles(): array
    {
        $roleNames = [
            'Super Admin' => 'Full system access with all permissions',
            'Administrator' => 'Administrative access with most permissions',
            'HR' => 'Human resources management access',
            'Finance' => 'Financial management access',
            'Employee' => 'Basic employee access with limited permissions',
            'Viewer' => 'Read-only access to selected modules',
        ];

        $roles = [];

        foreach ($roleNames as $name => $description) {
            $roles[$name] = Role::create([
                'name' => $name,
                'description' => $description,
            ]);
        }

        return $roles;
    }

    private function createPermissions(): array
    {
        $modules = [
            'users',
            'employees',
            'departments',
            'documents',
            'folders',
            'forms',
            'bills',
            'bill_categories',
            'reports',
            'settings',
            'activity_logs',
            'roles',
        ];

        $actions = ['create', 'read', 'update', 'delete', 'export'];

        $permissions = [];

        foreach ($modules as $module) {
            foreach ($actions as $action) {
                $name = "{$module}.{$action}";
                $permissions[$name] = Permission::create([
                    'name' => $name,
                    'module' => $module,
                    'action' => $action,
                    'description' => ucfirst($action) . ' ' . str_replace('_', ' ', $module),
                ]);
            }
        }

        $approvalModules = ['documents', 'bills'];
        foreach ($approvalModules as $module) {
            $name = "{$module}.approve";
            $permissions[$name] = Permission::create([
                'name' => $name,
                'module' => $module,
                'action' => 'approve',
                'description' => 'Approve ' . str_replace('_', ' ', $module),
            ]);
        }

        return $permissions;
    }

    private function assignPermissionsToRoles(array $roles, array $permissions): void
    {
        $superAdmin = $roles['Super Admin'];
        $allPermissionModels = Permission::all();
        $modules = [
            'users', 'employees', 'departments', 'documents', 'folders', 'forms',
            'bills', 'bill_categories', 'reports', 'settings', 'activity_logs', 'roles',
        ];

        $superAdmin->permissions()->sync($allPermissionModels->pluck('id')->toArray());

        $adminPerms = Permission::where('action', '!=', 'delete')
            ->whereNotIn('module', ['activity_logs'])
            ->pluck('id')->toArray();
        $roles['Administrator']->permissions()->sync($adminPerms);

        $hrPerms = Permission::where(function ($q) {
            $q->where('module', 'employees')
                ->whereIn('action', ['read', 'create', 'update']);
        })->orWhere(function ($q) {
            $q->where('module', 'documents')->where('action', 'read');
        })->orWhere(function ($q) {
            $q->where('module', 'forms')->where('action', 'read');
        })->pluck('id')->toArray();
        $roles['HR']->permissions()->sync($hrPerms);

        $financePerms = Permission::where('module', 'bills')
            ->orWhere(function ($q) {
                $q->where('module', 'reports')->where('action', 'read');
            })
            ->orWhere(function ($q) {
                $q->where('module', 'documents')->where('action', 'read');
            })
            ->pluck('id')->toArray();
        $roles['Finance']->permissions()->sync($financePerms);

        $employeePerms = Permission::whereIn('module', ['employees', 'documents', 'forms', 'bills'])
            ->where('action', 'read')
            ->pluck('id')->toArray();
        $roles['Employee']->permissions()->sync($employeePerms);

        $viewerPerms = Permission::where(function ($q) {
            $q->where('module', 'documents')->where('action', 'read');
        })->orWhere(function ($q) {
            $q->where('module', 'forms')->where('action', 'read');
        })->pluck('id')->toArray();
        $roles['Viewer']->permissions()->sync($viewerPerms);
    }

    private function createUsers(array $roles): void
    {
        $itDept = Department::where('name', 'IT')->first();

        User::create([
            'name' => 'Super Admin',
            'username' => 'admin',
            'email' => 'admin@admin.com',
            'password' => Hash::make('password'),
            'position' => 'System Administrator',
            'department_id' => $itDept->id,
            'role_id' => $roles['Super Admin']->id,
            'status' => 'active',
        ]);

        User::create([
            'name' => 'Administrator',
            'username' => 'admin2',
            'email' => 'admin2@admin.com',
            'password' => Hash::make('password'),
            'position' => 'Administrator',
            'department_id' => $itDept->id,
            'role_id' => $roles['Administrator']->id,
            'status' => 'active',
        ]);
    }

    private function createDefaultDepartments(): void
    {
        $departments = ['HR', 'Finance', 'IT', 'Operations', 'Engineering', 'Administration', 'Legal', 'Marketing', 'Sales'];

        foreach ($departments as $name) {
            Department::create([
                'name' => $name,
                'code' => strtoupper(substr($name, 0, 4)),
                'is_active' => true,
            ]);
        }
    }

    private function createDefaultBillCategories(): void
    {
        $categories = [
            'Internet', 'Electricity', 'Water', 'Office Rent',
            'Government Fees', 'Subscriptions', 'Licenses',
            'Payroll', 'Taxes', 'Others',
        ];

        foreach ($categories as $name) {
            BillCategory::create([
                'name' => $name,
                'is_active' => true,
            ]);
        }
    }

    private function createDefaultSettings(): void
    {
        $settings = [
            ['key' => 'company_name', 'value' => 'Data Management System', 'group' => 'general', 'type' => 'string'],
            ['key' => 'company_logo', 'value' => null, 'group' => 'general', 'type' => 'image'],
            ['key' => 'company_address', 'value' => null, 'group' => 'general', 'type' => 'text'],
            ['key' => 'company_email', 'value' => null, 'group' => 'general', 'type' => 'string'],
            ['key' => 'company_phone', 'value' => null, 'group' => 'general', 'type' => 'string'],
            ['key' => 'timezone', 'value' => 'Asia/Manila', 'group' => 'general', 'type' => 'string'],
            ['key' => 'currency', 'value' => 'PHP', 'group' => 'general', 'type' => 'string'],
            ['key' => 'date_format', 'value' => 'Y-m-d', 'group' => 'general', 'type' => 'string'],
        ];

        foreach ($settings as $setting) {
            Setting::create($setting);
        }
    }

    private function createDefaultAttendanceStatuses(): void
    {
        $statuses = [
            ['name' => 'Present', 'code' => 'present', 'color' => 'green', 'is_present' => true],
            ['name' => 'Absent', 'code' => 'absent', 'color' => 'red', 'is_present' => false],
            ['name' => 'Late', 'code' => 'late', 'color' => 'yellow', 'is_present' => true],
            ['name' => 'Half-day', 'code' => 'half_day', 'color' => 'orange', 'is_present' => true],
            ['name' => 'Leave', 'code' => 'leave', 'color' => 'blue', 'is_present' => false],
            ['name' => 'Holiday', 'code' => 'holiday', 'color' => 'gray', 'is_present' => false],
        ];
        foreach ($statuses as $s) {
            \App\Models\AttendanceStatus::create($s);
        }
    }

    private function createDefaultFormCategories(): void
    {
        $categories = [
            ['name' => 'Government Forms', 'description' => 'Government-issued forms and documents'],
            ['name' => 'Company Forms', 'description' => 'Internal company forms'],
            ['name' => 'Policies', 'description' => 'Company policies and guidelines'],
            ['name' => 'Manuals', 'description' => 'User manuals and documentation'],
            ['name' => 'Templates', 'description' => 'Document and form templates'],
            ['name' => 'Contracts', 'description' => 'Contract templates and agreements'],
            ['name' => 'Printable Forms', 'description' => 'Forms designed for printing'],
            ['name' => 'Other', 'description' => 'Other forms and documents'],
        ];

        foreach ($categories as $category) {
            \App\Models\FormCategory::create($category);
        }
    }

    private function createDefaultDocumentCategories(): void
    {
        $categories = [
            ['name' => 'HR', 'description' => 'Human resources documents'],
            ['name' => 'Finance', 'description' => 'Financial documents'],
            ['name' => 'Legal', 'description' => 'Legal documents and contracts'],
            ['name' => 'Operations', 'description' => 'Operations documents'],
            ['name' => 'Engineering', 'description' => 'Engineering and technical documents'],
            ['name' => 'Administration', 'description' => 'Administrative documents'],
            ['name' => 'Reports', 'description' => 'Reports and analytics'],
            ['name' => 'Other', 'description' => 'Other documents'],
        ];

        foreach ($categories as $category) {
            \App\Models\DocumentCategory::create($category);
        }
    }

    private function createDefaultFolderCategories(): void
    {
        $categories = [
            ['name' => 'General', 'description' => 'General purpose folders'],
            ['name' => 'HR', 'description' => 'Human resources'],
            ['name' => 'Finance', 'description' => 'Financial documents'],
            ['name' => 'Legal', 'description' => 'Legal documents'],
            ['name' => 'Operations', 'description' => 'Business operations'],
            ['name' => 'Engineering', 'description' => 'Engineering and technical'],
            ['name' => 'Administration', 'description' => 'Administrative documents'],
        ];

        foreach ($categories as $category) {
            \App\Models\FolderCategory::create($category);
        }
    }

    private function createDefaultEmployeeAttachmentCategories(): void
    {
        $categories = [
            ['name' => 'Contract', 'description' => 'Employment contracts'],
            ['name' => 'Requirement', 'description' => 'Pre-employment requirements'],
            ['name' => 'Certificate', 'description' => 'Training and education certificates'],
            ['name' => 'ID', 'description' => 'Government IDs and identification'],
            ['name' => 'Resume', 'description' => 'Resumes and CVs'],
            ['name' => 'Other', 'description' => 'Other attachments'],
        ];

        foreach ($categories as $category) {
            \App\Models\EmployeeAttachmentCategory::create($category);
        }
    }
}
