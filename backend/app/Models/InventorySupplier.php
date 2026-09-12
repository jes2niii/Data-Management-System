<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventorySupplier extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['name', 'code', 'contact_person', 'email', 'phone', 'address', 'is_active'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function items()
    {
        return $this->hasMany(InventoryItem::class, 'supplier_id');
    }
}
