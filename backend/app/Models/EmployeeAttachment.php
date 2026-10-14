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
        if (!$this->file_path) return null;
        try {
            $request = request();
            if ($request && $request->getHost()) {
                return $request->getSchemeAndHttpHost() . '/storage/' . ltrim($this->file_path, '/');
            }
        } catch (\Throwable $e) {
            // fall through to asset()
        }
        return asset('storage/' . $this->file_path);
    }

    public function getSizeAttribute($value)
    {
        return $value ? (int) $value : null;
    }
}
