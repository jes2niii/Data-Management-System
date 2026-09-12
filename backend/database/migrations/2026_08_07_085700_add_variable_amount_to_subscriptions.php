<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->boolean('is_variable_amount')->default(false)->after('amount');
            $table->decimal('estimated_amount', 12, 2)->nullable()->after('is_variable_amount');
            $table->text('variable_notes')->nullable()->after('estimated_amount');
        });

        Schema::create('subscription_billings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subscription_id')->constrained('subscriptions')->cascadeOnDelete();
            $table->date('billing_date');
            $table->date('due_date')->nullable();
            $table->decimal('amount', 12, 2);
            $table->decimal('paid_amount', 12, 2)->nullable();
            $table->string('status')->default('pending'); // pending, paid, overdue, cancelled
            $table->string('reference_number')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('billing_date');
            $table->index('status');
            $table->index('subscription_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_billings');
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn(['is_variable_amount', 'estimated_amount', 'variable_notes']);
        });
    }
};
