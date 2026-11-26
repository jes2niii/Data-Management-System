<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Make the Incident Reports permission module visible in Roles & Permissions
     * without re-seeding (which would destroy existing data).
     */
    public function up(): void
    {
        $actions = ['create', 'read', 'update', 'delete', 'export'];
        $permissionIds = [];

        foreach ($actions as $action) {
            $name = "incident_reports.{$action}";
            $id = DB::table('permissions')->where('name', $name)->value('id');
            if (!$id) {
                $id = DB::table('permissions')->insertGetId([
                    'name' => $name,
                    'module' => 'incident_reports',
                    'action' => $action,
                    'description' => ucfirst($action).' incident reports',
                ]);
            }
            $permissionIds[] = $id;
        }

        foreach (['Super Admin', 'Administrator'] as $roleName) {
            $roleId = DB::table('roles')->where('name', $roleName)->value('id');
            if (!$roleId) {
                continue;
            }
            foreach ($permissionIds as $permissionId) {
                $exists = DB::table('role_permission')
                    ->where('role_id', $roleId)
                    ->where('permission_id', $permissionId)
                    ->exists();
                if (!$exists) {
                    DB::table('role_permission')->insert([
                        'role_id' => $roleId,
                        'permission_id' => $permissionId,
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        // Intentionally left blank: removing permissions could break role
        // assignments and existing audit history.
    }
};
