<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class IncidentReport extends Model
{
    use HasFactory, SoftDeletes;

    public const TYPES = ['Lost', 'Damaged', 'Stolen'];

    protected $fillable = [
        'ir_number', 'filer_name', 'date_reported', 'item', 'property_code',
        'incident_type', 'date_of_incident', 'place_of_incident', 'detailed_narration',
        'remarks', 'jo_number', 'notes', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'date_reported' => 'date',
        'date_of_incident' => 'date',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
