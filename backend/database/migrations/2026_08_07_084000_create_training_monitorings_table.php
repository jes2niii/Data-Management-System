<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_monitorings', function (Blueprint $table) {
            $table->id();
            $table->date('date')->nullable();
            $table->string('name');
            $table->string('training_course')->index();
            $table->string('manner_of_conduct')->nullable();
            $table->string('training_schedule_cbt')->nullable();
            $table->string('training_schedule_practical')->nullable();
            $table->decimal('training_fee', 12, 2)->default(0);
            $table->decimal('downpayment', 12, 2)->default(0);
            $table->decimal('balance', 12, 2)->default(0);
            $table->text('remarks')->nullable();
            $table->string('system_location')->nullable()->index(); // Manila/Naga/Legazpi
            $table->string('assisted_by')->nullable();
            $table->string('print_status')->default('To Print')->index(); // To Print / Printed
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('date');
            $table->index('assisted_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_monitorings');
    }
};
