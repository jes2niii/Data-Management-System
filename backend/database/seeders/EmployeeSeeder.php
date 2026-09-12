<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Employee;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class EmployeeSeeder extends Seeder
{
    public function run(): void
    {
        if (Employee::count() > 0) {
            $this->command->info("Employees already seeded (" . Employee::count() . " records), skipping to avoid duplicates. Truncate employees to re-seed.");
            return;
        }

        $departments = Department::all()->keyBy('name');
        $now = Carbon::now();

        $samples = [
            ['first_name'=>'Juan','last_name'=>'Dela Cruz','gender'=>'male','civil_status'=>'Single','position'=>'Software Engineer','department'=>'IT','employment_type'=>'Regular','date_hired'=>'2022-03-15','status'=>'active','salary'=>55000],
            ['first_name'=>'Maria','last_name'=>'Santos','gender'=>'female','civil_status'=>'Married','position'=>'HR Officer','department'=>'HR','employment_type'=>'Regular','date_hired'=>'2021-06-10','status'=>'active','salary'=>42000],
            ['first_name'=>'Pedro','last_name'=>'Reyes','gender'=>'male','civil_status'=>'Married','position'=>'Accountant','department'=>'Finance','employment_type'=>'Regular','date_hired'=>'2020-09-01','status'=>'active','salary'=>48000],
            ['first_name'=>'Ana','last_name'=>'Garcia','gender'=>'female','civil_status'=>'Single','position'=>'Operations Manager','department'=>'Operations','employment_type'=>'Regular','date_hired'=>'2019-11-20','status'=>'active','salary'=>65000],
            ['first_name'=>'Jose','last_name'=>'Rizal','gender'=>'male','civil_status'=>'Single','position'=>'Engineering Technician','department'=>'Engineering','employment_type'=>'Contract','date_hired'=>'2023-01-12','status'=>'active','salary'=>38000],
            ['first_name'=>'Liza','last_name'=>'Fernandez','gender'=>'female','civil_status'=>'Married','position'=>'Admin Assistant','department'=>'Administration','employment_type'=>'Regular','date_hired'=>'2022-07-05','status'=>'active','salary'=>32000],
            ['first_name'=>'Mark','last_name'=>'Tan','gender'=>'male','civil_status'=>'Single','position'=>'Sales Executive','department'=>'Sales','employment_type'=>'Probationary','date_hired'=>'2024-08-01','status'=>'active','salary'=>35000],
            ['first_name'=>'Cecilia','last_name'=>'Lim','gender'=>'female','civil_status'=>'Married','position'=>'Marketing Specialist','department'=>'Marketing','employment_type'=>'Regular','date_hired'=>'2021-02-18','status'=>'active','salary'=>40000],
            ['first_name'=>'Roberto','last_name'=>'Cruz','gender'=>'male','civil_status'=>'Single','position'=>'Legal Counsel','department'=>'Legal','employment_type'=>'Regular','date_hired'=>'2020-05-30','status'=>'active','salary'=>70000],
            ['first_name'=>'Sofia','last_name'=>'Mendoza','gender'=>'female','civil_status'=>'Single','position'=>'IT Support','department'=>'IT','employment_type'=>'Regular','date_hired'=>'2023-04-22','status'=>'active','salary'=>36000],
            ['first_name'=>'Carlo','last_name'=>'Aquino','gender'=>'male','civil_status'=>'Married','position'=>'Finance Analyst','department'=>'Finance','employment_type'=>'Regular','date_hired'=>'2022-10-11','status'=>'on_leave','salary'=>45000],
            ['first_name'=>'Isabella','last_name'=>'Torres','gender'=>'female','civil_status'=>'Single','position'=>'HR Assistant','department'=>'HR','employment_type'=>'Probationary','date_hired'=>'2024-06-15','status'=>'active','salary'=>30000],
            ['first_name'=>'Miguel','last_name'=>'Santos','gender'=>'male','civil_status'=>'Single','position'=>'Operations Staff','department'=>'Operations','employment_type'=>'Contract','date_hired'=>'2023-09-10','status'=>'active','salary'=>34000],
            ['first_name'=>'Patricia','last_name'=>'Ramos','gender'=>'female','civil_status'=>'Married','position'=>'Engineering Lead','department'=>'Engineering','employment_type'=>'Regular','date_hired'=>'2019-03-25','status'=>'active','salary'=>62000],
            ['first_name'=>'Andres','last_name'=>'Gonzales','gender'=>'male','civil_status'=>'Single','position'=>'Admin Clerk','department'=>'Administration','employment_type'=>'Regular','date_hired'=>'2022-12-01','status'=>'active','salary'=>31000],
        ];

        $created = 0;
        foreach ($samples as $i => $s) {
            $dept = $departments[$s['department']] ?? $departments['IT'];
            $fullName = $s['first_name'] . ' ' . $s['last_name'];
            $employeeNo = 'EMP-' . str_pad((string)($i + 1), 4, '0', STR_PAD_LEFT);
            $email = strtolower($s['first_name'] . '.' . $s['last_name'] . ($i+1) . '@company.com');

            Employee::create([
                'employee_no' => $employeeNo,
                'employee_id' => $employeeNo,
                'full_name' => $fullName,
                'first_name' => $s['first_name'],
                'last_name' => $s['last_name'],
                'gender' => $s['gender'],
                'civil_status' => $s['civil_status'],
                'department_id' => $dept->id,
                'position' => $s['position'],
                'employment_type' => $s['employment_type'],
                'date_hired' => $s['date_hired'],
                'salary' => $s['salary'],
                'status' => $s['status'],
                'email' => $email,
                'phone' => '09' . rand(100000000, 999999999),
                'address' => 'Manila, Philippines',
                'birthdate' => Carbon::now()->subYears(rand(22, 45))->subDays(rand(0, 365))->format('Y-m-d'),
            ]);
            $created++;
        }

        $this->command->info("Seeded {$created} employees across " . $departments->count() . " departments. Total employees: " . Employee::count());
    }
}
