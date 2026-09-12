<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupplyInventory;
use Illuminate\Http\Request;

class SupplyInventoryController extends Controller
{
    public function index(Request $request)
    {
        $query = SupplyInventory::orderBy('description')->orderBy('date','desc');
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function($q) use ($s){
                $q->where('description','like',"%{$s}%")->orWhere('unit','like',"%{$s}%")->orWhere('remarks','like',"%{$s}%");
            });
        }
        if ($request->filled('date')) $query->whereDate('date', $request->date);
        $data = $query->paginate($request->get('per_page', 15));
        return $this->success($data);
    }

    public function store(Request $request)
    {
        $request->validate([
            'date' => 'nullable|date',
            'description' => 'required|string|max:255',
            'beg_balance' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'unit_price' => 'nullable|numeric|min:0',
            'date_out' => 'nullable|date',
            'qty_out' => 'nullable|numeric|min:0',
            'date_in' => 'nullable|date',
            'qty_in' => 'nullable|numeric|min:0',
            'remarks' => 'nullable|string|max:500',
        ]);
        $data = $request->only(['date','description','beg_balance','unit','unit_price','date_out','qty_out','date_in','qty_in','remarks']);
        $data['created_by'] = $request->user()->id;
        $item = SupplyInventory::create($data);
        return $this->success($item, 'Supply item created', 201);
    }

    public function show($id)
    {
        return $this->success(SupplyInventory::findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $item = SupplyInventory::findOrFail($id);
        $request->validate([
            'date' => 'nullable|date',
            'description' => 'sometimes|required|string|max:255',
            'beg_balance' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'unit_price' => 'nullable|numeric|min:0',
            'date_out' => 'nullable|date',
            'qty_out' => 'nullable|numeric|min:0',
            'date_in' => 'nullable|date',
            'qty_in' => 'nullable|numeric|min:0',
            'remarks' => 'nullable|string|max:500',
        ]);
        $item->update($request->only(['date','description','beg_balance','unit','unit_price','date_out','qty_out','date_in','qty_in','remarks']));
        return $this->success($item, 'Supply item updated');
    }

    public function destroy($id)
    {
        SupplyInventory::findOrFail($id)->delete();
        return $this->success(null, 'Supply item deleted');
    }

    public function stats()
    {
        $total = SupplyInventory::count();
        $low = SupplyInventory::where('total_balance','<=',3)->count();
        $out = SupplyInventory::where('total_balance','=',0)->count();
        return $this->success(['total'=>$total,'low_stock'=>$low,'out_of_stock'=>$out, 'total_balance'=>SupplyInventory::sum('total_balance')]);
    }
}
