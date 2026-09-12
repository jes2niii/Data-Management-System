<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TrainingStoreRequest;
use App\Http\Requests\TrainingUpdateRequest;
use App\Models\Training;
use App\Models\TrainingPriceLog;
use Illuminate\Http\Request;

class TrainingController extends Controller
{
    public function index(Request $request)
    {
        $query = Training::with(['creator', 'updater'])->withCount('details');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('title', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        $sortBy = $request->get('sort_by', 'sort_order');
        $sortDir = $request->get('sort_dir', 'asc');
        if (in_array($sortBy, ['sort_order', 'name', 'title', 'code', 'fee', 'price', 'created_at'])) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('sort_order')->orderBy('name');
        }

        if ($request->has('per_page')) {
            $perPage = $request->get('per_page', 15);
            $trainings = $query->paginate($perPage);
            return $this->success($trainings);
        }

        // If no pagination requested and want all for dropdown
        $trainings = $query->get();
        return $this->success($trainings);
    }

    public function store(TrainingStoreRequest $request)
    {
        $data = $request->validated();
        $data['created_by'] = $request->user()->id;
        $data['updated_by'] = $request->user()->id;

        // Normalize name/title and price/fee
        if (empty($data['name']) && !empty($data['title'])) {
            $data['name'] = $data['title'];
        }
        if (empty($data['title']) && !empty($data['name'])) {
            $data['title'] = $data['name'];
        }
        if (empty($data['slug']) && !empty($data['title'])) {
            $data['slug'] = \Illuminate\Support\Str::slug($data['title']);
        }
        // Sync price and fee: fee is primary from seeder, price is legacy
        $effectiveFee = $data['fee'] ?? $data['price'] ?? 0;
        $data['fee'] = $effectiveFee;
        $data['price'] = $effectiveFee;

        $training = Training::create($data);

        // Log initial price creation
        TrainingPriceLog::create([
            'training_id' => $training->id,
            'old_price' => 0,
            'new_price' => $training->fee ?? $training->price,
            'old_training_price' => 0,
            'new_training_price' => $training->fee ?? $training->price,
            'source' => 'training',
            'notes' => 'Initial price',
            'changed_by' => $request->user()->id,
        ]);

        return $this->success($training->load(['creator']), 'Training created', 201);
    }

    public function show($id)
    {
        $training = Training::with(['creator', 'updater', 'details', 'priceLogs.changer'])->findOrFail($id);
        return $this->success($training);
    }

    public function update(TrainingUpdateRequest $request, $id)
    {
        $training = Training::findOrFail($id);
        $data = $request->validated();
        $data['updated_by'] = $request->user()->id;

        // Normalize name/title and price/fee
        if (isset($data['title']) && empty($data['name'])) {
            $data['name'] = $data['title'];
        }
        if (isset($data['name']) && empty($data['title'])) {
            $data['title'] = $data['name'];
        }
        if (isset($data['title']) && empty($data['slug'])) {
            // Keep existing slug if title changes but slug not provided, generate
            $data['slug'] = \Illuminate\Support\Str::slug($data['title']);
        }
        $priceProvided = array_key_exists('price', $data) || array_key_exists('fee', $data);
        $oldPrice = $training->fee ?? $training->price ?? 0;
        $oldFee = $training->fee ?? $training->price ?? 0;
        // Determine new effective price
        if (array_key_exists('fee', $data) && $data['fee'] !== null) {
            $newPrice = $data['fee'];
            $data['price'] = $newPrice;
            $data['fee'] = $newPrice;
        } elseif (array_key_exists('price', $data) && $data['price'] !== null) {
            $newPrice = $data['price'];
            $data['fee'] = $newPrice;
            $data['price'] = $newPrice;
        } else {
            $newPrice = $oldPrice;
        }

        $training->update($data);

        // Log price change if price/fee updated
        if ($priceProvided && (float)$oldPrice !== (float)$newPrice) {
            TrainingPriceLog::create([
                'training_id' => $training->id,
                'old_price' => $oldPrice,
                'new_price' => $newPrice,
                'old_training_price' => $oldFee,
                'new_training_price' => $newPrice,
                'source' => 'training',
                'notes' => 'Price updated via settings',
                'changed_by' => $request->user()->id,
            ]);
        }

        return $this->success($training->load(['creator', 'updater']), 'Training updated');
    }

    public function destroy($id)
    {
        $training = Training::findOrFail($id);
        $training->delete();
        return $this->success(null, 'Training deleted');
    }

    public function priceHistory($id)
    {
        $training = Training::findOrFail($id);
        $logs = TrainingPriceLog::with(['changer', 'training', 'detail'])
            ->where('training_id', $training->id)
            ->orderBy('created_at', 'desc')
            ->paginate(request('per_page', 20));

        return $this->success($logs);
    }

    public function allPriceLogs(Request $request)
    {
        $query = TrainingPriceLog::with(['changer', 'training', 'detail'])->orderBy('created_at', 'desc');

        if ($request->filled('training_id')) {
            $query->where('training_id', $request->training_id);
        }

        if ($request->filled('source')) {
            $query->where('source', $request->source);
        }

        $logs = $query->paginate($request->get('per_page', 20));
        return $this->success($logs);
    }

    public function stats()
    {
        $total = Training::count();
        $active = Training::where('is_active', true)->count();
        $totalPriceLogs = TrainingPriceLog::count();
        $avgPrice = Training::avg('price');

        return $this->success([
            'total_trainings' => $total,
            'active_trainings' => $active,
            'inactive_trainings' => $total - $active,
            'total_price_logs' => $totalPriceLogs,
            'avg_price' => $avgPrice,
        ]);
    }
}
