<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('attendances', 'session')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->string('session')->nullable()->after('date');
            });
        }

        Schema::table('attendances', function (Blueprint $table) {
            $table->index('employee_id', 'attendances_employee_id_fk_index');
            $table->dropUnique(['employee_id', 'date']);
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->unique(['employee_id', 'date', 'session']);
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->dropIndex('attendances_employee_id_fk_index');
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropUnique(['employee_id', 'date', 'session']);
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->unique(['employee_id', 'date']);
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->dropColumn('session');
        });
    }
};