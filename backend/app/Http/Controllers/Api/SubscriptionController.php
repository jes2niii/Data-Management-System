<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SubscriptionStoreRequest;
use App\Http\Requests\SubscriptionUpdateRequest;
use App\Models\Subscription;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SubscriptionController extends Controller
{
    public function index(Request $request)
    {
        $query = Subscription::with(['category','creator','billings'])->orderBy('next_billing_date', 'asc');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search){
                $q->where('name','like',"%{$search}%")
                  ->orWhere('provider','like',"%{$search}%")
                  ->orWhere('reference_number','like',"%{$search}%");
            });
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('billing_cycle')) {
            $query->where('billing_cycle', $request->billing_cycle);
        }
        if ($request->filled('category_id')) {
            $query->where('bill_category_id', $request->category_id);
        }
        if ($request->filled('upcoming_days')) {
            $days = (int) $request->upcoming_days;
            $query->where('status','active')->whereBetween('next_billing_date',[now()->toDateString(), now()->addDays($days)->toDateString()]);
        }

        $perPage = $request->get('per_page', 15);
        $subs = $query->paginate($perPage);
        // Append days_until_next for each
        $subs->getCollection()->transform(function($sub){
            $sub->days_until_next = $sub->days_until_next;
            return $sub;
        });
        return $this->success($subs);
    }

    public function store(SubscriptionStoreRequest $request)
    {
        $data = $request->validated();
        $data['created_by'] = $request->user()->id;
        $data['billing_frequency'] = $data['billing_frequency'] ?? 1;
        $data['status'] = $data['status'] ?? 'active';
        $sub = Subscription::create($data);
        return $this->success($sub->load(['category','creator']), 'Subscription created', 201);
    }

    public function show($id)
    {
        $sub = Subscription::with(['category','creator','billings'])->findOrFail($id);
        $sub->days_until_next = $sub->days_until_next;
        $sub->is_variable = (bool) $sub->is_variable_amount;
        return $this->success($sub);
    }

    public function update(SubscriptionUpdateRequest $request, $id)
    {
        $sub = Subscription::findOrFail($id);
        $data = $request->validated();
        $sub->update($data);
        return $this->success($sub->load(['category','creator']), 'Subscription updated');
    }

    public function destroy($id)
    {
        $sub = Subscription::findOrFail($id);
        $sub->delete();
        return $this->success(null, 'Subscription deleted');
    }

    public function stats(Request $request)
    {
        $query = Subscription::query();
        if ($request->filled('status')) $query->where('status', $request->status);

        $total = (clone $query)->count();
        $active = (clone $query)->where('status','active')->count();
        $paused = (clone $query)->where('status','paused')->count();
        $cancelled = (clone $query)->where('status','cancelled')->count();

        $totalMonthly = 0;
        $allActive = Subscription::where('status','active')->get();
        foreach ($allActive as $sub) {
            $monthly = $this->toMonthlyAmount($sub);
            $totalMonthly += $monthly;
        }

        $upcoming7 = Subscription::upcoming(7)->count();
        $upcoming30 = Subscription::upcoming(30)->count();
        $overdue = Subscription::where('status','active')->where('next_billing_date','<',now()->toDateString())->count();

        $byCategory = Subscription::leftJoin('bill_categories','subscriptions.bill_category_id','=','bill_categories.id')
            ->selectRaw('COALESCE(bill_categories.name, "Uncategorized") as category, COUNT(*) as count, SUM(subscriptions.amount) as total')
            ->groupBy('category')
            ->orderByDesc('total')
            ->get();

        $byCycle = Subscription::selectRaw('billing_cycle, COUNT(*) as count, SUM(amount) as total')
            ->groupBy('billing_cycle')
            ->get();

        $byStatus = Subscription::selectRaw('status, COUNT(*) as count, SUM(amount) as total')
            ->groupBy('status')
            ->get();

        return $this->success([
            'total' => $total,
            'active' => $active,
            'paused' => $paused,
            'cancelled' => $cancelled,
            'total_monthly_equivalent' => round($totalMonthly,2),
            'upcoming_7' => $upcoming7,
            'upcoming_30' => $upcoming30,
            'overdue' => $overdue,
            'by_category' => $byCategory,
            'by_cycle' => $byCycle,
            'by_status' => $byStatus,
        ]);
    }

    public function upcoming(Request $request)
    {
        $days = (int) $request->get('days', 30);
        $subs = Subscription::with(['category','creator'])
            ->upcoming($days)
            ->orderBy('next_billing_date','asc')
            ->paginate($request->get('per_page', 15));
        $subs->getCollection()->transform(fn($s)=> tap($s, fn($x)=> $x->days_until_next = $x->days_until_next));
        return $this->success($subs);
    }

    public function renew(Request $request, $id)
    {
        $data = $request->validate([
            'expected_billing_date' => 'nullable|date_format:Y-m-d',
            'next_billing_date' => 'nullable|date',
            'amount' => 'nullable|numeric|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:500',
        ]);

        $sub = DB::transaction(function () use ($data, $request, $id) {
            $sub = Subscription::lockForUpdate()->findOrFail($id);
            $oldDate = $sub->next_billing_date?->format('Y-m-d');
            if (!empty($data['expected_billing_date']) && $data['expected_billing_date'] !== $oldDate) {
                abort(409, 'This subscription was already renewed. Reload before renewing again.');
            }
            $newDate = !empty($data['next_billing_date'])
                ? Carbon::parse($data['next_billing_date'])
                : $sub->calculateNextBillingDate();
            $actualAmount = $data['amount'] ?? $sub->amount;

            // If variable amount, log the actual billing amount as a SubscriptionBilling record for history
            if ($sub->is_variable_amount || array_key_exists('amount', $data)) {
                $billingDate = $oldDate ?? now()->format('Y-m-d');
                $exists = \App\Models\SubscriptionBilling::where('subscription_id', $sub->id)
                    ->where('billing_date', $billingDate)->exists();
                if ($exists && !empty($data['expected_billing_date'])) {
                    abort(409, 'A billing record already exists for this cycle.');
                }
                \App\Models\SubscriptionBilling::create([
                    'subscription_id' => $sub->id,
                    'billing_date' => $billingDate,
                    'due_date' => $newDate->format('Y-m-d'),
                    'amount' => $actualAmount,
                    'paid_amount' => $data['paid_amount'] ?? null,
                    'status' => isset($data['paid_amount']) && $data['paid_amount'] >= $actualAmount ? 'paid' : 'pending',
                    'notes' => $data['notes'] ?? ($sub->is_variable_amount ? 'Variable amount billing' : null),
                    'created_by' => $request->user()->id,
                ]);
                // For variable, update the subscription's amount to the latest actual for next cycle reference, but keep estimated
                if ($sub->is_variable_amount) {
                    $sub->update(['estimated_amount' => $actualAmount]);
                }
            }

            $sub->update([
                'next_billing_date' => $newDate->format('Y-m-d'),
                'amount' => $actualAmount,
                'status' => $sub->status === 'paused' ? 'active' : $sub->status,
            ]);

            return $sub;
        }, 3);

        return $this->success(
            $sub->load(['category','creator','billings']),
            'Subscription renewed, next billing: '.$sub->next_billing_date->format('Y-m-d')
        );
    }

    public function billings(Request $request, $id)
    {
        $sub = Subscription::findOrFail($id);
        $billings = $sub->billings()->orderBy('billing_date','desc')->paginate($request->get('per_page', 15));
        return $this->success($billings);
    }

    public function storeBilling(Request $request, $id)
    {
        $sub = Subscription::findOrFail($id);
        $request->validate([
            'billing_date' => 'required|date',
            'due_date' => 'nullable|date',
            'amount' => 'required|numeric|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
            'status' => 'nullable|string|in:pending,paid,overdue,cancelled',
            'notes' => 'nullable|string|max:500',
        ]);
        $billing = \App\Models\SubscriptionBilling::create([
            'subscription_id' => $sub->id,
            'billing_date' => $request->billing_date,
            'due_date' => $request->due_date,
            'amount' => $request->amount,
            'paid_amount' => $request->paid_amount,
            'status' => $request->status ?? 'pending',
            'notes' => $request->notes,
            'created_by' => $request->user()->id,
        ]);
        // Update subscription next billing date to after this billing
        if ($request->filled('billing_date')) {
            $next = $sub->calculateNextBillingDate($request->billing_date);
            $sub->update(['next_billing_date' => $next->format('Y-m-d')]);
        }
        return $this->success($billing, 'Billing record created', 201);
    }

    public function pause($id)
    {
        $sub = Subscription::findOrFail($id);
        $sub->update(['status'=>'paused']);
        return $this->success($sub, 'Subscription paused');
    }

    public function resume($id)
    {
        $sub = Subscription::findOrFail($id);
        $sub->update(['status'=>'active']);
        return $this->success($sub, 'Subscription resumed');
    }

    private function toMonthlyAmount(Subscription $sub): float
    {
        $amount = (float) $sub->amount;
        $freq = max(1, (int) ($sub->billing_frequency ?: 1));

        return match ($sub->billing_cycle) {
            'weekly' => $amount * (52 / 12) / $freq,
            'fortnightly', 'biweekly' => $amount * (26 / 12) / $freq,
            'quarterly' => $amount / (3 * $freq),
            'yearly', 'annually' => $amount / (12 * $freq),
            default => $amount / $freq,
        };
    }
}
