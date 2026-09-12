<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\AttendanceStatus;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class AttendanceSeeder extends Seeder
{
    public function run(): void
    {
        // Ensure employees exist
        if (Employee::count() === 0) {
            $this->command->warn("No employees found, running EmployeeSeeder first...");
            $this->call(EmployeeSeeder::class);
        }

        if (Attendance::count() > 0) {
            $this->command->info("Attendances already seeded (" . Attendance::count() . " records), skipping to avoid duplicates. Truncate attendances to re-seed.");
            return;
        }

        $employees = Employee::where('status', '!=', 'terminated')->get();
        $statuses = AttendanceStatus::all()->keyBy('code');
        $admin = User::where('email', 'admin@admin.com')->first();
        $recorderId = $admin?->id ?? User::first()?->id;

        if ($employees->isEmpty()) {
            $this->command->error("No employees available to seed attendance.");
            return;
        }
        if ($statuses->isEmpty()) {
            $this->command->error("No attendance statuses found. Run DatabaseSeeder first.");
            return;
        }

        // Define weighted statuses for realistic distribution
        // Present 65%, Late 12%, Half-day 5%, Absent 7%, Leave 6%, Holiday 5%
        $weightedStatuses = [];
        $weights = [
            'present' => 65,
            'late' => 12,
            'half_day' => 5,
            'absent' => 7,
            'leave' => 6,
            'holiday' => 5,
        ];
        foreach ($weights as $code => $w) {
            if (isset($statuses[$code])) {
                for ($i = 0; $i < $w; $i++) $weightedStatuses[] = $statuses[$code];
            }
        }

        $startDate = Carbon::now()->subDays(30)->startOfDay();
        $endDate = Carbon::now()->startOfDay();
        $sessions = ['morning', 'afternoon'];

        $created = 0;
        $skippedWeekends = 0;

        for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
            // Skip Sundays (no work), keep Saturdays as half-day or present for some
            $isSunday = $date->isSunday();
            $isSaturday = $date->isSaturday();
            if ($isSunday) {
                // Mark most as holiday on Sundays
                $skippedWeekends++;
            }

            foreach ($employees as $emp) {
                foreach ($sessions as $session) {
                    // Decide status
                    if ($isSunday) {
                        // 90% holiday, 10% present (for on-call)
                        $status = rand(1, 10) <= 9 ? $statuses['holiday'] : $statuses['present'];
                    } elseif ($isSaturday) {
                        // Saturday: 50% present, 20% half_day, 15% absent, 15% leave
                        $rand = rand(1, 100);
                        if ($rand <= 50) $status = $statuses['present'];
                        elseif ($rand <= 70) $status = $statuses['half_day'] ?? $statuses['present'];
                        elseif ($rand <= 85) $status = $statuses['absent'];
                        else $status = $statuses['leave'] ?? $statuses['absent'];
                    } else {
                        $status = $weightedStatuses[array_rand($weightedStatuses)];
                    }

                    // Generate times based on status and session
                    $timeIn = null; $timeOut = null; $minutesLate = null; $hoursWorked = null; $remarks = null;
                    if ($status->code === 'present') {
                        if ($session === 'morning') {
                            $timeIn = sprintf("%02d:%02d", 7 + rand(0, 0), rand(0, 15)); // 07:00-07:15
                            $timeOut = sprintf("%02d:%02d", 11 + rand(0, 1), rand(45, 59)); // 11:45-12:59
                            $minutesLate = (int)explode(':', $timeIn)[1] + rand(0, 5);
                            if ($minutesLate > 15) $minutesLate = rand(0, 10);
                            else $minutesLate = rand(0, 2);
                            $hoursWorked = 4;
                        } else {
                            $timeIn = sprintf("%02d:%02d", 13, rand(0, 15)); // 13:00-13:15
                            $timeOut = sprintf("%02d:%02d", 17, rand(0, 30)); // 17:00-17:30
                            $minutesLate = rand(0, 3);
                            $hoursWorked = 4;
                        }
                    } elseif ($status->code === 'late') {
                        if ($session === 'morning') {
                            $timeIn = sprintf("07:%02d", rand(16, 45)); // 07:16-07:45
                            $timeOut = sprintf("%02d:%02d", 12, rand(0, 30));
                            $minutesLate = rand(16, 45);
                            $hoursWorked = 4;
                            $remarks = ['Traffic', 'Late shuttle', 'Overslept'][array_rand(['Traffic','Late shuttle','Overslept'])];
                        } else {
                            $timeIn = sprintf("13:%02d", rand(16, 30));
                            $timeOut = sprintf("17:%02d", rand(0, 15));
                            $minutesLate = rand(16, 30);
                            $hoursWorked = 4;
                            $remarks = 'Late return from lunch';
                        }
                    } elseif ($status->code === 'half_day') {
                        $timeIn = $session === 'morning' ? sprintf("07:%02d", rand(0, 10)) : null;
                        $timeOut = $session === 'morning' ? "12:00" : null;
                        $hoursWorked = 4;
                        $remarks = 'Half-day - personal errand';
                        if ($session === 'afternoon') {
                            $status = $statuses['absent']; // for afternoon half-day, mark absent
                            $timeIn = null; $timeOut = null; $hoursWorked = null;
                        }
                    } elseif ($status->code === 'absent') {
                        $remarks = ['Sick leave', 'Emergency', 'No notice'][array_rand(['Sick leave','Emergency','No notice'])];
                    } elseif ($status->code === 'leave') {
                        $remarks = ['Annual leave', 'Sick leave - filed', 'Bereavement'][array_rand(['Annual leave','Sick leave - filed','Bereavement'])];
                    } elseif ($status->code === 'holiday') {
                        $remarks = $isSunday ? 'Sunday - Rest day' : 'Holiday';
                    }

                    Attendance::create([
                        'employee_id' => $emp->id,
                        'date' => $date->format('Y-m-d'),
                        'session' => $session,
                        'status_id' => $status->id,
                        'time_in' => $timeIn,
                        'time_out' => $timeOut,
                        'minutes_late' => $minutesLate,
                        'hours_worked' => $hoursWorked,
                        'remarks' => $remarks,
                        'recorded_by' => $recorderId,
                    ]);
                    $created++;
                }
            }
        }

        $this->command->info("Seeded {$created} attendance records for " . $employees->count() . " employees from " . $startDate->format('Y-m-d') . " to " . $endDate->format('Y-m-d') . " (skipped {$skippedWeekends} Sundays as holidays). Total attendances: " . Attendance::count());
        $byStatus = Attendance::with('status')->get()->groupBy(fn($a) => $a->status->code ?? 'unknown')->map->count()->toArray();
        $this->command->info("Breakdown by status: " . json_encode($byStatus));
    }
}
