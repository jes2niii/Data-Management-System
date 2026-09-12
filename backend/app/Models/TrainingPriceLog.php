<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TrainingPriceLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'training_id',
        'training_detail_id',
        'old_price',
        'new_price',
        'old_training_price',
        'new_training_price',
        'source',
        'notes',
        'changed_by',
    ];

    protected $casts = [
        'old_price' => 'decimal:2',
        'new_price' => 'decimal:2',
        'old_training_price' => 'decimal:2',
        'new_training_price' => 'decimal:2',
    ];

    public function training()
    {
        return $this->belongsTo(Training::class);
    }

    public function detail()
    {
        return $this->belongsTo(TrainingDetail::class, 'training_detail_id');
    }

    public function changer()
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
