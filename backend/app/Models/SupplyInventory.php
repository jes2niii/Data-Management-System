<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SupplyInventory extends Model
{
    use HasFactory;

    protected $fillable = [
        'date','description','beg_balance','unit','unit_price','date_out','qty_out','date_in','qty_in','total_balance','remarks','created_by'
    ];

    protected $casts = [
        'date' => 'date',
        'beg_balance' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'date_out' => 'date',
        'qty_out' => 'decimal:2',
        'date_in' => 'date',
        'qty_in' => 'decimal:2',
        'total_balance' => 'decimal:2',
    ];

    protected static function booted()
    {
        static::saving(function ($model) {
            $beg = (float)($model->beg_balance ?? 0);
            $out = (float)($model->qty_out ?? 0);
            $in = (float)($model->qty_in ?? 0);
            $model->total_balance = round($beg - $out + $in, 2);
        });
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
