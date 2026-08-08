<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DocumentCategory;
use Illuminate\Http\Request;

class DocumentCategoryController extends Controller
{
    public function index()
    {
        return $this->success(DocumentCategory::where('is_active', true)->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $request->validate(['name' => 'required|string|max:255|unique:document_categories,name']);
        $category = DocumentCategory::create($request->only(['name', 'description', 'is_active']));
        return $this->success($category, 'Category created', 201);
    }

    public function update(Request $request, $id)
    {
        $category = DocumentCategory::findOrFail($id);
        $request->validate(['name' => 'sometimes|string|max:255|unique:document_categories,name,' . $id]);
        $category->update($request->only(['name', 'description', 'is_active']));
        return $this->success($category, 'Category updated');
    }

    public function destroy($id)
    {
        DocumentCategory::findOrFail($id)->delete();
        return $this->success(null, 'Category deleted');
    }
}
