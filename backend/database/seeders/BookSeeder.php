<?php

namespace Database\Seeders;

use App\Models\BookCategory;
use App\Models\BookInventory;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class BookSeeder extends Seeder
{
    public function run(): void
    {
        $adminId = User::where('email','admin@admin.com')->first()?->id ?? 1;

        // Default Categories for Records Department - user can add/edit/customize
        $categories = [
            ['name'=>'References','slug'=>'references','description'=>'Main references / titles','icon'=>'BookOpen','sort_order'=>1],
            ['name'=>'Bibliography','slug'=>'bibliography','description'=>'Bibliography collection','icon'=>'Library','sort_order'=>2],
            ['name'=>'Teaching Aids','slug'=>'teaching-aids','description'=>'Teaching aids and manuals','icon'=>'GraduationCap','sort_order'=>3],
        ];
        foreach ($categories as $cat) {
            BookCategory::firstOrCreate(['name'=>$cat['name']], array_merge($cat, ['is_active'=>true,'created_by'=>$adminId]));
        }
        $catMap = BookCategory::all()->keyBy('name');

        if (BookInventory::count() > 0) {
            $this->command->info("Books already seeded (" . BookInventory::count() . "), skipping. Truncate book_inventories to re-seed.");
            return;
        }

        $books = [
            ['title'=>'International Convention for the Safety of Life at Sea (SOLAS) Consolidated Edition','category'=>'References','references'=>'IMO-110E','alt'=>'SOLAS 2022; IMO SOLAS','link'=>'https://www.imo.org/en/OurWork/Safety/Pages/SOLAS.aspx','author'=>'IMO','publisher'=>'IMO Publishing','year'=>'2022','description'=>'Consolidated SOLAS text for Records Department'],
            ['title'=>'MARPOL 73/78 Consolidated Edition','category'=>'References','references'=>'IMO-520E','alt'=>'MARPOL Annex I-VI','link'=>'https://www.imo.org/en/OurWork/Environment/Pages/Outlook.aspx','author'=>'IMO','publisher'=>'IMO Publishing','year'=>'2021','description'=>'Prevention of pollution from ships'],
            ['title'=>'STCW Convention and Code','category'=>'References','references'=>'IMO-938E','alt'=>'STCW 2010 Manila Amendments','link'=>null,'author'=>'IMO','publisher'=>'IMO Publishing','year'=>'2017','description'=>'Seafarer training and watchkeeping'],
            ['title'=>'Bridge Team Management','category'=>'Bibliography','references'=>'NTI-BTM-001','alt'=>'BTM; Bridge Resource Management','link'=>null,'author'=>'A.J. Swift','publisher'=>'Nautical Institute','year'=>'2020','description'=>'Bridge teamwork and resource management'],
            ['title'=>'Marine Engineering Knowledge Vol. 1','category'=>'Bibliography','references'=>'MEK-001','alt'=>'Reeds Marine Engineering','link'=>null,'author'=>'Thomas D. Morton','publisher'=>'Reeds','year'=>'2019','description'=>'General engineering knowledge for MLC'],
            ['title'=>'Ship Handling for the Mariner','category'=>'Bibliography','references'=>'SH-007','alt'=>'Shiphandling; Williamson','link'=>null,'author'=>'Daniel H. MacElrevey','publisher'=>'Cornell Maritime Press','year'=>'2018','description'=>'Ship handling theory'],
            ['title'=>'ISPS Code - International Ship and Port Facility Security Code','category'=>'References','references'=>'IMO-136E','alt'=>'ISPS; Security Level','link'=>null,'author'=>'IMO','publisher'=>'IMO Publishing','year'=>'2021','description'=>'Security for ships and ports'],
            ['title'=>'Crowd Management Training Manual','category'=>'Teaching Aids','references'=>'CMT-003','alt'=>'CCMD; Crowd & Crisis','link'=>null,'author'=>'Seatech','publisher'=>'Seatech Training','year'=>'2023','description'=>'Passenger ship crowd management'],
        ];

        $created = 0;
        foreach ($books as $b) {
            $cat = $catMap[$b['category']] ?? null;
            BookInventory::create([
                'title'=>$b['title'],
                'book_category_id'=>$cat?->id,
                'references'=>$b['references'],
                'alternative_references'=>$b['alt'],
                'link'=>$b['link'],
                'description'=>$b['description'],
                'author'=>$b['author'],
                'publisher'=>$b['publisher'],
                'year'=>$b['year'],
                'is_active'=>true,
                'created_by'=>$adminId,
                'updated_by'=>$adminId,
            ]);
            $created++;
        }

        // Fix auto-increment
        $maxId = \Illuminate\Support\Facades\DB::table('book_inventories')->max('id');
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE book_inventories AUTO_INCREMENT = " . ($maxId + 1));

        $this->command->info("Seeded {$created} books across " . BookCategory::count() . " categories. Total books: " . BookInventory::count());
    }
}
