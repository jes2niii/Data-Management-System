<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SubscriptionBilling extends Model
{
    use HasFactory;

    protected $fillable = [
        'subscription_id', 'billing_date', 'due_date', 'amount', 'paid_amount',
        'status', 'reference_number', 'notes', 'created_by',
    ];

    protected $casts = [
        'billing_date' => 'date',
        'due_date' => 'date',
        'amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
    ];

    public function subscription()
    {
        return $this->belongsTo(Subscription::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
