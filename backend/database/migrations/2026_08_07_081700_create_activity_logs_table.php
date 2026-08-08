<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('ip_address')->nullable();
            $table->string('device')->nullable();
            $table->string('browser')->nullable();
            $table->string('operating_system')->nullable();
            $table->string('module');
            $table->string('action');
            $table->text('description')->nullable();
            $table->unsignedBigInteger('affected_record_id')->nullable();
            $table->string('affected_record_type')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('status')->default('success');
            $table->timestamp('created_at')->nullable();

            $table->index('user_id');
            $table->index('module');
            $table->index('action');
            $table->index('status');
            $table->index('created_at');
            $table->index(['affected_record_type', 'affected_record_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
