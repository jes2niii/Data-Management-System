<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventorySupplier;
use Illuminate\Http\Request;

class InventorySupplierController extends Controller
{
    public function index(Request $request)
    {
        $query = InventorySupplier::withCount('items')->orderBy('name');
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search){
                $q->where('name','like',"%{$search}%")->orWhere('code','like',"%{$search}%");
            });
        }
        $suppliers = $query->get();
        return $this->success($suppliers);
    }

    public function store(Request $request)
    {
        $request->validate(['name'=>'required|string|max:255','code'=>'nullable|string|max:50|unique:inventory_suppliers,code','contact_person'=>'nullable|string|max:255','email'=>'nullable|email|max:255','phone'=>'nullable|string|max:50','address'=>'nullable|string|max:500']);
        $sup = InventorySupplier::create($request->only(['name','code','contact_person','email','phone','address','is_active']));
        return $this->success($sup, 'Supplier created', 201);
    }

    public function show($id)
    {
        $sup = InventorySupplier::withCount('items')->findOrFail($id);
        return $this->success($sup);
    }

    public function update(Request $request, $id)
    {
        $sup = InventorySupplier::findOrFail($id);
        $request->validate(['name'=>'sometimes|required|string|max:255','code'=>'nullable|string|max:50|unique:inventory_suppliers,code,'.$id,'contact_person'=>'nullable|string|max:255','email'=>'nullable|email|max:255','phone'=>'nullable|string|max:50','address'=>'nullable|string|max:500']);
        $sup->update($request->only(['name','code','contact_person','email','phone','address','is_active']));
        return $this->success($sup, 'Supplier updated');
    }

    public function destroy($id)
    {
        $sup = InventorySupplier::findOrFail($id);
        if ($sup->items()->count() > 0) {
            return $this->error('Cannot delete supplier with items.', 400);
        }
        $sup->delete();
        return $this->success(null, 'Supplier deleted');
    }
}
