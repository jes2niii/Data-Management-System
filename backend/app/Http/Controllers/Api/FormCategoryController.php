<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FormCategory;
use Illuminate\Http\Request;

class FormCategoryController extends Controller
{
    public function index()
    {
        $categories = FormCategory::where('is_active', true)->orderBy('name')->get();
        return $this->success($categories);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:form_categories,name',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $category = FormCategory::create($request->only(['name', 'description', 'is_active']));

        return $this->success($category, 'Category created', 201);
    }

    public function update(Request $request, $id)
    {
        $category = FormCategory::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|max:255|unique:form_categories,name,' . $id,
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $category->update($request->only(['name', 'description', 'is_active']));

        return $this->success($category, 'Category updated');
    }

    public function destroy($id)
    {
        FormCategory::findOrFail($id)->delete();
        return $this->success(null, 'Category deleted');
    }
}
