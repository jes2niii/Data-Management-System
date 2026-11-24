<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class Subscription extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name', 'bill_category_id', 'provider', 'description',
        'amount', 'is_variable_amount', 'estimated_amount', 'variable_notes',
        'billing_cycle', 'billing_frequency',
        'start_date', 'next_billing_date', 'end_date',
        'status', 'auto_renew', 'payment_method', 'reference_number',
        'notes', 'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'is_variable_amount' => 'boolean',
        'estimated_amount' => 'decimal:2',
        'billing_frequency' => 'integer',
        'start_date' => 'date',
        'next_billing_date' => 'date',
        'end_date' => 'date',
        'auto_renew' => 'boolean',
    ];

    public function category()
    {
        return $this->belongsTo(BillCategory::class, 'bill_category_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function bills()
    {
        return $this->hasMany(Bill::class, 'reference_number', 'reference_number');
    }

    public function billings()
    {
        return $this->hasMany(SubscriptionBilling::class)->orderBy('billing_date', 'desc');
    }

    public function latestBilling()
    {
        return $this->hasOne(SubscriptionBilling::class)->latestOfMany('billing_date');
    }

    // Accessor for days until next billing
    public function getDaysUntilNextAttribute()
    {
        if (!$this->next_billing_date) return null;
        return Carbon::now()->diffInDays(Carbon::parse($this->next_billing_date), false);
    }

    // Scope for active
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    // Scope for upcoming (next 30 days)
    public function scopeUpcoming($query, $days = 30)
    {
        return $query->where('status', 'active')
            ->whereNotNull('next_billing_date')
            ->whereBetween('next_billing_date', [now()->toDateString(), now()->addDays($days)->toDateString()]);
    }

    // Calculate next billing date based on cycle
    public function calculateNextBillingDate($fromDate = null)
    {
        $base = $fromDate ? Carbon::parse($fromDate) : ($this->next_billing_date ? Carbon::parse($this->next_billing_date) : Carbon::now());
        $freq = $this->billing_frequency ?: 1;
        switch ($this->billing_cycle) {
            case 'weekly':
                return $base->copy()->addWeeks($freq);
            case 'fortnightly':
            case 'biweekly':
                return $base->copy()->addWeeks(2 * $freq);
            case 'quarterly':
                return $base->copy()->addMonths(3 * $freq);
            case 'yearly':
                return $base->copy()->addYears($freq);
            case 'monthly':
            default:
                return $base->copy()->addMonths($freq);
        }
    }
}
