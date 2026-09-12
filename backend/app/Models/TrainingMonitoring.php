<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TrainingMonitoring extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'training_monitorings';

    protected $fillable = [
        'date',
        'name',
        'training_id',
        'training_detail_id',
        'training_course',
        'manner_of_conduct',
        'training_schedule_cbt',
        'training_schedule_practical',
        'training_fee',
        'downpayment',
        'balance',
        'remarks',
        'system_location',
        'assisted_by',
        'print_status',
        'created_by',
    ];

    protected $casts = [
        'date' => 'date',
        'training_fee' => 'decimal:2',
        'downpayment' => 'decimal:2',
        'balance' => 'decimal:2',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function training()
    {
        return $this->belongsTo(Training::class, 'training_id');
    }

    public function trainingDetail()
    {
        return $this->belongsTo(TrainingDetail::class, 'training_detail_id');
    }

    protected static function booted()
    {
        static::saving(function ($model) {
            // Auto-fill from training if training_id provided and course/fee missing or should sync
            if (!empty($model->training_id)) {
                $training = Training::find($model->training_id);
                if ($training) {
                    $effectiveTrainingFee = $training->fee ?? $training->price ?? 0;
                    $effectiveTrainingName = $training->title ?? $training->name ?? $training->code;
                    if (empty($model->training_course) || $model->isDirty('training_id')) {
                        $model->training_course = $effectiveTrainingName;
                    }
                    if ($model->isDirty('training_id') && !$model->isDirty('training_fee')) {
                        $model->training_fee = $effectiveTrainingFee;
                    } elseif (empty($model->training_fee) && $model->training_fee !== '0' && $model->training_fee !== 0) {
                        if ((float)$model->training_fee === 0.0 && (float)$effectiveTrainingFee > 0) {
                            $model->training_fee = $effectiveTrainingFee;
                        }
                    }
                }
            }

            // If training_detail_id provided, potentially override fee from detail
            if (!empty($model->training_detail_id)) {
                $detail = TrainingDetail::find($model->training_detail_id);
                if ($detail) {
                    if ($model->isDirty('training_detail_id') && !$model->isDirty('training_fee')) {
                        $model->training_fee = $detail->price;
                    }
                    if (empty($model->training_course) && $detail->title) {
                        // optionally keep course as training name, not detail title
                    }
                }
            }

            $fee = (float) ($model->training_fee ?? 0);
            $down = (float) ($model->downpayment ?? 0);
            $model->balance = round($fee - $down, 2);
            // Auto-set remarks based on balance: Full Payment when 0, else Partial Payment
            $model->remarks = abs((float) $model->balance) < 0.01 ? 'Full Payment' : 'Partial Payment';
        });
    }
}
