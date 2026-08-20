<?php

namespace Database\Seeders;

use App\Models\AttendanceStatus;
use Illuminate\Database\Seeder;

class AttendanceStatusSeeder extends Seeder
{
    public function run(): void
    {
        $statuses = [
            ['name' => 'Present', 'code' => 'present', 'color' => 'green', 'is_present' => true],
            ['name' => 'Absent', 'code' => 'absent', 'color' => 'red', 'is_present' => false],
            ['name' => 'Late', 'code' => 'late', 'color' => 'yellow', 'is_present' => true],
            ['name' => 'Half-day', 'code' => 'half_day', 'color' => 'orange', 'is_present' => true],
            ['name' => 'Leave', 'code' => 'leave', 'color' => 'blue', 'is_present' => false],
            ['name' => 'Holiday', 'code' => 'holiday', 'color' => 'gray', 'is_present' => false],
        ];

        foreach ($statuses as $s) {
            AttendanceStatus::updateOrCreate(['code' => $s['code']], $s);
        }
    }
}
