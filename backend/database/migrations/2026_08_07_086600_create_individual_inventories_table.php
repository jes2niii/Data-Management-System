<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('individual_inventories', function (Blueprint $table) {
            $table->id();
            $table->string('employee_name');
            $table->string('department')->nullable();
            $table->string('location')->nullable();
            $table->date('date')->nullable();
            $table->string('property_code');
            $table->string('property_name');
            $table->text('description')->nullable();
            $table->string('serial_number')->nullable();
            $table->string('control_no')->nullable();
            $table->date('date_received')->nullable();
            $table->string('remarks')->default('GOOD');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('individual_inventories');
    }
};
