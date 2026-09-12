<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\InventoryCategory;
use App\Models\InventoryItem;
use App\Models\InventorySupplier;
use App\Models\InventoryTransaction;
use App\Models\User;
use Illuminate\Database\Seeder;

class InventorySeeder extends Seeder
{
    public function run(): void
    {
        if (InventoryItem::count() > 0) {
            $this->command->info("Inventory items already seeded (" . InventoryItem::count() . "), skipping. Truncate inventory_items to re-seed.");
            return;
        }

        $admin = User::where('email','admin@admin.com')->first();
        $creatorId = $admin?->id ?? User::first()?->id;

        // Ensure Supply Chain department exists
        $supplyDept = Department::firstOrCreate(
            ['name' => 'Supply Chain'],
            ['code' => 'SUPP', 'is_active' => true]
        );
        $this->command->info("Supply Chain department: {$supplyDept->id}");

        // Categories
        $categoriesData = [
            ['name'=>'Office Supplies','slug'=>'office-supplies','description'=>'Pens, paper, toner, etc.','icon'=>'Package','sort_order'=>1],
            ['name'=>'Raw Materials','slug'=>'raw-materials','description'=>'Steel, lumber, etc.','icon'=>'Factory','sort_order'=>2],
            ['name'=>'Spare Parts','slug'=>'spare-parts','description'=>'Machine parts','icon'=>'Wrench','sort_order'=>3],
            ['name'=>'Safety Equipment','slug'=>'safety-equipment','description'=>'Helmets, gloves, vests','icon'=>'Shield','sort_order'=>4],
            ['name'=>'IT Equipment','slug'=>'it-equipment','description'=>'Laptops, monitors','icon'=>'Monitor','sort_order'=>5],
            ['name'=>'Cleaning Supplies','slug'=>'cleaning-supplies','description'=>'Detergents, mops','icon'=>'Sparkles','sort_order'=>6],
        ];
        $categories = [];
        foreach ($categoriesData as $c) {
            $cat = InventoryCategory::firstOrCreate(['name'=>$c['name']], $c);
            $categories[$c['name']] = $cat;
        }

        // Suppliers
        $suppliersData = [
            ['name'=>'National Book Store','code'=>'NBS','contact_person'=>'John Cruz','email'=>'orders@nbs.com','phone'=>'02-81234567'],
            ['name'=>'MC Home Depot','code'=>'MCHD','contact_person'=>'Ana Reyes','email'=>'sales@mchomedepot.com','phone'=>'02-82345678'],
            ['name'=>'Cebu Steel Corp','code'=>'CSC','contact_person'=>'Roberto Lim','email'=>'sales@cebusteel.com','phone'=>'032-2345678'],
            ['name'=>'Safety First PH','code'=>'SFP','contact_person'=>'Liza Tan','email'=>'info@safetyfirstph.com','phone'=>'02-83456789'],
            ['name'=>'Thinking Tools','code'=>'TT','contact_person'=>'Mark Lee','email'=>'sales@thinkingtools.com','phone'=>'02-84567890'],
        ];
        $suppliers = [];
        foreach ($suppliersData as $s) {
            $sup = InventorySupplier::firstOrCreate(['name'=>$s['name']], $s);
            $suppliers[$s['name']] = $sup;
        }

        // Items - realistic supply chain inventory
        $items = [
            ['sku'=>'OFF-001','name'=>'A4 Bond Paper 80gsm','category'=>'Office Supplies','supplier'=>'National Book Store','qty'=>45,'unit'=>'ream','location'=>'Warehouse A - Shelf 1','reorder'=>20,'cost'=>220,'dept'=>'Supply Chain'],
            ['sku'=>'OFF-002','name'=>'Ballpoint Pen - Black','category'=>'Office Supplies','supplier'=>'National Book Store','qty'=>8,'unit'=>'box','location'=>'Warehouse A - Shelf 1','reorder'=>15,'cost'=>180,'dept'=>'Supply Chain'],
            ['sku'=>'OFF-003','name'=>'Toner Cartridge HP 85A','category'=>'Office Supplies','supplier'=>'National Book Store','qty'=>3,'unit'=>'pcs','location'=>'Warehouse A - Shelf 2','reorder'=>5,'cost'=>3200,'dept'=>'Supply Chain'],
            ['sku'=>'OFF-004','name'=>'Stapler Heavy Duty','category'=>'Office Supplies','supplier'=>'National Book Store','qty'=>25,'unit'=>'pcs','location'=>'Warehouse A - Shelf 2','reorder'=>10,'cost'=>450,'dept'=>'Supply Chain'],
            ['sku'=>'RAW-001','name'=>'Steel Plate 10mm','category'=>'Raw Materials','supplier'=>'Cebu Steel Corp','qty'=>120,'unit'=>'pcs','location'=>'Yard - Zone 1','reorder'=>50,'cost'=>1800,'dept'=>'Supply Chain'],
            ['sku'=>'RAW-002','name'=>'Lumber 2x4x8','category'=>'Raw Materials','supplier'=>'MC Home Depot','qty'=>5,'unit'=>'pcs','location'=>'Yard - Zone 2','reorder'=>20,'cost'=>450,'dept'=>'Supply Chain'],
            ['sku'=>'RAW-003','name'=>'Cement Bag 40kg','category'=>'Raw Materials','supplier'=>'MC Home Depot','qty'=>85,'unit'=>'bag','location'=>'Warehouse B','reorder'=>30,'cost'=>280,'dept'=>'Supply Chain'],
            ['sku'=>'SPR-001','name'=>'Bearing 6205','category'=>'Spare Parts','supplier'=>'MC Home Depot','qty'=>12,'unit'=>'pcs','location'=>'Warehouse C - Bin 5','reorder'=>15,'cost'=>850,'dept'=>'Supply Chain'],
            ['sku'=>'SPR-002','name'=>'V-Belt B68','category'=>'Spare Parts','supplier'=>'MC Home Depot','qty'=>0,'unit'=>'pcs','location'=>'Warehouse C - Bin 6','reorder'=>10,'cost'=>650,'dept'=>'Supply Chain'],
            ['sku'=>'SPR-003','name'=>'Motor Oil 4L','category'=>'Spare Parts','supplier'=>'Cebu Steel Corp','qty'=>22,'unit'=>'bottle','location'=>'Warehouse C','reorder'=>10,'cost'=>1200,'dept'=>'Supply Chain'],
            ['sku'=>'SAF-001','name'=>'Hard Hat - White','category'=>'Safety Equipment','supplier'=>'Safety First PH','qty'=>35,'unit'=>'pcs','location'=>'Safety Room','reorder'=>20,'cost'=>350,'dept'=>'Supply Chain'],
            ['sku'=>'SAF-002','name'=>'Safety Gloves - Large','category'=>'Safety Equipment','supplier'=>'Safety First PH','qty'=>7,'unit'=>'pair','location'=>'Safety Room','reorder'=>15,'cost'=>180,'dept'=>'Supply Chain'],
            ['sku'=>'SAF-003','name'=>'Safety Vest - Orange','category'=>'Safety Equipment','supplier'=>'Safety First PH','qty'=>18,'unit'=>'pcs','location'=>'Safety Room','reorder'=>10,'cost'=>280,'dept'=>'Supply Chain'],
            ['sku'=>'IT-001','name'=>'Laptop Dell Latitude 5540','category'=>'IT Equipment','supplier'=>'Thinking Tools','qty'=>4,'unit'=>'pcs','location'=>'IT Stockroom','reorder'=>3,'cost'=>65000,'dept'=>'Supply Chain'],
            ['sku'=>'IT-002','name'=>'Monitor 24" Dell','category'=>'IT Equipment','supplier'=>'Thinking Tools','qty'=>2,'unit'=>'pcs','location'=>'IT Stockroom','reorder'=>5,'cost'=>8500,'dept'=>'Supply Chain'],
            ['sku'=>'IT-003','name'=>'Wireless Mouse Logitech','category'=>'IT Equipment','supplier'=>'Thinking Tools','qty'=>28,'unit'=>'pcs','location'=>'IT Stockroom','reorder'=>10,'cost'=>850,'dept'=>'Supply Chain'],
            ['sku'=>'CLN-001','name'=>'Detergent Powder 10kg','category'=>'Cleaning Supplies','supplier'=>'Safety First PH','qty'=>15,'unit'=>'sack','location'=>'Janitorial','reorder'=>8,'cost'=>580,'dept'=>'Supply Chain'],
            ['sku'=>'CLN-002','name'=>'Mop Head','category'=>'Cleaning Supplies','supplier'=>'Safety First PH','qty'=>6,'unit'=>'pcs','location'=>'Janitorial','reorder'=>10,'cost'=>180,'dept'=>'Supply Chain'],
            ['sku'=>'CLN-003','name'=>'Trash Bag XL','category'=>'Cleaning Supplies','supplier'=>'Safety First PH','qty'=>50,'unit'=>'roll','location'=>'Janitorial','reorder'=>20,'cost'=>120,'dept'=>'Supply Chain'],
            ['sku'=>'OFF-005','name'=>'Folder Long Brown','category'=>'Office Supplies','supplier'=>'National Book Store','qty'=>100,'unit'=>'pcs','location'=>'Warehouse A','reorder'=>30,'cost'=>12,'dept'=>'Supply Chain'],
        ];

        $created = 0;
        foreach ($items as $it) {
            $cat = $categories[$it['category']] ?? null;
            $sup = $suppliers[$it['supplier']] ?? null;
            $dept = $supplyDept;
            $item = InventoryItem::create([
                'sku' => $it['sku'],
                'name' => $it['name'],
                'description' => $it['name'] . ' for Supply Chain',
                'inventory_category_id' => $cat?->id,
                'supplier_id' => $sup?->id,
                'department_id' => $dept->id,
                'quantity' => $it['qty'],
                'unit' => $it['unit'],
                'location' => $it['location'],
                'reorder_point' => $it['reorder'],
                'unit_cost' => $it['cost'],
                'notes' => 'Initial stock for Supply Chain Management Department',
                'created_by' => $creatorId,
                'updated_by' => $creatorId,
            ]);
            // Create initial transaction
            if ($it['qty'] > 0) {
                InventoryTransaction::create([
                    'inventory_item_id' => $item->id,
                    'type' => 'in',
                    'quantity' => $it['qty'],
                    'balance_after' => $it['qty'],
                    'unit_cost' => $it['cost'],
                    'reference_number' => 'INIT-'.$it['sku'],
                    'notes' => 'Initial stock',
                    'created_by' => $creatorId,
                ]);
            }
            $created++;
        }

        $this->command->info("Seeded {$created} inventory items for Supply Chain Management Department. Categories: ".InventoryCategory::count().", Suppliers: ".InventorySupplier::count());
        $this->command->info("Low stock: ".InventoryItem::where('status','low_stock')->count()." Out of stock: ".InventoryItem::where('status','out_of_stock')->count()." Total value: ".number_format(InventoryItem::sum('total_value'),2));
    }
}
