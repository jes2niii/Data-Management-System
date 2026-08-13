<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_statuses', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Present, Absent, Late, Half-day, Leave
            $table->string('code')->unique();
            $table->string('color')->default('gray');
            $table->boolean('is_present')->default(false);
            $table->timestamps();
        });

        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->date('date');
            $table->foreignId('status_id')->nullable()->constrained('attendance_statuses')->nullOnDelete();
            $table->time('time_in')->nullable();
            $table->time('time_out')->nullable();
            $table->integer('minutes_late')->nullable();
            $table->integer('hours_worked')->nullable();
            $table->text('remarks')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            
            $table->unique(['employee_id', 'date']);
            $table->index(['date']);
            $table->index(['status_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('attendance_statuses');
    }
};
