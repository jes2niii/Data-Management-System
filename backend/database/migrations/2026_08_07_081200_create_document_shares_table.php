<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_shares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('documents')->cascadeOnDelete();
            $table->foreignId('shared_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('shared_to')->constrained('users')->cascadeOnDelete();
            $table->string('permission');
            $table->dateTime('expires_at')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index('document_id');
            $table->index('shared_to');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_shares');
    }
};
