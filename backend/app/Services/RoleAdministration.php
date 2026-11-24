<?php

namespace App\Services;

use App\Models\Role;
use App\Models\User;
use Closure;
use Illuminate\Support\Facades\DB;

class RoleAdministration
{
    public function change(User $actor, Closure $callback): mixed
    {
        return DB::transaction(function () use ($actor, $callback) {
            // Serialize changes that can remove the last enabled Super Admin.
            $systemRole = Role::where('name', Role::SUPER_ADMIN)->lockForUpdate()->first();
            $actor = User::findOrFail($actor->id);
            abort_if($actor->is_disabled, 403);

            return $callback($actor, $systemRole);
        });
    }

    public function checkRole(User $actor, Role $role): void
    {
        if ($actor->isSuperAdmin()) {
            return;
        }

        abort_if($role->name === Role::SUPER_ADMIN, 403);
        $this->checkPermissions($actor, $role->permissions);
    }

    public function checkPermissions(User $actor, iterable $permissions): void
    {
        foreach ($permissions as $permission) {
            abort_unless($actor->hasPermission($permission->module, $permission->action), 403);
        }
    }

    public function checkTarget(User $actor, User $target): void
    {
        if ($target->role) {
            $this->checkRole($actor, $target->role);
        }
    }

    public function checkAdministratorRemains(User $target, ?Role $systemRole): void
    {
        if ($systemRole === null || $target->role_id !== $systemRole->id || $target->is_disabled) {
            return;
        }

        abort_unless(
            $systemRole->users()->where('id', '!=', $target->id)->where('is_disabled', false)->exists(),
            409,
            'The last enabled Super Admin cannot be removed, disabled, or reassigned.'
        );
    }
}
