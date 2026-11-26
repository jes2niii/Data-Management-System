<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incident_reports', function (Blueprint $table) {
            $table->id();
            $table->string('ir_number', 50)->unique();
            $table->string('filer_name');
            $table->date('date_reported');
            $table->string('item');
            $table->string('property_code', 50)->nullable();
            $table->string('incident_type', 20);
            $table->date('date_of_incident');
            $table->string('place_of_incident');
            $table->text('detailed_narration');
            $table->text('remarks')->nullable();
            $table->string('jo_number', 50)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['incident_type', 'date_reported']);
            $table->index('date_of_incident');
            $table->index('property_code');
            $table->index('filer_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incident_reports');
    }
};
