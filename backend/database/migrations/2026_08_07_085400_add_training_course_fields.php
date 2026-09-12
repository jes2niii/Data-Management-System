<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trainings', function (Blueprint $table) {
            // Add fields from provided seeder if not exists
            if (!Schema::hasColumn('trainings', 'category_id')) {
                $table->unsignedBigInteger('category_id')->nullable()->after('id');
                $table->index('category_id');
            }
            if (!Schema::hasColumn('trainings', 'title')) {
                $table->string('title')->nullable()->after('name');
            }
            if (!Schema::hasColumn('trainings', 'slug')) {
                $table->string('slug')->nullable()->unique()->after('title');
            }
            if (!Schema::hasColumn('trainings', 'fee')) {
                $table->decimal('fee', 12, 2)->default(0)->after('price');
            }
            if (!Schema::hasColumn('trainings', 'prerequisites')) {
                $table->text('prerequisites')->nullable()->after('description');
            }
            if (!Schema::hasColumn('trainings', 'learning_outcomes')) {
                $table->text('learning_outcomes')->nullable()->after('prerequisites');
            }
            if (!Schema::hasColumn('trainings', 'max_participants')) {
                $table->integer('max_participants')->nullable()->after('learning_outcomes');
            }
            if (!Schema::hasColumn('trainings', 'archived_at')) {
                $table->timestamp('archived_at')->nullable()->after('is_active');
            }
            if (!Schema::hasColumn('trainings', 'sort_order')) {
                $table->integer('sort_order')->default(0)->after('archived_at');
            }
        });

        // Sync existing price to fee for backward compatibility if fee is 0
        \Illuminate\Support\Facades\DB::statement("UPDATE trainings SET fee = price WHERE fee = 0 AND price != 0");
        \Illuminate\Support\Facades\DB::statement("UPDATE trainings SET title = name WHERE title IS NULL OR title = ''");
    }

    public function down(): void
    {
        Schema::table('trainings', function (Blueprint $table) {
            $table->dropColumn(['category_id', 'title', 'slug', 'fee', 'prerequisites', 'learning_outcomes', 'max_participants', 'archived_at', 'sort_order']);
        });
    }
};
