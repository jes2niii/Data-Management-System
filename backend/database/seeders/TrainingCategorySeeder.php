<?php

namespace Database\Seeders;

use App\Models\TrainingCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TrainingCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['id'=>3,'name'=>'STCW','slug'=>'stcw','description'=>null,'icon'=>null,'sort_order'=>0,'is_active'=>1,'created_at'=>'2026-06-26 01:23:53','updated_at'=>'2026-06-26 01:23:53'],
            ['id'=>4,'name'=>'IN HOUSE','slug'=>'in-house','description'=>null,'icon'=>null,'sort_order'=>0,'is_active'=>1,'created_at'=>'2026-06-26 01:24:01','updated_at'=>'2026-06-26 01:24:01'],
            ['id'=>5,'name'=>'DOMESTIC','slug'=>'domestic','description'=>null,'icon'=>null,'sort_order'=>0,'is_active'=>1,'created_at'=>'2026-06-26 01:24:54','updated_at'=>'2026-07-22 06:52:31'],
        ];

        foreach ($categories as $cat) {
            DB::table('training_categories')->updateOrInsert(
                ['id' => $cat['id']],
                [
                    'name' => $cat['name'],
                    'slug' => $cat['slug'],
                    'description' => $cat['description'],
                    'icon' => $cat['icon'],
                    'sort_order' => $cat['sort_order'],
                    'is_active' => $cat['is_active'],
                    'created_at' => $cat['created_at'],
                    'updated_at' => $cat['updated_at'],
                ]
            );
        }

        // Fix auto-increment
        $maxId = DB::table('training_categories')->max('id');
        DB::statement("ALTER TABLE training_categories AUTO_INCREMENT = " . ($maxId + 1));

        $this->command->info("Seeded " . count($categories) . " training categories (STCW, IN HOUSE, DOMESTIC). Total: " . TrainingCategory::count());
    }
}
