<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('book_inventories', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->foreignId('book_category_id')->nullable()->constrained('book_categories')->nullOnDelete();
            $table->string('references')->nullable();
            $table->text('alternative_references')->nullable();
            $table->string('link')->nullable();
            $table->string('file_path')->nullable();
            $table->string('file_name')->nullable();
            $table->string('file_type')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->text('description')->nullable();
            $table->string('author')->nullable();
            $table->string('publisher')->nullable();
            $table->string('year')->nullable();
            $table->string('edition')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('book_category_id');
            $table->index('title');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('book_inventories');
    }
};
