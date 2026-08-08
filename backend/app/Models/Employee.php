<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'employee_id', 'user_id', 'photo', 'full_name', 'birthdate',
        'gender', 'civil_status', 'department_id', 'position', 'employment_type',
        'date_hired', 'salary', 'email', 'phone', 'address', 'emergency_contact',
        'government_ids', 'status', 'notes',
    ];

    protected $appends = ['first_name', 'last_name', 'photo_url', 'emergency_contact_name', 'emergency_contact_phone'];

    protected $casts = [
        'birthdate' => 'date',
        'date_hired' => 'date',
        'salary' => 'decimal:2',
        'government_ids' => 'json',
    ];

    public function getFirstNameAttribute()
    {
        $parts = explode(' ', $this->full_name ?? '');
        return $parts[0] ?? '';
    }

    public function getLastNameAttribute()
    {
        $parts = explode(' ', $this->full_name ?? '');
        return count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : '';
    }

    public function getPhotoUrlAttribute()
    {
        return $this->photo ? asset('storage/' . $this->photo) : null;
    }

    public function getEmergencyContactNameAttribute()
    {
        if (!$this->emergency_contact) return '';
        $parts = explode(' (', rtrim($this->emergency_contact, ')'));
        return $parts[0] ?? '';
    }

    public function getEmergencyContactPhoneAttribute()
    {
        if (!$this->emergency_contact) return '';
        $parts = explode(' (', rtrim($this->emergency_contact, ')'));
        return $parts[1] ?? '';
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function attachments()
    {
        return $this->hasMany(EmployeeAttachment::class);
    }

    public function histories()
    {
        return $this->hasMany(EmployeeHistory::class);
    }
}
