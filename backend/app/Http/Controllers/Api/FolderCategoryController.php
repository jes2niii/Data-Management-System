<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FolderCategory;
use Illuminate\Http\Request;

class FolderCategoryController extends Controller
{
    public function index()
    {
        return $this->success(FolderCategory::where('is_active', true)->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $request->validate(['name' => 'required|string|max:255|unique:folder_categories,name']);
        $category = FolderCategory::create($request->only(['name', 'description', 'is_active']));
        return $this->success($category, 'Category created', 201);
    }

    public function update(Request $request, $id)
    {
        $category = FolderCategory::findOrFail($id);
        $request->validate(['name' => 'sometimes|string|max:255|unique:folder_categories,name,' . $id]);
        $category->update($request->only(['name', 'description', 'is_active']));
        return $this->success($category, 'Category updated');
    }

    public function destroy($id)
    {
        FolderCategory::findOrFail($id)->delete();
        return $this->success(null, 'Category deleted');
    }
}
