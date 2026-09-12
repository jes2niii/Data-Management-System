<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->string('sku')->nullable()->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('inventory_category_id')->nullable()->constrained('inventory_categories')->nullOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained('inventory_suppliers')->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->decimal('quantity', 12, 2)->default(0);
            $table->string('unit')->default('pcs');
            $table->string('location')->nullable();
            $table->integer('reorder_point')->default(10);
            $table->decimal('unit_cost', 12, 2)->default(0);
            $table->decimal('total_value', 14, 2)->default(0);
            $table->string('status')->default('in_stock');
            $table->date('last_restocked_at')->nullable();
            $table->date('expiry_date')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('inventory_category_id');
            $table->index('supplier_id');
            $table->index('department_id');
            $table->index('location');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_items');
    }
};
