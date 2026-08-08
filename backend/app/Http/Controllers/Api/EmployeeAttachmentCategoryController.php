<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeAttachmentCategory;
use Illuminate\Http\Request;

class EmployeeAttachmentCategoryController extends Controller
{
    public function index()
    {
        return $this->success(EmployeeAttachmentCategory::where('is_active', true)->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $request->validate(['name' => 'required|string|max:255|unique:employee_attachment_categories,name']);
        $category = EmployeeAttachmentCategory::create($request->only(['name', 'description', 'is_active']));
        return $this->success($category, 'Category created', 201);
    }

    public function update(Request $request, $id)
    {
        $category = EmployeeAttachmentCategory::findOrFail($id);
        $request->validate(['name' => 'sometimes|string|max:255|unique:employee_attachment_categories,name,' . $id]);
        $category->update($request->only(['name', 'description', 'is_active']));
        return $this->success($category, 'Category updated');
    }

    public function destroy($id)
    {
        EmployeeAttachmentCategory::findOrFail($id)->delete();
        return $this->success(null, 'Category deleted');
    }
}
