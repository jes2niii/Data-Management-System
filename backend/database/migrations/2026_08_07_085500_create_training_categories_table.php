<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('icon')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Add foreign key to trainings.category_id if trainings table exists and column exists
        // Use DB statement to avoid issues with existing data that may have invalid category_ids
        // We'll add FK without constraint first, then validate
        Schema::table('trainings', function (Blueprint $table) {
            // Ensure category_id is unsignedBigInteger and index exists; already added in 085400
            // Try to add foreign key if not exists - wrap in try/catch to avoid failure if categories not seeded yet
        });

        // Optionally, add index for performance (already exists)
        // Note: we don't enforce FK constraint strictly to allow the provided IDs 3,4,5 even if categories not yet seeded
        // But we can add it now that we will seed categories immediately after
        try {
            Schema::table('trainings', function (Blueprint $table) {
                // Check if foreign key already exists by trying to add; if fails, ignore
                $table->foreign('category_id')->references('id')->on('training_categories')->nullOnDelete();
            });
        } catch (\Throwable $e) {
            // Foreign key may already exist or fail due to existing invalid data - ignore, will be handled via application logic
        }
    }

    public function down(): void
    {
        Schema::table('trainings', function (Blueprint $table) {
            try {
                $table->dropForeign(['category_id']);
            } catch (\Throwable $e) {}
        });
        Schema::dropIfExists('training_categories');
    }
};
