<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('bill_category_id')->nullable()->constrained('bill_categories')->nullOnDelete();
            $table->string('provider')->nullable();
            $table->text('description')->nullable();
            $table->decimal('amount', 12, 2)->default(0);
            $table->string('billing_cycle')->default('monthly'); // monthly, yearly, weekly, quarterly, custom
            $table->integer('billing_frequency')->default(1);
            $table->date('start_date')->nullable();
            $table->date('next_billing_date')->nullable();
            $table->date('end_date')->nullable();
            $table->string('status')->default('active'); // active, paused, cancelled, expired, trial
            $table->boolean('auto_renew')->default(true);
            $table->string('payment_method')->nullable();
            $table->string('reference_number')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('next_billing_date');
            $table->index('bill_category_id');
            $table->index('billing_cycle');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
