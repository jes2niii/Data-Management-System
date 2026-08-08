<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->text('description')->nullable();
            $table->unsignedBigInteger('head_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('head_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('departments');
    }
};
