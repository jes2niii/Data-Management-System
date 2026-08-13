<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('test_exams', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('subject')->nullable();
            $table->integer('total_items')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('test_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('test_exam_id')->constrained('test_exams')->cascadeOnDelete();
            $table->integer('item_number');
            $table->text('question')->nullable();
            $table->string('correct_answer')->nullable(); // A,B,C,D or answer key
            $table->integer('max_score')->default(1);
            $table->timestamps();
        });

        Schema::create('test_students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('test_exam_id')->constrained('test_exams')->cascadeOnDelete();
            $table->string('name');
            $table->decimal('total_score', 8, 2)->nullable();
            $table->integer('rank')->nullable();
            $table->string('group')->nullable(); // UA or LA
            $table->integer('items_correct')->nullable();
            $table->decimal('percentage', 5, 2)->nullable();
            $table->timestamps();
        });

        Schema::create('test_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('test_student_id')->constrained('test_students')->cascadeOnDelete();
            $table->foreignId('test_item_id')->constrained('test_items')->cascadeOnDelete();
            $table->string('answer')->nullable();
            $table->boolean('is_correct')->default(false);
            $table->timestamps();
        });

        Schema::create('test_item_analysis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('test_exam_id')->constrained('test_exams')->cascadeOnDelete();
            $table->foreignId('test_item_id')->constrained('test_items')->cascadeOnDelete();
            $table->integer('ua_correct')->default(0);
            $table->integer('la_correct')->default(0);
            $table->integer('ua_total')->default(0);
            $table->integer('la_total')->default(0);
            $table->decimal('ua_proportion', 6, 4)->default(0);
            $table->decimal('la_proportion', 6, 4)->default(0);
            $table->decimal('difficulty_index', 6, 4)->default(0);
            $table->decimal('discrimination_index', 6, 4)->default(0);
            $table->string('difficulty_level')->nullable();
            $table->string('discrimination_level')->nullable();
            $table->string('action')->nullable(); // retain, revise, reject
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('test_item_analysis');
        Schema::dropIfExists('test_answers');
        Schema::dropIfExists('test_students');
        Schema::dropIfExists('test_items');
        Schema::dropIfExists('test_exams');
    }
};
