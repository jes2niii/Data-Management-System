<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class InventoryCategoryController extends Controller
{
    public function index()
    {
        $cats = InventoryCategory::withCount('items')->orderBy('sort_order')->orderBy('name')->get();
        return $this->success($cats);
    }

    public function store(Request $request)
    {
        $request->validate(['name'=>'required|string|max:255|unique:inventory_categories,name','description'=>'nullable|string|max:500','icon'=>'nullable|string|max:50','sort_order'=>'nullable|integer','is_active'=>'nullable|boolean']);
        $cat = InventoryCategory::create([
            'name'=>$request->name,
            'slug'=>Str::slug($request->name),
            'description'=>$request->description,
            'icon'=>$request->icon,
            'sort_order'=>$request->sort_order ?? 0,
            'is_active'=>$request->is_active ?? true,
        ]);
        return $this->success($cat, 'Category created', 201);
    }

    public function update(Request $request, $id)
    {
        $cat = InventoryCategory::findOrFail($id);
        $request->validate(['name'=>'sometimes|required|string|max:255|unique:inventory_categories,name,'.$id,'description'=>'nullable|string|max:500','icon'=>'nullable|string|max:50','sort_order'=>'nullable|integer','is_active'=>'nullable|boolean']);
        $data = $request->only(['name','description','icon','sort_order','is_active']);
        if (isset($data['name'])) $data['slug'] = Str::slug($data['name']);
        $cat->update($data);
        return $this->success($cat, 'Category updated');
    }

    public function destroy($id)
    {
        $cat = InventoryCategory::findOrFail($id);
        if ($cat->items()->count() > 0) {
            return $this->error('Cannot delete category with items. Move items first.', 400);
        }
        $cat->delete();
        return $this->success(null, 'Category deleted');
    }
}
