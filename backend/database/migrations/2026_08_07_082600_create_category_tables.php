<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('folder_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->foreignId('document_category_id')->nullable()->after('category')->constrained('document_categories')->nullOnDelete();
        });

        Schema::table('folders', function (Blueprint $table) {
            $table->foreignId('folder_category_id')->nullable()->after('category')->constrained('folder_categories')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropForeign(['document_category_id']);
            $table->dropColumn('document_category_id');
        });
        Schema::table('folders', function (Blueprint $table) {
            $table->dropForeign(['folder_category_id']);
            $table->dropColumn('folder_category_id');
        });
        Schema::dropIfExists('document_categories');
        Schema::dropIfExists('folder_categories');
    }
};
