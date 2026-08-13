<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'employee_id', 'employee_no', 'user_id', 'photo', 'full_name',
        'first_name', 'middle_name', 'last_name', 'suffix',
        'birthdate', 'age', 'place_of_birth', 'nationality',
        'gender', 'civil_status',
        'department_id', 'position', 'employment_type',
        'date_hired', 'regularization_date', 'years_of_service',
        'salary', 'payroll_type', 'status', 'notes',
        'email', 'phone', 'mobile_number',
        'address', 'present_address', 'permanent_address',
        'emergency_contact', 'emergency_contact_person', 'emergency_contact_number', 'emergency_relationship',
        'government_ids', 'sss_no', 'philhealth_no', 'pagibig_no', 'tin',
        'bank_name', 'bank_account',
    ];

    protected $appends = ['photo_url', 'emergency_contact_name', 'emergency_contact_phone'];

    protected $casts = [
        'birthdate' => 'date',
        'date_hired' => 'date',
        'regularization_date' => 'date',
        'salary' => 'decimal:2',
        'government_ids' => 'json',
    ];

    public function getPhotoUrlAttribute()
    {
        return $this->photo ? asset('storage/' . $this->photo) : null;
    }

    public function getEmergencyContactNameAttribute()
    {
        return $this->emergency_contact_person ?? '';
    }

    public function getEmergencyContactPhoneAttribute()
    {
        return $this->emergency_contact_number ?? '';
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
