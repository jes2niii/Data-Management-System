<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id')->unique();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('photo')->nullable();
            $table->string('full_name');
            $table->date('birthdate')->nullable();
            $table->string('gender')->nullable();
            $table->string('civil_status')->nullable();
            $table->foreignId('department_id')->constrained('departments')->cascadeOnDelete();
            $table->string('position');
            $table->string('employment_type')->nullable();
            $table->date('date_hired')->nullable();
            $table->decimal('salary', 10, 2)->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->text('emergency_contact')->nullable();
            $table->json('government_ids')->nullable();
            $table->string('status')->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('full_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
