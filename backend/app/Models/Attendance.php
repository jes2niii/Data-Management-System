<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id', 'date', 'session', 'status_id', 'time_in', 'time_out',
        'minutes_late', 'hours_worked', 'remarks', 'recorded_by',
    ];

    protected $casts = [
        'date' => 'date',
        'minutes_late' => 'integer',
        'hours_worked' => 'integer',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function status()
    {
        return $this->belongsTo(AttendanceStatus::class, 'status_id');
    }

    public function recorder()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
