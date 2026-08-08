<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_attachment_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('employee_attachments', function (Blueprint $table) {
            $table->foreignId('employee_attachment_category_id')->nullable()->after('category')->constrained('employee_attachment_categories')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('employee_attachments', function (Blueprint $table) {
            $table->dropForeign(['employee_attachment_category_id']);
            $table->dropColumn('employee_attachment_category_id');
        });
        Schema::dropIfExists('employee_attachment_categories');
    }
};
