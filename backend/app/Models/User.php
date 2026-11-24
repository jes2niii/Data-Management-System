<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens, SoftDeletes;

    protected $attributes = ['status' => 'active', 'is_disabled' => false];

    protected $fillable = [
        'name', 'email', 'password', 'username', 'photo', 'position',
        'department_id', 'phone', 'address', 'gender', 'birthdate',
        'civil_status', 'date_hired', 'salary', 'employment_type',
        'emergency_contact', 'government_ids', 'status', 'last_login_at',
        'is_disabled', 'role_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'birthdate' => 'date',
        'date_hired' => 'date',
        'salary' => 'decimal:2',
        'government_ids' => 'json',
        'emergency_contact' => 'json',
        'last_login_at' => 'datetime',
        'is_disabled' => 'boolean',
    ];

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function permissions()
    {
        return $this->role ? $this->role->permissions() : collect();
    }

    public function isSuperAdmin(): bool
    {
        return $this->role?->name === Role::SUPER_ADMIN;
    }

    public function canSignIn(): bool
    {
        return $this->status === 'active' && !$this->is_disabled;
    }

    public function hasPermission(string $module, string $action): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        if ($this->role === null) {
            return false;
        }

        $this->role->loadMissing('permissions');

        return $this->role->permissions->contains(
            fn (Permission $permission) => $permission->module === $module && $permission->action === $action
        );
    }
}
