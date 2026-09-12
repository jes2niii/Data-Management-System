<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IndividualInventory extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_name','department','location','date','property_code','property_name','description','serial_number','control_no','date_received','remarks','created_by'
    ];

    protected $casts = [
        'date' => 'date',
        'date_received' => 'date',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
