<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'sku', 'name', 'description', 'inventory_category_id', 'supplier_id', 'department_id',
        'quantity', 'unit', 'location', 'reorder_point', 'unit_cost', 'total_value', 'status',
        'last_restocked_at', 'expiry_date', 'notes', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_cost' => 'decimal:2',
        'total_value' => 'decimal:2',
        'reorder_point' => 'integer',
        'last_restocked_at' => 'date',
        'expiry_date' => 'date',
    ];

    protected static function booted()
    {
        static::saving(function ($model) {
            $qty = (float) ($model->quantity ?? 0);
            $cost = (float) ($model->unit_cost ?? 0);
            $model->total_value = round($qty * $cost, 2);

            $reorder = (int) ($model->reorder_point ?? 10);
            if ($qty <= 0) {
                $model->status = 'out_of_stock';
            } elseif ($qty <= $reorder) {
                $model->status = 'low_stock';
            } elseif ($qty > $reorder * 3) {
                $model->status = 'overstock';
            } else {
                $model->status = 'in_stock';
            }
        });
    }

    public function category()
    {
        return $this->belongsTo(InventoryCategory::class, 'inventory_category_id');
    }

    public function supplier()
    {
        return $this->belongsTo(InventorySupplier::class, 'supplier_id');
    }

    public function department()
    {
        return $this->belongsTo(Department::class, 'department_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function transactions()
    {
        return $this->hasMany(InventoryTransaction::class, 'inventory_item_id')->latest();
    }

    public function batches()
    {
        return $this->hasMany(InventoryBatch::class, 'inventory_item_id')->orderBy('purchase_date', 'desc');
    }

    public function getAverageCostAttribute()
    {
        $totalQty = $this->batches()->sum('remaining_quantity');
        if ($totalQty <= 0) return $this->unit_cost;
        $totalCost = $this->batches()->sum(\Illuminate\Support\Facades\DB::raw('remaining_quantity * unit_cost'));
        return $totalQty > 0 ? round($totalCost / $totalQty, 2) : $this->unit_cost;
    }
}
