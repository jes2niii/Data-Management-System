<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Training extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'title',
        'slug',
        'code',
        'description',
        'price',
        'fee',
        'duration',
        'category',
        'category_id',
        'prerequisites',
        'learning_outcomes',
        'max_participants',
        'is_active',
        'archived_at',
        'sort_order',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'fee' => 'decimal:2',
        'is_active' => 'boolean',
        'archived_at' => 'datetime',
        'sort_order' => 'integer',
        'max_participants' => 'integer',
        'category_id' => 'integer',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function trainingCategory()
    {
        return $this->belongsTo(TrainingCategory::class, 'category_id');
    }

    public function categoryRelation()
    {
        return $this->belongsTo(TrainingCategory::class, 'category_id');
    }

    public function details()
    {
        return $this->hasMany(TrainingDetail::class);
    }

    public function priceLogs()
    {
        return $this->hasMany(TrainingPriceLog::class);
    }

    public function monitorings()
    {
        return $this->hasMany(TrainingMonitoring::class, 'training_id');
    }
}
