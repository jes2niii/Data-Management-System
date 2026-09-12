<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PropertySummary extends Model
{
    use HasFactory;

    protected $fillable = [
        'month_year','property_code','property_name','description','serial_number','date_checked','status','created_by'
    ];

    protected $casts = [
        'date_checked' => 'date',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
