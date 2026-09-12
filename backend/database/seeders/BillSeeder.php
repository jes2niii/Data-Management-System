<?php

namespace Database\Seeders;

use App\Models\Bill;
use App\Models\BillCategory;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class BillSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('email', 'admin@admin.com')->first();
        $creatorId = $admin?->id ?? User::first()?->id;

        if (Bill::count() > 0) {
            $this->command->info("Bills already seeded (" . Bill::count() . " records), skipping to avoid duplicates. Truncate bills table to re-seed.");
            return;
        }

        $categories = BillCategory::all()->keyBy('name');

        $samples = [
            // Internet - PLDT, Globe
            ['name' => 'PLDT Internet - Main Office', 'category' => 'Internet', 'provider' => 'PLDT', 'amount' => 2999, 'billing_date' => Carbon::now()->subMonths(2)->startOfMonth()->addDays(5), 'due_days' => 15, 'status' => 'paid', 'payment_method' => 'Bank Transfer', 'notes' => '200 Mbps fiber'],
            ['name' => 'PLDT Internet - Main Office', 'category' => 'Internet', 'provider' => 'PLDT', 'amount' => 2999, 'billing_date' => Carbon::now()->subMonths(1)->startOfMonth()->addDays(5), 'due_days' => 15, 'status' => 'paid', 'payment_method' => 'Bank Transfer', 'notes' => '200 Mbps fiber'],
            ['name' => 'PLDT Internet - Main Office', 'category' => 'Internet', 'provider' => 'PLDT', 'amount' => 2999, 'billing_date' => Carbon::now()->startOfMonth()->addDays(5), 'due_days' => 15, 'status' => 'pending', 'payment_method' => null, 'notes' => 'Current month'],
            ['name' => 'Globe Internet - Branch', 'category' => 'Internet', 'provider' => 'Globe', 'amount' => 1899, 'billing_date' => Carbon::now()->subMonths(1)->startOfMonth()->addDays(8), 'due_days' => 12, 'status' => 'paid', 'payment_method' => 'Credit Card', 'notes' => 'Branch office 100 Mbps'],
            ['name' => 'Converge Internet - Naga', 'category' => 'Internet', 'provider' => 'Converge', 'amount' => 2500, 'billing_date' => Carbon::now()->startOfMonth()->addDays(8), 'due_days' => 12, 'status' => 'pending', 'payment_method' => null, 'notes' => 'Naga site'],

            // Electricity
            ['name' => 'Meralco Electricity - Main', 'category' => 'Electricity', 'provider' => 'Meralco', 'amount' => 8750.50, 'billing_date' => Carbon::now()->subMonths(2)->startOfMonth()->addDays(10), 'due_days' => 10, 'status' => 'paid', 'payment_method' => 'Bank Transfer', 'notes' => 'July consumption 623 kWh'],
            ['name' => 'Meralco Electricity - Main', 'category' => 'Electricity', 'provider' => 'Meralco', 'amount' => 9230.75, 'billing_date' => Carbon::now()->subMonths(1)->startOfMonth()->addDays(10), 'due_days' => 10, 'status' => 'paid', 'payment_method' => 'Bank Transfer', 'notes' => 'Aug consumption 658 kWh'],
            ['name' => 'Meralco Electricity - Main', 'category' => 'Electricity', 'provider' => 'Meralco', 'amount' => 8890.00, 'billing_date' => Carbon::now()->startOfMonth()->addDays(10), 'due_days' => 10, 'status' => 'pending', 'payment_method' => null, 'notes' => 'Sep estimate'],
            ['name' => 'CANORECO Electricity - Naga', 'category' => 'Electricity', 'provider' => 'CANORECO', 'amount' => 5420.00, 'billing_date' => Carbon::now()->subMonths(1)->startOfMonth()->addDays(12), 'due_days' => 10, 'status' => 'overdue', 'payment_method' => null, 'notes' => 'Overdue 15 days'],

            // Water
            ['name' => 'Manila Water - Main', 'category' => 'Water', 'provider' => 'Manila Water', 'amount' => 1850.25, 'billing_date' => Carbon::now()->subMonths(1)->startOfMonth()->addDays(15), 'due_days' => 10, 'status' => 'paid', 'payment_method' => 'Cash', 'notes' => '45 cu.m'],
            ['name' => 'Manila Water - Main', 'category' => 'Water', 'provider' => 'Manila Water', 'amount' => 1920.00, 'billing_date' => Carbon::now()->startOfMonth()->addDays(15), 'due_days' => 10, 'status' => 'pending', 'payment_method' => null, 'notes' => '48 cu.m'],
            ['name' => 'Prime Water - Legazpi', 'category' => 'Water', 'provider' => 'Prime Water', 'amount' => 1320.00, 'billing_date' => Carbon::now()->subMonths(2)->startOfMonth()->addDays(15), 'due_days' => 10, 'status' => 'paid', 'payment_method' => 'Cash', 'notes' => ''],

            // Office Rent
            ['name' => 'Office Rent - Manila HQ', 'category' => 'Office Rent', 'provider' => 'Ayala Land', 'amount' => 45000.00, 'billing_date' => Carbon::now()->subMonths(2)->startOfMonth()->addDays(1), 'due_days' => 5, 'status' => 'paid', 'payment_method' => 'Check', 'notes' => 'Floor 12, 120 sqm'],
            ['name' => 'Office Rent - Manila HQ', 'category' => 'Office Rent', 'provider' => 'Ayala Land', 'amount' => 45000.00, 'billing_date' => Carbon::now()->subMonths(1)->startOfMonth()->addDays(1), 'due_days' => 5, 'status' => 'paid', 'payment_method' => 'Check', 'notes' => 'Floor 12'],
            ['name' => 'Office Rent - Manila HQ', 'category' => 'Office Rent', 'provider' => 'Ayala Land', 'amount' => 45000.00, 'billing_date' => Carbon::now()->startOfMonth()->addDays(1), 'due_days' => 5, 'status' => 'pending', 'payment_method' => null, 'notes' => 'Sep rent'],
            ['name' => 'Office Rent - Naga Branch', 'category' => 'Office Rent', 'provider' => 'Local Landlord', 'amount' => 18000.00, 'billing_date' => Carbon::now()->startOfMonth()->addDays(3), 'due_days' => 7, 'status' => 'pending', 'payment_method' => null, 'notes' => 'Naga branch'],

            // Government Fees, Subscriptions, Licenses, Payroll, Taxes, Others
            ['name' => 'BIR Quarterly Tax', 'category' => 'Taxes', 'provider' => 'BIR', 'amount' => 28500.00, 'billing_date' => Carbon::now()->subMonths(1)->startOfMonth()->addDays(20), 'due_days' => 15, 'status' => 'paid', 'payment_method' => 'Bank Transfer', 'notes' => 'Q2 2026'],
            ['name' => 'SSS Contribution - Aug', 'category' => 'Government Fees', 'provider' => 'SSS', 'amount' => 18400.00, 'billing_date' => Carbon::now()->subMonths(1)->addDays(10), 'due_days' => 10, 'status' => 'paid', 'payment_method' => 'Online Payment', 'notes' => '18 employees'],
            ['name' => 'PhilHealth Contribution', 'category' => 'Government Fees', 'provider' => 'PhilHealth', 'amount' => 8750.00, 'billing_date' => Carbon::now()->subMonths(1)->addDays(10), 'due_days' => 10, 'status' => 'paid', 'payment_method' => 'Online Payment', 'notes' => ''],
            ['name' => 'Business Permit Renewal', 'category' => 'Licenses', 'provider' => 'LGU Manila', 'amount' => 12500.00, 'billing_date' => Carbon::now()->subMonths(3)->startOfMonth()->addDays(5), 'due_days' => 20, 'status' => 'paid', 'payment_method' => 'Cash', 'notes' => '2026 permit'],
            ['name' => 'Adobe Creative Cloud', 'category' => 'Subscriptions', 'provider' => 'Adobe', 'amount' => 3499.00, 'billing_date' => Carbon::now()->startOfMonth()->addDays(12), 'due_days' => 10, 'status' => 'pending', 'payment_method' => null, 'notes' => '5 licenses'],
            ['name' => 'Microsoft 365', 'category' => 'Subscriptions', 'provider' => 'Microsoft', 'amount' => 5490.00, 'billing_date' => Carbon::now()->subMonths(1)->startOfMonth()->addDays(12), 'due_days' => 10, 'status' => 'paid', 'payment_method' => 'Credit Card', 'notes' => 'Business Standard'],
            ['name' => 'Payroll - August 2026', 'category' => 'Payroll', 'provider' => 'HR Payroll', 'amount' => 185000.00, 'billing_date' => Carbon::now()->subMonths(1)->endOfMonth()->subDays(5), 'due_days' => 5, 'status' => 'paid', 'payment_method' => 'Bank Transfer', 'notes' => '22 employees'],
            ['name' => 'Payroll - September 2026', 'category' => 'Payroll', 'provider' => 'HR Payroll', 'amount' => 185000.00, 'billing_date' => Carbon::now()->endOfMonth()->subDays(5), 'due_days' => 5, 'status' => 'pending', 'payment_method' => null, 'notes' => '22 employees'],
            ['name' => 'Office Supplies', 'category' => 'Others', 'provider' => 'National Bookstore', 'amount' => 3250.75, 'billing_date' => Carbon::now()->subDays(12), 'due_days' => 7, 'status' => 'paid', 'payment_method' => 'Cash', 'notes' => 'Toner, paper, pens'],
            ['name' => 'Security Service - Sep', 'category' => 'Others', 'provider' => 'Safeguard Agency', 'amount' => 22000.00, 'billing_date' => Carbon::now()->startOfMonth()->addDays(2), 'due_days' => 10, 'status' => 'pending', 'payment_method' => null, 'notes' => '3 guards'],
            ['name' => 'Janitorial Service', 'category' => 'Others', 'provider' => 'CleanPro', 'amount' => 15000.00, 'billing_date' => Carbon::now()->subMonths(1)->startOfMonth()->addDays(2), 'due_days' => 10, 'status' => 'overdue', 'payment_method' => null, 'notes' => 'Overdue - follow up'],
            ['name' => 'BIR Annual Registration', 'category' => 'Taxes', 'provider' => 'BIR', 'amount' => 500.00, 'billing_date' => Carbon::now()->subMonths(4)->startOfMonth()->addDays(10), 'due_days' => 15, 'status' => 'cancelled', 'payment_method' => null, 'notes' => 'Cancelled - duplicate'],
        ];

        $created = 0;
        foreach ($samples as $s) {
            $category = $categories[$s['category']] ?? $categories['Others'];
            $billingDate = $s['billing_date'];
            $dueDate = (clone $billingDate)->addDays($s['due_days']);
            $paymentDate = null;
            if ($s['status'] === 'paid') {
                $paymentDate = (clone $dueDate)->subDays(rand(0, 3));
            } elseif ($s['status'] === 'overdue') {
                // keep payment_date null, due_date in past already
            }

            Bill::create([
                'name' => $s['name'],
                'bill_category_id' => $category->id,
                'provider' => $s['provider'],
                'reference_number' => strtoupper(Str::random(3)) . '-' . rand(10000, 99999),
                'amount' => $s['amount'],
                'billing_date' => $billingDate->format('Y-m-d'),
                'due_date' => $dueDate->format('Y-m-d'),
                'payment_date' => $paymentDate ? $paymentDate->format('Y-m-d') : null,
                'status' => $s['status'],
                'payment_method' => $s['payment_method'],
                'notes' => $s['notes'],
                'created_by' => $creatorId,
            ]);
            $created++;
        }

        $this->command->info("Seeded {$created} sample bills across " . $categories->count() . " categories. Total bills: " . Bill::count());
        $this->command->info("Status breakdown: " . json_encode(Bill::selectRaw('status, COUNT(*) as c')->groupBy('status')->pluck('c','status')->toArray()));
    }
}
