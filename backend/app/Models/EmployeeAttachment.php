<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeAttachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id', 'name', 'file_path', 'file_type', 'category', 'employee_attachment_category_id', 'file_size',
    ];

    protected $appends = ['url'];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function getUrlAttribute()
    {
        return $this->file_path ? asset('storage/' . $this->file_path) : null;
    }

    public function getSizeAttribute($value)
    {
        return $value ? (int) $value : null;
    }
}
