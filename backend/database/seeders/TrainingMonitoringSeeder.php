<?php

namespace Database\Seeders;

use App\Models\Training;
use App\Models\TrainingMonitoring;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class TrainingMonitoringSeeder extends Seeder
{
    public function run(): void
    {
        $existing = TrainingMonitoring::count();
        $target = 30;
        if ($existing >= $target) {
            $this->command->info("Training monitorings already seeded (" . $existing . " records >= {$target}), skipping to avoid duplicates. Truncate training_monitorings to re-seed.");
            return;
        }
        $toCreate = $target - $existing;
        if ($existing > 0) {
            $this->command->info("Found {$existing} existing monitorings, creating {$toCreate} more to reach {$target}...");
        }

        $trainings = Training::where('is_active', true)->get();
        if ($trainings->isEmpty()) {
            $this->command->warn("No trainings found, cannot seed monitorings. Seed trainings first.");
            return;
        }

        $admin = User::where('email', 'admin@admin.com')->first();
        $creatorId = $admin?->id ?? User::first()?->id;

        // Sample trainee names (Filipino)
        $firstNames = ['Juan','Maria','Pedro','Ana','Jose','Liza','Mark','Cecilia','Roberto','Sofia','Carlo','Isabella','Miguel','Patricia','Andres','Elena','Ramon','Grace','Victor','Nina','Alfredo','Jessa','Dennis','Karla','Erwin','Mia','Leo','Clara','Ben','Sara'];
        $lastNames = ['Dela Cruz','Santos','Reyes','Garcia','Fernandez','Lim','Cruz','Mendoza','Torres','Ramos','Gonzales','Aquino','Diaz','Flores','Villanueva','Rivera','Navarro','Ocampo',' Bautista','Castro','Alvarez','Reyes','Perez','Gomez','Santiago','Delos Reyes','Manansala','Estrada','Hernandez','Luna'];
        $manners = ['Face to Face','CBT','CBT/Face to Face','Online','Blended','Hybrid','Practical'];
        $systems = ['Manila','Naga','Legazpi'];
        $assistedByList = ['Admin','Staff A','Staff B','Maam Liza','Sir Mark','HR - Ana','Frontdesk - Grace'];
        $printStatuses = ['To Print','Printed'];

        $created = 0;
        // Create sample monitorings spanning last 6 months
        $startIndex = $existing + 1;
        for ($i = $startIndex; $i < $startIndex + $toCreate; $i++) {
            $training = $trainings->random();
            $first = $firstNames[array_rand($firstNames)];
            $last = $lastNames[array_rand($lastNames)];
            $name = $first . ' ' . $last . ($i > 20 ? ' ' . chr(65 + rand(0,25)) . '.' : '');
            $fee = (float) ($training->fee ?? $training->price ?? 0);
            // Downpayment: 30% full payment, 70% partial (40-90% of fee)
            $isFull = rand(1, 10) <= 3; // 30% full
            $down = $isFull ? $fee : (float) round($fee * (rand(40, 90) / 100) / 50) * 50; // round to 50
            // Ensure down doesn't exceed fee and is at least 500 if partial
            if (!$isFull && $down >= $fee) $down = $fee - 500;
            if ($down < 0) $down = 0;

            $date = Carbon::now()->subDays(rand(0, 180))->subHours(rand(0, 23));
            // Ensure date is within last 6 months and not future
            if ($date->isFuture()) $date = Carbon::now()->subDays(rand(1, 30));

            $cbtDate = (clone $date)->addDays(rand(5, 15))->format('Y-m-d');
            $practicalDate = (clone $date)->addDays(rand(16, 30))->format('Y-m-d');
            // Sometimes make practical empty
            if (rand(1,10) <= 2) $practicalDate = null;

            $system = $systems[array_rand($systems)];
            $manner = $manners[array_rand($manners)];
            $assisted = $assistedByList[array_rand($assistedByList)];
            $printStatus = $printStatuses[array_rand($printStatuses)];

            TrainingMonitoring::create([
                'date' => $date->format('Y-m-d'),
                'name' => $name,
                'training_id' => $training->id,
                'training_course' => $training->title ?? $training->name,
                'manner_of_conduct' => $manner,
                'training_schedule_cbt' => $cbtDate,
                'training_schedule_practical' => $practicalDate,
                'training_fee' => $fee,
                'downpayment' => $down,
                // balance and remarks auto-computed in model
                'system_location' => $system,
                'assisted_by' => $assisted,
                'print_status' => $printStatus,
                'created_by' => $creatorId,
            ]);
            $created++;
        }

        $this->command->info("Seeded {$created} training monitorings across " . $trainings->count() . " trainings. Total monitorings: " . TrainingMonitoring::count());
        $byCourse = TrainingMonitoring::selectRaw('training_course, COUNT(*) as c')->groupBy('training_course')->orderByDesc('c')->limit(5)->pluck('c','training_course')->toArray();
        $this->command->info("Top courses: " . json_encode($byCourse));
        $byRemarks = TrainingMonitoring::selectRaw('remarks, COUNT(*) as c')->groupBy('remarks')->pluck('c','remarks')->toArray();
        $this->command->info("By remarks: " . json_encode($byRemarks));
        $revenue = TrainingMonitoring::sum('training_fee');
        $collected = TrainingMonitoring::sum('downpayment');
        $this->command->info("Total revenue: " . number_format($revenue,2) . " Collected: " . number_format($collected,2) . " Outstanding: " . number_format($revenue - $collected,2));
    }
}
