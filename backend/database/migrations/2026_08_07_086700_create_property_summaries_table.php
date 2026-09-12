<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('property_summaries', function (Blueprint $table) {
            $table->id();
            $table->string('month_year'); // e.g., AUGUST 2026
            $table->string('property_code');
            $table->string('property_name');
            $table->text('description')->nullable();
            $table->string('serial_number')->nullable();
            $table->date('date_checked')->nullable();
            $table->string('status')->default('Good Condition/Working'); // Good Condition/Working, Damaged, For Disposal, For Repair/Repaired
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('property_summaries');
    }
};
