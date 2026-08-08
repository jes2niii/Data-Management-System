<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('folder_id')->nullable()->constrained('folders')->nullOnDelete();
            $table->string('name');
            $table->string('original_name');
            $table->string('file_path');
            $table->string('file_type');
            $table->unsignedBigInteger('file_size')->default(0);
            $table->string('mime_type');
            $table->integer('version')->default(1);
            $table->text('description')->nullable();
            $table->string('category')->nullable();
            $table->json('tags')->nullable();
            $table->json('labels')->nullable();
            $table->string('status')->default('draft');
            $table->boolean('is_favorite')->default(false);
            $table->boolean('is_locked')->default(false);
            $table->foreignId('locked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->date('expiration_date')->nullable();
            $table->string('approval_status')->default('none');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('approved_at')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('category');
            $table->index('approval_status');
            $table->index('is_favorite');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
