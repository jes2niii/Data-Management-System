<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bills', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('bill_category_id')->constrained('bill_categories')->cascadeOnDelete();
            $table->string('provider')->nullable();
            $table->string('reference_number')->nullable();
            $table->decimal('amount', 12, 2);
            $table->date('billing_date');
            $table->date('due_date');
            $table->date('payment_date')->nullable();
            $table->string('status')->default('pending');
            $table->string('payment_method')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('due_date');
            $table->index('bill_category_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bills');
    }
};
