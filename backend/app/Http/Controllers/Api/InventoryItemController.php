<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\InventoryItemStoreRequest;
use App\Http\Requests\InventoryItemUpdateRequest;
use App\Models\InventoryBatch;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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
        $item = DB::transaction(function () use ($data, $request) {
            $item = InventoryItem::create($data);

            // Log initial stock as a batch and ledger entry so totals stay in sync.
            if ((float) $item->quantity > 0) {
                $this->addBatch($item, (float) $item->quantity, (float) $item->unit_cost,
                    now()->toDateString(), 'INIT-'.$item->sku, 'Initial stock', $request->user()->id);
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

            return $item;
        }, 3);

        return $this->success($item->load(['category','supplier','department']), 'Inventory item created', 201);
    }

    public function show($id)
    {
        $item = InventoryItem::with(['category','supplier','department','creator','updater','transactions.creator'])->findOrFail($id);
        return $this->success($item);
    }

    public function update(InventoryItemUpdateRequest $request, $id)
    {
        $data = $request->validated();
        $data['updated_by'] = $request->user()->id;

        $item = DB::transaction(function () use ($data, $request, $id) {
            $item = InventoryItem::lockForUpdate()->findOrFail($id);
            $oldQty = (float) $item->quantity;
            $newQty = isset($data['quantity']) ? (float) $data['quantity'] : $oldQty;
            $unitCost = isset($data['unit_cost']) ? (float) $data['unit_cost'] : (float) $item->unit_cost;
            $item->update($data);

            if (abs($oldQty - $newQty) > 0.01) {
                $diff = $newQty - $oldQty;
                if ($diff > 0) {
                    $this->addBatch($item, $diff, $unitCost, now()->toDateString(),
                        'EDIT-'.$item->id.'-'.now()->timestamp, 'Quantity adjustment via edit', $request->user()->id);
                } else {
                    $this->consumeBatches($item, abs($diff));
                }

                InventoryTransaction::create([
                    'inventory_item_id' => $item->id,
                    'type' => $diff > 0 ? 'in' : 'out',
                    'quantity' => abs($diff),
                    'balance_after' => $newQty,
                    'unit_cost' => $unitCost,
                    'reference_number' => 'ADJ-'.now()->timestamp,
                    'notes' => 'Quantity adjustment via edit',
                    'created_by' => $request->user()->id,
                ]);
                if ($diff > 0) {
                    $item->update(['last_restocked_at' => now()->toDateString()]);
                }
            }

            return $item;
        }, 3);

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

        $lowStockItems = (clone $base)->with(['category','supplier'])
            ->whereIn('status', ['low_stock', 'out_of_stock'])->orderBy('quantity')->limit(10)->get();

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
        $data = $request->validate([
            'type' => 'required|string|in:in,out,adjustment',
            'quantity' => 'required|numeric|min:0.01',
            'unit_cost' => 'nullable|numeric|min:0',
            'purchase_date' => 'nullable|date',
            'reference_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:500',
        ]);

        $result = DB::transaction(function () use ($data, $request, $id) {
            $item = InventoryItem::lockForUpdate()->findOrFail($id);
            $qty = (float) $data['quantity'];
            $oldQty = (float) $item->quantity;
            $unitCost = array_key_exists('unit_cost', $data) && $data['unit_cost'] !== null
                ? (float) $data['unit_cost'] : (float) $item->unit_cost;
            $purchaseDate = !empty($data['purchase_date']) ? $data['purchase_date'] : now()->toDateString();
            $reference = $data['reference_number'] ?? 'ADJ-'.now()->timestamp;

            if ($data['type'] === 'in') {
                $newQty = $oldQty + $qty;
                $this->addBatch($item, $qty, $unitCost, $purchaseDate, $reference,
                    $data['notes'] ?? 'Stock in on '.$purchaseDate, $request->user()->id);
            } elseif ($data['type'] === 'out') {
                abort_if($qty > $oldQty, 400, 'Insufficient stock. Available: '.$oldQty);
                $newQty = $oldQty - $qty;
                $this->consumeBatches($item, $qty);
            } else { // adjustment: set the item to the exact quantity
                $newQty = $qty;
                if ($newQty > $oldQty) {
                    $added = $newQty - $oldQty;
                    $this->addBatch($item, $added, $unitCost, $purchaseDate, $reference,
                        'Adjustment up', $request->user()->id);
                } elseif ($newQty < $oldQty) {
                    $this->consumeBatches($item, $oldQty - $newQty);
                }
            }

            $item->update([
                'quantity' => $newQty,
                'unit_cost' => $data['unit_cost'] ?? $item->unit_cost,
                'updated_by' => $request->user()->id,
                'last_restocked_at' => $data['type'] === 'in' ? $purchaseDate : $item->last_restocked_at,
            ]);

            $transaction = InventoryTransaction::create([
                'inventory_item_id' => $item->id,
                'type' => $data['type'],
                'quantity' => $data['type'] === 'adjustment' ? abs($newQty - $oldQty) : $qty,
                'balance_after' => $newQty,
                'unit_cost' => $data['unit_cost'] ?? $item->unit_cost,
                'reference_number' => $reference,
                'notes' => trim(($data['notes'] ?? '').' | Purchase date: '.$purchaseDate, ' |'),
                'created_by' => $request->user()->id,
            ]);

            return ['item' => $item, 'transaction' => $transaction];
        }, 3);

        return $this->success([
            'item' => $result['item']->load(['category','supplier','batches']),
            'transaction' => $result['transaction'],
        ], 'Stock adjusted');
    }

    private function addBatch(InventoryItem $item, float $quantity, float $unitCost, string $purchaseDate,
        string $reference, ?string $notes, int $userId): InventoryBatch
    {
        return InventoryBatch::create([
            'inventory_item_id' => $item->id,
            'batch_number' => 'BATCH-'.$item->id.'-'.now()->format('YmdHisv').'-'.random_int(100, 999),
            'purchase_date' => $purchaseDate,
            'quantity' => $quantity,
            'remaining_quantity' => $quantity,
            'unit_cost' => $unitCost,
            'total_cost' => round($quantity * $unitCost, 2),
            'supplier' => $item->supplier?->name,
            'reference_number' => $reference,
            'notes' => $notes,
            'created_by' => $userId,
        ]);
    }

    /**
     * Deduct stock from the oldest batches first. Batch data can lag behind the
     * item quantity on legacy records, so any shortfall is reported rather than
     * silently guessed at.
     */
    private function consumeBatches(InventoryItem $item, float $quantity): void
    {
        $remaining = $quantity;
        $batches = InventoryBatch::where('inventory_item_id', $item->id)
            ->where('remaining_quantity', '>', 0)
            ->orderBy('purchase_date')->orderBy('id')->lockForUpdate()->get();

        foreach ($batches as $batch) {
            if ($remaining <= 0) {
                break;
            }
            $deduct = min((float) $batch->remaining_quantity, $remaining);
            $batch->update(['remaining_quantity' => round((float) $batch->remaining_quantity - $deduct, 2)]);
            $remaining -= $deduct;
        }

        if ($remaining > 0.009) {
            Log::warning('Inventory batches do not cover a stock decrease; reconcile batch records.', [
                'inventory_item_id' => $item->id,
                'unallocated_quantity' => round($remaining, 2),
            ]);
        }
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
        // Also return summary. Average cost is weighted by the remaining quantity.
        $live = $item->batches()->where('remaining_quantity', '>', 0);
        $remainingQty = (clone $live)->sum('remaining_quantity');
        $remainingValue = (clone $live)->sum(DB::raw('remaining_quantity * unit_cost'));
        $summary = [
            'total_batches' => $item->batches()->count(),
            'total_quantity' => $item->batches()->sum('remaining_quantity'),
            'total_value' => $item->batches()->sum(DB::raw('remaining_quantity * unit_cost')),
            'average_cost' => $remainingQty > 0 ? round($remainingValue / $remainingQty, 2) : null,
        ];
        return $this->success(['batches' => $batches, 'summary' => $summary, 'item' => $item->load(['category','supplier'])]);
    }
}
