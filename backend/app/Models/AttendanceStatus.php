<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AttendanceStatus extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'code', 'color', 'is_present'];

    protected $casts = ['is_present' => 'boolean'];

    public function attendances()
    {
        return $this->hasMany(Attendance::class, 'status_id');
    }
}
