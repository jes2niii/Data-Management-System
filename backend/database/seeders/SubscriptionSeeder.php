<?php

namespace Database\Seeders;

use App\Models\BillCategory;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class SubscriptionSeeder extends Seeder
{
    public function run(): void
    {
        if (Subscription::count() > 0) {
            $this->command->info("Subscriptions already seeded (" . Subscription::count() . "), skipping. Truncate subscriptions to re-seed.");
            return;
        }

        $admin = User::where('email','admin@admin.com')->first();
        $creatorId = $admin?->id ?? User::first()?->id;
        $categories = BillCategory::all()->keyBy('name');

        $samples = [
            ['name'=>'Adobe Creative Cloud','provider'=>'Adobe','category'=>'Subscriptions','amount'=>3499,'cycle'=>'monthly','freq'=>1,'start'=>Carbon::now()->subMonths(8),'status'=>'active','auto_renew'=>true,'payment'=>'Credit Card','is_variable'=>false],
            ['name'=>'Microsoft 365 Business','provider'=>'Microsoft','category'=>'Subscriptions','amount'=>5490,'cycle'=>'monthly','freq'=>1,'start'=>Carbon::now()->subMonths(10),'status'=>'active','auto_renew'=>true,'payment'=>'Credit Card','is_variable'=>false],
            ['name'=>'Slack Pro','provider'=>'Slack','category'=>'Subscriptions','amount'=>12000,'cycle'=>'yearly','freq'=>1,'start'=>Carbon::now()->subMonths(5),'status'=>'active','auto_renew'=>true,'payment'=>'Bank Transfer','is_variable'=>false],
            ['name'=>'Zoom Pro','provider'=>'Zoom','category'=>'Subscriptions','amount'=>899,'cycle'=>'monthly','freq'=>1,'start'=>Carbon::now()->subMonths(3),'status'=>'active','auto_renew'=>true,'payment'=>'Credit Card','is_variable'=>false],
            ['name'=>'GitHub Team','provider'=>'GitHub','category'=>'Subscriptions','amount'=>2100,'cycle'=>'monthly','freq'=>1,'start'=>Carbon::now()->subMonths(6),'status'=>'paused','auto_renew'=>false,'payment'=>'Credit Card','is_variable'=>false],
            ['name'=>'AWS EC2 t3.medium','provider'=>'AWS','category'=>'Subscriptions','amount'=>8500,'cycle'=>'monthly','freq'=>1,'start'=>Carbon::now()->subMonths(12),'status'=>'active','auto_renew'=>true,'payment'=>'Credit Card','is_variable'=>true,'estimated'=>8500,'variable_notes'=>'Based on usage - varies by hours'],
            ['name'=>'Business Permit Renewal','provider'=>'LGU Manila','category'=>'Licenses','amount'=>12500,'cycle'=>'yearly','freq'=>1,'start'=>Carbon::now()->subMonths(9),'status'=>'active','auto_renew'=>false,'payment'=>'Cash','is_variable'=>false],
            ['name'=>'Office Rent - Manila HQ','provider'=>'Ayala Land','category'=>'Office Rent','amount'=>45000,'cycle'=>'monthly','freq'=>1,'start'=>Carbon::now()->subMonths(14),'status'=>'active','auto_renew'=>true,'payment'=>'Check','is_variable'=>false],
            ['name'=>'PLDT Fiber 200 Mbps','provider'=>'PLDT','category'=>'Internet','amount'=>2999,'cycle'=>'monthly','freq'=>1,'start'=>Carbon::now()->subMonths(11),'status'=>'active','auto_renew'=>true,'payment'=>'Bank Transfer','is_variable'=>false],
            ['name'=>'Meralco Electricity','provider'=>'Meralco','category'=>'Electricity','amount'=>8900,'cycle'=>'monthly','freq'=>1,'start'=>Carbon::now()->subMonths(4),'status'=>'active','auto_renew'=>true,'payment'=>'Bank Transfer','is_variable'=>true,'estimated'=>8500,'variable_notes'=>'Varies by kWh consumption (meter reading)'],
            ['name'=>'Manila Water','provider'=>'Manila Water','category'=>'Water','amount'=>1850,'cycle'=>'monthly','freq'=>1,'start'=>Carbon::now()->subMonths(3),'status'=>'active','auto_renew'=>true,'payment'=>'Bank Transfer','is_variable'=>true,'estimated'=>1800,'variable_notes'=>'Varies by cubic meter usage'],
            ['name'=>'Canva Pro Team','provider'=>'Canva','category'=>'Subscriptions','amount'=>2990,'cycle'=>'yearly','freq'=>1,'start'=>Carbon::now()->subMonths(7),'status'=>'cancelled','auto_renew'=>false,'payment'=>'Credit Card','is_variable'=>false],
            ['name'=>'Notion Team','provider'=>'Notion','category'=>'Subscriptions','amount'=>2400,'cycle'=>'monthly','freq'=>1,'start'=>Carbon::now()->subMonths(2),'status'=>'trial','auto_renew'=>true,'payment'=>'Credit Card','is_variable'=>false],
        ];

        $created = 0;
        foreach ($samples as $s) {
            $cat = $categories[$s['category']] ?? $categories['Others'];
            $start = $s['start'];
            // Calculate next_billing_date based on cycle
            $next = clone $start;
            while ($next->lte(Carbon::now())) {
                switch ($s['cycle']) {
                    case 'weekly': $next->addWeeks($s['freq']); break;
                    case 'quarterly': $next->addMonths(3*$s['freq']); break;
                    case 'yearly': $next->addYears($s['freq']); break;
                    default: $next->addMonths($s['freq']); break;
                }
            }
            // Make some upcoming within 7 days, some overdue
            if ($s['status'] === 'active' && rand(1,10) <= 3) {
                $next = Carbon::now()->addDays(rand(1,6)); // upcoming 7 days
            }
            if ($s['status'] === 'active' && $s['name'] === 'Meralco Electricity') {
                $next = Carbon::now()->subDays(5); // overdue
            }

            Subscription::create([
                'name' => $s['name'],
                'bill_category_id' => $cat->id,
                'provider' => $s['provider'],
                'description' => $s['name'] . ' subscription' . (!empty($s['is_variable']) ? ' (variable amount)' : ''),
                'amount' => $s['amount'],
                'is_variable_amount' => $s['is_variable'] ?? false,
                'estimated_amount' => $s['estimated'] ?? null,
                'variable_notes' => $s['variable_notes'] ?? null,
                'billing_cycle' => $s['cycle'],
                'billing_frequency' => $s['freq'],
                'start_date' => $start->format('Y-m-d'),
                'next_billing_date' => $next->format('Y-m-d'),
                'status' => $s['status'],
                'auto_renew' => $s['auto_renew'],
                'payment_method' => $s['payment'],
                'reference_number' => strtoupper(substr(md5($s['name']),0,6)) . '-' . rand(1000,9999),
                'notes' => $s['status'] === 'cancelled' ? 'Cancelled last month' : ($s['status']==='trial' ? 'Trial ends soon' : (!empty($s['is_variable']) ? 'Amount varies per billing' : '')),
                'created_by' => $creatorId,
            ]);
            $created++;
        }

        $this->command->info("Seeded {$created} subscriptions. Total: " . Subscription::count());
        $this->command->info("Stats: " . json_encode(Subscription::selectRaw('status, COUNT(*) as c')->groupBy('status')->pluck('c','status')->toArray()));
    }
}
