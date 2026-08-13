<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('test_items', function (Blueprint $table) {
            $table->string('item_type')->default('multiple_choice')->after('correct_answer');
            $table->json('options')->nullable()->after('item_type');
        });

        Schema::table('test_item_analysis', function (Blueprint $table) {
            $table->json('upper_choices')->nullable()->after('la_total');
            $table->json('lower_choices')->nullable()->after('upper_choices');
        });
    }

    public function down(): void
    {
        Schema::table('test_item_analysis', function (Blueprint $table) {
            $table->dropColumn(['upper_choices', 'lower_choices']);
        });
        Schema::table('test_items', function (Blueprint $table) {
            $table->dropColumn(['item_type', 'options']);
        });
    }
};
