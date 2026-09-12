<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryBatch extends Model
{
    use HasFactory;

    protected $fillable = [
        'inventory_item_id', 'batch_number', 'purchase_date', 'quantity', 'remaining_quantity',
        'unit_cost', 'total_cost', 'supplier', 'reference_number', 'expiry_date', 'notes', 'created_by',
    ];

    protected $casts = [
        'purchase_date' => 'date',
        'expiry_date' => 'date',
        'quantity' => 'decimal:2',
        'remaining_quantity' => 'decimal:2',
        'unit_cost' => 'decimal:2',
        'total_cost' => 'decimal:2',
    ];

    public function item()
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
