<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_access', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('documents')->cascadeOnDelete();
            $table->string('access_type'); // 'department' or 'user'
            $table->unsignedBigInteger('access_id');
            $table->timestamps();
            
            $table->unique(['document_id', 'access_type', 'access_id']);
            $table->index(['access_type', 'access_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_access');
    }
};
