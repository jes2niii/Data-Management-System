<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\InventoryItemStoreRequest;
use App\Http\Requests\InventoryItemUpdateRequest;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryItemController extends Controller
{
    public function index(Request $request)
    {
        $query = InventoryItem::with(['category','supplier','department','creator'])->orderBy('updated_at','desc');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search){
                $q->where('name','like',"%{$search}%")
                  ->orWhere('sku','like',"%{$search}%")
                  ->orWhere('description','like',"%{$search}%");
            });
        }
        if ($request->filled('category_id')) {
            $query->where('inventory_category_id', $request->category_id);
        }
        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }
        if ($request->filled('location')) {
            $query->where('location','like',"%{$request->location}%");
        }
        // Filter by Supply Chain department if requested
        if ($request->filled('supply_chain_only') && $request->boolean('supply_chain_only')) {
            $query->whereHas('department', fn($q)=> $q->where('name','Supply Chain')->orWhere('name','like','%Supply%'));
        }

        $perPage = $request->get('per_page', 15);
        $items = $query->paginate($perPage);
        return $this->success($items);
    }

    public function store(InventoryItemStoreRequest $request)
    {
        $data = $request->validated();
        $data['created_by'] = $request->user()->id;
        $data['updated_by'] = $request->user()->id;
        $data['unit'] = $data['unit'] ?? 'pcs';
        $item = InventoryItem::create($data);

        // Log initial stock as transaction if quantity >0
        if ((float)$item->quantity > 0) {
            InventoryTransaction::create([
                'inventory_item_id' => $item->id,
                'type' => 'in',
                'quantity' => $item->quantity,
                'balance_after' => $item->quantity,
                'unit_cost' => $item->unit_cost,
                'reference_number' => 'INIT-'.$item->sku,
                'notes' => 'Initial stock',
                'created_by' => $request->user()->id,
            ]);
            $item->update(['last_restocked_at' => now()->toDateString()]);
        }

        return $this->success($item->load(['category','supplier','department']), 'Inventory item created', 201);
    }

    public function show($id)
    {
        $item = InventoryItem::with(['category','supplier','department','creator','updater','transactions.creator'])->findOrFail($id);
        return $this->success($item);
    }

    public function update(InventoryItemUpdateRequest $request, $id)
    {
        $item = InventoryItem::findOrFail($id);
        $data = $request->validated();
        $data['updated_by'] = $request->user()->id;

        $oldQty = (float) $item->quantity;
        $newQty = isset($data['quantity']) ? (float) $data['quantity'] : $oldQty;

        $item->update($data);

        // If quantity changed, log transaction
        if (isset($data['quantity']) && abs($oldQty - $newQty) > 0.01) {
            $diff = $newQty - $oldQty;
            InventoryTransaction::create([
                'inventory_item_id' => $item->id,
                'type' => $diff > 0 ? 'in' : 'out',
                'quantity' => abs($diff),
                'balance_after' => $newQty,
                'unit_cost' => $item->unit_cost,
                'reference_number' => 'ADJ-'.time(),
                'notes' => 'Quantity adjustment via edit',
                'created_by' => $request->user()->id,
            ]);
            if ($diff > 0) {
                $item->update(['last_restocked_at' => now()->toDateString()]);
            }
        }

        return $this->success($item->load(['category','supplier','department']), 'Inventory item updated');
    }

    public function destroy($id)
    {
        $item = InventoryItem::findOrFail($id);
        $item->delete();
        return $this->success(null, 'Inventory item deleted');
    }

    public function stats(Request $request)
    {
        $base = InventoryItem::query();
        if ($request->filled('department_id')) $base->where('department_id', $request->department_id);
        if ($request->filled('supply_chain_only') && $request->boolean('supply_chain_only')) {
            $base->whereHas('department', fn($q)=> $q->where('name','Supply Chain')->orWhere('name','like','%Supply%'));
        }

        $totalItems = (clone $base)->count();
        $totalQuantity = (clone $base)->sum('quantity');
        $totalValue = (clone $base)->sum(DB::raw('quantity * unit_cost'));
        $lowStock = (clone $base)->where('status','low_stock')->count();
        $outOfStock = (clone $base)->where('status','out_of_stock')->count();
        $overstock = (clone $base)->where('status','overstock')->count();
        $inStock = (clone $base)->where('status','in_stock')->count();

        $byCategory = (clone $base)->leftJoin('inventory_categories','inventory_items.inventory_category_id','=','inventory_categories.id')
            ->selectRaw('COALESCE(inventory_categories.name, "Uncategorized") as category, COUNT(*) as count, SUM(inventory_items.quantity) as total_qty, SUM(inventory_items.quantity * inventory_items.unit_cost) as total_value')
            ->groupBy('category')
            ->orderByDesc('total_value')
            ->get();

        $byStatus = (clone $base)->selectRaw('status, COUNT(*) as count, SUM(quantity) as total_qty, SUM(quantity * unit_cost) as total_value')
            ->groupBy('status')
            ->get();

        $byLocation = (clone $base)->selectRaw('COALESCE(location, "Unknown") as location, COUNT(*) as count, SUM(quantity) as total_qty')
            ->groupBy('location')
            ->orderByDesc('count')
            ->limit(10)
            ->get();

        $lowStockItems = (clone $base)->with(['category','supplier'])->where('status','low_stock')->orWhere('status','out_of_stock')->orderBy('quantity')->limit(10)->get();

        $recentTransactions = InventoryTransaction::with(['item.category','creator'])
            ->orderBy('created_at','desc')->limit(10)->get();

        return $this->success([
            'total_items' => $totalItems,
            'total_quantity' => $totalQuantity,
            'total_value' => $totalValue,
            'low_stock' => $lowStock,
            'out_of_stock' => $outOfStock,
            'overstock' => $overstock,
            'in_stock' => $inStock,
            'by_category' => $byCategory,
            'by_status' => $byStatus,
            'by_location' => $byLocation,
            'low_stock_items' => $lowStockItems,
            'recent_transactions' => $recentTransactions,
        ]);
    }

    public function adjustStock(Request $request, $id)
    {
        $request->validate([
            'type' => 'required|string|in:in,out,adjustment',
            'quantity' => 'required|numeric|min:0.01',
            'unit_cost' => 'nullable|numeric|min:0',
            'purchase_date' => 'nullable|date',
            'reference_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:500',
        ]);

        $item = InventoryItem::findOrFail($id);
        $qty = (float) $request->quantity;
        $oldQty = (float) $item->quantity;
        $newQty = $oldQty;
        $purchaseDate = $request->filled('purchase_date') ? $request->purchase_date : now()->toDateString();

        if ($request->type === 'in') {
            $newQty = $oldQty + $qty;
            // Create a batch for this purchase with its own price and date
            \App\Models\InventoryBatch::create([
                'inventory_item_id' => $item->id,
                'batch_number' => 'BATCH-'.time().'-'.rand(100,999),
                'purchase_date' => $purchaseDate,
                'quantity' => $qty,
                'remaining_quantity' => $qty,
                'unit_cost' => $request->filled('unit_cost') ? $request->unit_cost : $item->unit_cost,
                'total_cost' => $qty * ($request->filled('unit_cost') ? $request->unit_cost : $item->unit_cost),
                'supplier' => $item->supplier?->name,
                'reference_number' => $request->reference_number ?? 'PO-'.time(),
                'notes' => $request->notes ?? 'Stock in on '.$purchaseDate.' at '.($request->filled('unit_cost') ? $request->unit_cost : $item->unit_cost),
                'created_by' => $request->user()->id,
            ]);
        } elseif ($request->type === 'out') {
            if ($qty > $oldQty) {
                return $this->error('Insufficient stock. Available: ' . $oldQty, 400);
            }
            $newQty = $oldQty - $qty;
            // FIFO: deduct from oldest batches first
            $remainingToDeduct = $qty;
            $batches = \App\Models\InventoryBatch::where('inventory_item_id', $item->id)->where('remaining_quantity','>',0)->orderBy('purchase_date')->get();
            foreach ($batches as $batch) {
                if ($remainingToDeduct <= 0) break;
                $deduct = min((float)$batch->remaining_quantity, $remainingToDeduct);
                $batch->update(['remaining_quantity' => (float)$batch->remaining_quantity - $deduct]);
                $remainingToDeduct -= $deduct;
            }
        } else { // adjustment
            $newQty = $qty; // set to exact quantity
            $qty = abs($newQty - $oldQty);
            if ($newQty > $oldQty) {
                // Adjustment up - create a batch for the added quantity
                $added = $newQty - $oldQty;
                \App\Models\InventoryBatch::create([
                    'inventory_item_id' => $item->id,
                    'batch_number' => 'ADJ-'.time(),
                    'purchase_date' => $purchaseDate,
                    'quantity' => $added,
                    'remaining_quantity' => $added,
                    'unit_cost' => $request->filled('unit_cost') ? $request->unit_cost : $item->unit_cost,
                    'total_cost' => $added * ($request->filled('unit_cost') ? $request->unit_cost : $item->unit_cost),
                    'notes' => 'Adjustment up',
                    'created_by' => $request->user()->id,
                ]);
            }
        }

        $item->update([
            'quantity' => $newQty,
            'unit_cost' => $request->filled('unit_cost') ? $request->unit_cost : $item->unit_cost,
            'updated_by' => $request->user()->id,
            'last_restocked_at' => $request->type === 'in' ? $purchaseDate : $item->last_restocked_at,
        ]);

        $transaction = InventoryTransaction::create([
            'inventory_item_id' => $item->id,
            'type' => $request->type,
            'quantity' => $qty,
            'balance_after' => $newQty,
            'unit_cost' => $request->unit_cost ?? $item->unit_cost,
            'reference_number' => $request->reference_number ?? 'ADJ-'.time(),
            'notes' => $request->notes ? $request->notes . ' | Purchase date: '.$purchaseDate : 'Purchase date: '.$purchaseDate,
            'created_by' => $request->user()->id,
        ]);

        return $this->success(['item' => $item->load(['category','supplier','batches']), 'transaction' => $transaction], 'Stock adjusted');
    }

    public function transactions($id, Request $request)
    {
        $item = InventoryItem::findOrFail($id);
        $txs = $item->transactions()->with('creator')->orderBy('created_at','desc')->paginate($request->get('per_page', 15));
        return $this->success($txs);
    }

    public function batches($id, Request $request)
    {
        $item = InventoryItem::findOrFail($id);
        $batches = $item->batches()->with('creator')->orderBy('purchase_date','desc')->paginate($request->get('per_page', 15));
        // Also return summary
        $summary = [
            'total_batches' => $item->batches()->count(),
            'total_quantity' => $item->batches()->sum('remaining_quantity'),
            'total_value' => $item->batches()->sum(\Illuminate\Support\Facades\DB::raw('remaining_quantity * unit_cost')),
            'average_cost' => $item->batches()->where('remaining_quantity','>',0)->avg('unit_cost'),
        ];
        return $this->success(['batches' => $batches, 'summary' => $summary, 'item' => $item->load(['category','supplier'])]);
    }
}
