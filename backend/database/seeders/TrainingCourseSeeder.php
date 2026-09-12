<?php

namespace Database\Seeders;

use App\Models\Training;
use App\Models\TrainingPriceLog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TrainingCourseSeeder extends Seeder
{
    public function run(): void
    {
        $adminId = \App\Models\User::where('email', 'admin@admin.com')->first()?->id;

        $courses = [
            ['id'=>2,'category_id'=>3,'code'=>'MEFA','title'=>'Medical First Aid','slug'=>'medical-first-aid','description'=>null,'duration'=>'4 days','fee'=>1700.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 01:27:59','updated_at'=>'2026-06-26 01:38:00'],
            ['id'=>3,'category_id'=>3,'code'=>'MECA','title'=>'Medical Care','slug'=>'medical-care','description'=>null,'duration'=>'5 days','fee'=>2800.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 01:31:58','updated_at'=>'2026-06-26 01:37:52'],
            ['id'=>4,'category_id'=>3,'code'=>'SSO','title'=>'Ship Security Officer','slug'=>'ship-security-officer','description'=>null,'duration'=>'3 days','fee'=>1100.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 01:32:45','updated_at'=>'2026-06-26 01:37:38'],
            ['id'=>5,'category_id'=>3,'code'=>'SAT-SDSD','title'=>'Security Awareness Training and Seafarers with Designated Security Duties','slug'=>'security-awareness-training-and-seafarers-with-designated-security-duties','description'=>null,'duration'=>'1 day','fee'=>800.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 01:33:49','updated_at'=>'2026-06-26 01:37:28'],
            ['id'=>6,'category_id'=>3,'code'=>'STPPDS','title'=>'Safety Training for Personnel Providing Direct Service to Passengers in Passenger Spaces','slug'=>'safety-training-for-personnel-providing-direct-service-to-passengers-in-passenger-spaces','description'=>null,'duration'=>'1 day','fee'=>1400.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 01:37:10','updated_at'=>'2026-06-26 01:37:10'],
            ['id'=>7,'category_id'=>3,'code'=>'PSCMT','title'=>'Passenger Ship Crowd Management Training','slug'=>'passenger-ship-crowd-management-training','description'=>null,'duration'=>'2 days','fee'=>1700.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 01:40:31','updated_at'=>'2026-06-26 01:40:31'],
            ['id'=>8,'category_id'=>3,'code'=>'PSCMHBT','title'=>'Passenger Ship Crisis Management and Human Behavior Training','slug'=>'passenger-ship-crisis-management-and-human-behavior-training','description'=>null,'duration'=>'2 days','fee'=>1700.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 01:41:52','updated_at'=>'2026-06-26 01:41:52'],
            ['id'=>9,'category_id'=>3,'code'=>'UCBT-PSSR','title'=>'Updating course on Basic Training Personal Safety and Social Responsibilities','slug'=>'updating-course-on-basic-training-personal-safety-and-social-responsibilities','description'=>null,'duration'=>'1 day','fee'=>1200.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 01:46:18','updated_at'=>'2026-06-26 01:46:18'],
            ['id'=>10,'category_id'=>3,'code'=>'MLCD F1','title'=>'Navigation at the Operational Level','slug'=>'navigation-at-the-operational-level','description'=>null,'duration'=>'14 days','fee'=>15000.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 02:53:30','updated_at'=>'2026-06-26 02:53:30'],
            ['id'=>11,'category_id'=>3,'code'=>'MLCD F2','title'=>'Cargo Handling and Stowage','slug'=>'cargo-handling-and-stowage','description'=>null,'duration'=>'4 days','fee'=>5000.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 02:54:20','updated_at'=>'2026-06-26 02:54:20'],
            ['id'=>12,'category_id'=>3,'code'=>'MLCD F3','title'=>'Controlling the Operation of the Ship & Care for Persons on Board','slug'=>'controlling-the-operation-of-the-ship-care-for-persons-on-board','description'=>null,'duration'=>'7 days','fee'=>9000.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 02:57:16','updated_at'=>'2026-06-26 02:57:16'],
            ['id'=>13,'category_id'=>5,'code'=>'CCMD','title'=>'Crowd & Crisis Management for Personnel Serving','slug'=>'crowd-crisis-management-for-personnel-serving','description'=>null,'duration'=>'3 days','fee'=>2600.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 03:02:06','updated_at'=>'2026-06-26 03:02:06'],
            ['id'=>14,'category_id'=>5,'code'=>'SNCR','title'=>'Safe Navigation & Collision Regulation','slug'=>'safe-navigation-collision-regulation','description'=>null,'duration'=>'3 days','fee'=>3600.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 03:02:50','updated_at'=>'2026-06-26 03:02:50'],
            ['id'=>15,'category_id'=>5,'code'=>'DWK','title'=>'Deck Watchkeeping in Domestic Regulation','slug'=>'deck-watchkeeping-in-domestic-regulation','description'=>null,'duration'=>'2 days','fee'=>2200.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 03:04:48','updated_at'=>'2026-06-26 03:04:48'],
            ['id'=>16,'category_id'=>5,'code'=>'EWK','title'=>'Engine Watchkeeping in the Domestic Trade','slug'=>'engine-watchkeeping-in-the-domestic-trade','description'=>null,'duration'=>'2 days','fee'=>2200.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 03:05:29','updated_at'=>'2026-06-26 03:05:29'],
            ['id'=>17,'category_id'=>5,'code'=>'SHSN 1','title'=>'Ship Handling & Safe Navigation 1','slug'=>'ship-handling-safe-navigation-1','description'=>null,'duration'=>'3 days','fee'=>4600.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 03:06:14','updated_at'=>'2026-06-26 03:06:14'],
            ['id'=>18,'category_id'=>5,'code'=>'SHSN 2','title'=>'Ship Handling & Safe Navigation 2','slug'=>'ship-handling-safe-navigation-2','description'=>null,'duration'=>'3 days','fee'=>4600.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 03:06:40','updated_at'=>'2026-06-26 03:06:40'],
            ['id'=>19,'category_id'=>5,'code'=>'SHSN 3','title'=>'Ship Handling & Safe Navigation 3','slug'=>'ship-handling-safe-navigation-3','description'=>null,'duration'=>'3 days','fee'=>4600.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 03:07:54','updated_at'=>'2026-06-26 03:07:54'],
            ['id'=>20,'category_id'=>5,'code'=>'EOM 1','title'=>'Engine Operation & Maintenance 1','slug'=>'engine-operation-maintenance-1','description'=>null,'duration'=>'3 days','fee'=>4600.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 03:08:30','updated_at'=>'2026-06-26 03:08:30'],
            ['id'=>21,'category_id'=>5,'code'=>'EOM 2','title'=>'Engine Operation & Maintenance 2','slug'=>'engine-operation-maintenance-2','description'=>null,'duration'=>'3 days','fee'=>4600.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 03:08:52','updated_at'=>'2026-06-26 03:08:52'],
            ['id'=>22,'category_id'=>5,'code'=>'EOM 3','title'=>'Engine Operation & Maintenance 3','slug'=>'engine-operation-maintenance-3','description'=>null,'duration'=>'3 days','fee'=>4600.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 03:09:15','updated_at'=>'2026-06-26 03:09:15'],
            ['id'=>23,'category_id'=>5,'code'=>'RTCROP','title'=>'Radio Telephony Communications and Radar Observation Plotting','slug'=>'radio-telephony-communications-and-radar-observation-plotting','description'=>null,'duration'=>'10 days','fee'=>6200.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 08:38:05','updated_at'=>'2026-06-26 08:38:05'],
            ['id'=>24,'category_id'=>4,'code'=>'MAIRCA','title'=>'Marine Accident/Incident Investigation and Root Cause Analysis','slug'=>'marine-accidentincident-investigation-and-root-cause-analysis','description'=>null,'duration'=>'1 day','fee'=>1700.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 08:41:20','updated_at'=>'2026-06-26 08:41:20'],
            ['id'=>25,'category_id'=>4,'code'=>'APC','title'=>'Anti-Piracy Course','slug'=>'anti-piracy-course','description'=>null,'duration'=>'1 day','fee'=>800.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 08:42:07','updated_at'=>'2026-06-26 08:42:07'],
            ['id'=>26,'category_id'=>4,'code'=>'PSCC','title'=>'Port State Control Course','slug'=>'port-state-control-course','description'=>null,'duration'=>'2 days','fee'=>1000.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 08:42:31','updated_at'=>'2026-06-26 08:45:08'],
            ['id'=>27,'category_id'=>4,'code'=>'SSBT','title'=>'Ship Simulator with Bridge Teamwork','slug'=>'ship-simulator-with-bridge-teamwork','description'=>null,'duration'=>'4 days','fee'=>3600.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 08:44:56','updated_at'=>'2026-06-26 08:44:56'],
            ['id'=>28,'category_id'=>4,'code'=>'RSC','title'=>'Radar Simulator Course','slug'=>'radar-simulator-course','description'=>null,'duration'=>'4 days','fee'=>3600.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-26 08:45:41','updated_at'=>'2026-06-26 08:45:41'],
            ['id'=>29,'category_id'=>4,'code'=>'RTCR','title'=>'Radio Telephone Communication and Radar','slug'=>'radio-telephone-communication-and-radar','description'=>null,'duration'=>'5 days','fee'=>4200.00,'prerequisites'=>null,'learning_outcomes'=>null,'max_participants'=>null,'is_active'=>1,'archived_at'=>null,'sort_order'=>0,'created_at'=>'2026-06-27 06:25:11','updated_at'=>'2026-06-27 06:25:11'],
        ];

        // Map category_id to name for category string field
        $categoryMap = [3 => 'STCW', 4 => 'IN HOUSE', 5 => 'DOMESTIC'];

        foreach ($courses as $c) {
            // Fetch existing training to detect price change for logging
            $existing = DB::table('trainings')->where('id', $c['id'])->first();
            $oldFee = $existing ? (float) ($existing->fee ?? $existing->price ?? 0) : null;

            // Map to trainings table columns: name = title, price = fee, category = category name for display, keep fee too
            // Use updateOrInsert to preserve id and handle re-run
            DB::table('trainings')->updateOrInsert(
                ['id' => $c['id']],
                [
                    'category_id' => $c['category_id'],
                    'name' => $c['title'],
                    'title' => $c['title'],
                    'code' => $c['code'],
                    'slug' => $c['slug'],
                    'description' => $c['description'],
                    'duration' => $c['duration'],
                    'fee' => $c['fee'],
                    'price' => $c['fee'],
                    'prerequisites' => $c['prerequisites'],
                    'learning_outcomes' => $c['learning_outcomes'],
                    'max_participants' => $c['max_participants'],
                    'is_active' => $c['is_active'],
                    'archived_at' => $c['archived_at'],
                    'sort_order' => $c['sort_order'],
                    'category' => $categoryMap[$c['category_id']] ?? (string) $c['category_id'],
                    'created_by' => $adminId,
                    'updated_by' => $adminId,
                    'created_at' => $c['created_at'],
                    'updated_at' => $c['updated_at'],
                ]
            );

            // Handle price logging for backtracking
            if ($existing) {
                // Existing training was updated - log price change if fee changed
                if ($oldFee !== null && abs($oldFee - (float)$c['fee']) > 0.01) {
                    $hasChangeLog = TrainingPriceLog::where('training_id', $c['id'])
                        ->where('old_price', $oldFee)
                        ->where('new_price', $c['fee'])
                        ->exists();
                    if (!$hasChangeLog) {
                        TrainingPriceLog::create([
                            'training_id' => $c['id'],
                            'old_price' => $oldFee,
                            'new_price' => $c['fee'],
                            'old_training_price' => $oldFee,
                            'new_training_price' => $c['fee'],
                            'source' => 'training',
                            'notes' => 'Price updated via seeder (course sync)',
                            'changed_by' => $adminId,
                            'created_at' => $c['updated_at'],
                            'updated_at' => $c['updated_at'],
                        ]);
                    }
                }
                // Ensure at least one log exists (initial)
                $anyLog = TrainingPriceLog::where('training_id', $c['id'])->exists();
                if (!$anyLog) {
                    TrainingPriceLog::create([
                        'training_id' => $c['id'],
                        'old_price' => 0,
                        'new_price' => $c['fee'],
                        'old_training_price' => 0,
                        'new_training_price' => $c['fee'],
                        'source' => 'training',
                        'notes' => 'Initial price',
                        'changed_by' => $adminId,
                        'created_at' => $c['created_at'],
                        'updated_at' => $c['updated_at'],
                    ]);
                }
            } else {
                // New training - create initial log
                TrainingPriceLog::create([
                    'training_id' => $c['id'],
                    'old_price' => 0,
                    'new_price' => $c['fee'],
                    'old_training_price' => 0,
                    'new_training_price' => $c['fee'],
                    'source' => 'training',
                    'notes' => 'Initial price',
                    'changed_by' => $adminId,
                    'created_at' => $c['created_at'],
                    'updated_at' => $c['updated_at'],
                ]);
            }
        }

        // Fix auto-increment to avoid id collision (set to max+1)
        $maxId = DB::table('trainings')->max('id');
        DB::statement("ALTER TABLE trainings AUTO_INCREMENT = " . ($maxId + 1));

        $this->command->info("Seeded " . count($courses) . " training courses (IDs 2-29) with fees. Trainings total: " . Training::count());
    }
}
