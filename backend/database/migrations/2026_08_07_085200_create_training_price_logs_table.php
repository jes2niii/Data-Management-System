<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_price_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_id')->constrained('trainings')->cascadeOnDelete();
            $table->foreignId('training_detail_id')->nullable()->constrained('training_details')->nullOnDelete();
            $table->decimal('old_price', 12, 2)->default(0);
            $table->decimal('new_price', 12, 2)->default(0);
            $table->decimal('old_training_price', 12, 2)->nullable();
            $table->decimal('new_training_price', 12, 2)->nullable();
            $table->string('source')->default('training'); // training or training_detail
            $table->text('notes')->nullable();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('training_id');
            $table->index('training_detail_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_price_logs');
    }
};
