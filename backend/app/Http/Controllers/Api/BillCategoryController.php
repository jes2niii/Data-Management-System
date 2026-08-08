<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BillCategory;
use Illuminate\Http\Request;

class BillCategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = BillCategory::withCount('bills');

        if ($request->filled('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        $categories = $query->orderBy('name')->get();

        return $this->success($categories);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:bill_categories,name',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $category = BillCategory::create($request->all());

        return $this->success($category, 'Category created', 201);
    }

    public function update(Request $request, $id)
    {
        $category = BillCategory::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|max:255|unique:bill_categories,name,' . $id,
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $category->update($request->all());

        return $this->success($category, 'Category updated');
    }

    public function destroy($id)
    {
        $category = BillCategory::findOrFail($id);
        $category->delete();

        return $this->success(null, 'Category deleted');
    }
}
