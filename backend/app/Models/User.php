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

    public function hasPermission($module, $action)
    {
        return $this->role?->permissions()
            ->where('module', $module)
            ->where('action', $action)
            ->exists() ?? false;
    }
}
