<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('uniform_inventories', function (Blueprint $table) {
            $table->id();
            $table->date('date')->nullable();
            $table->string('description'); // e.g., SEATECH UNIFORM (M), LARGE, GLOVES, etc.
            $table->decimal('beg_balance', 12, 2)->default(0);
            $table->string('unit')->default('PCS');
            $table->date('date_out')->nullable();
            $table->decimal('qty_out', 12, 2)->nullable();
            $table->date('date_in')->nullable();
            $table->decimal('qty_in', 12, 2)->nullable();
            $table->decimal('total_balance', 12, 2)->default(0);
            $table->text('remarks')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('uniform_inventories');
    }
};
