<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TrainingDetailStoreRequest;
use App\Http\Requests\TrainingDetailUpdateRequest;
use App\Models\TrainingDetail;
use App\Models\TrainingPriceLog;
use Illuminate\Http\Request;

class TrainingDetailController extends Controller
{
    public function index(Request $request)
    {
        $query = TrainingDetail::with(['training', 'creator', 'updater']);

        if ($request->filled('training_id')) {
            $query->where('training_id', $request->training_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $query->orderBy('created_at', 'desc');

        if ($request->has('per_page')) {
            $details = $query->paginate($request->get('per_page', 15));
            return $this->success($details);
        }

        $details = $query->get();
        return $this->success($details);
    }

    public function store(TrainingDetailStoreRequest $request)
    {
        $data = $request->validated();
        $data['created_by'] = $request->user()->id;
        $data['updated_by'] = $request->user()->id;

        $detail = TrainingDetail::create($data);

        // Log creation as price log
        TrainingPriceLog::create([
            'training_id' => $detail->training_id,
            'training_detail_id' => $detail->id,
            'old_price' => 0,
            'new_price' => $detail->price,
            'source' => 'training_detail',
            'notes' => 'Training detail created: ' . $detail->title,
            'changed_by' => $request->user()->id,
        ]);

        return $this->success($detail->load(['training', 'creator']), 'Training detail created', 201);
    }

    public function show($id)
    {
        $detail = TrainingDetail::with(['training', 'creator', 'updater', 'priceLogs.changer'])->findOrFail($id);
        return $this->success($detail);
    }

    public function update(TrainingDetailUpdateRequest $request, $id)
    {
        $detail = TrainingDetail::findOrFail($id);
        $data = $request->validated();
        $data['updated_by'] = $request->user()->id;

        $oldPrice = $detail->price;
        $newPrice = $data['price'] ?? $oldPrice;

        $detail->update($data);

        if (isset($data['price']) && (float)$oldPrice !== (float)$newPrice) {
            TrainingPriceLog::create([
                'training_id' => $detail->training_id,
                'training_detail_id' => $detail->id,
                'old_price' => $oldPrice,
                'new_price' => $newPrice,
                'source' => 'training_detail',
                'notes' => 'Training detail price updated: ' . $detail->title,
                'changed_by' => $request->user()->id,
            ]);
        }

        return $this->success($detail->load(['training', 'creator', 'updater']), 'Training detail updated');
    }

    public function destroy($id)
    {
        $detail = TrainingDetail::findOrFail($id);
        $detail->delete();
        return $this->success(null, 'Training detail deleted');
    }

    public function priceHistory($id)
    {
        $detail = TrainingDetail::findOrFail($id);
        $logs = TrainingPriceLog::with(['changer'])
            ->where('training_detail_id', $detail->id)
            ->orderBy('created_at', 'desc')
            ->paginate(request('per_page', 20));
        return $this->success($logs);
    }
}
