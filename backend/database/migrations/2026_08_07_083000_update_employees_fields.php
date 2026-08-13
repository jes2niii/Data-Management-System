<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('employee_no')->nullable()->after('employee_id');
            $table->string('first_name')->nullable()->after('full_name');
            $table->string('middle_name')->nullable()->after('first_name');
            $table->string('last_name')->nullable()->after('middle_name');
            $table->string('suffix')->nullable()->after('last_name');
            $table->string('nationality')->nullable()->after('birthdate');
            $table->string('place_of_birth')->nullable()->after('nationality');
            $table->string('mobile_number')->nullable()->after('phone');
            $table->text('present_address')->nullable()->after('address');
            $table->text('permanent_address')->nullable()->after('present_address');
            $table->string('emergency_contact_person')->nullable()->after('emergency_contact');
            $table->string('emergency_contact_number')->nullable()->after('emergency_contact_person');
            $table->string('emergency_relationship')->nullable()->after('emergency_contact_number');
            $table->date('regularization_date')->nullable()->after('date_hired');
            $table->string('payroll_type')->nullable()->after('salary');
            $table->string('sss_no')->nullable()->after('government_ids');
            $table->string('philhealth_no')->nullable()->after('sss_no');
            $table->string('pagibig_no')->nullable()->after('philhealth_no');
            $table->string('tin')->nullable()->after('pagibig_no');
            $table->string('bank_name')->nullable()->after('tin');
            $table->string('bank_account')->nullable()->after('bank_name');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn([
                'employee_no', 'first_name', 'middle_name', 'last_name', 'suffix',
                'nationality', 'place_of_birth', 'mobile_number',
                'present_address', 'permanent_address',
                'emergency_contact_person', 'emergency_contact_number', 'emergency_relationship',
                'regularization_date', 'payroll_type',
                'sss_no', 'philhealth_no', 'pagibig_no', 'tin',
                'bank_name', 'bank_account',
            ]);
        });
    }
};
