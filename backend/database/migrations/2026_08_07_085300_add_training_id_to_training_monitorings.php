<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('training_monitorings', function (Blueprint $table) {
            $table->foreignId('training_id')->nullable()->after('name')->constrained('trainings')->nullOnDelete();
            $table->foreignId('training_detail_id')->nullable()->after('training_id')->constrained('training_details')->nullOnDelete();
            $table->index('training_id');
            $table->index('training_detail_id');
        });
    }

    public function down(): void
    {
        Schema::table('training_monitorings', function (Blueprint $table) {
            $table->dropForeign(['training_id']);
            $table->dropForeign(['training_detail_id']);
            $table->dropColumn(['training_id', 'training_detail_id']);
        });
    }
};
