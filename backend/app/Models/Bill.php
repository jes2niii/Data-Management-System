<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Bill extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name', 'bill_category_id', 'provider', 'reference_number',
        'amount', 'billing_date', 'due_date', 'payment_date', 'status',
        'payment_method', 'notes', 'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'billing_date' => 'date',
        'due_date' => 'date',
        'payment_date' => 'date',
    ];

    public function category()
    {
        return $this->belongsTo(BillCategory::class, 'bill_category_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function attachments()
    {
        return $this->hasMany(BillAttachment::class);
    }
}
