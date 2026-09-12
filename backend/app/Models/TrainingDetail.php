<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TrainingDetail extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'training_id',
        'title',
        'description',
        'price',
        'duration',
        'manner_of_conduct',
        'requirements',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function training()
    {
        return $this->belongsTo(Training::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function priceLogs()
    {
        return $this->hasMany(TrainingPriceLog::class, 'training_detail_id');
    }
}
