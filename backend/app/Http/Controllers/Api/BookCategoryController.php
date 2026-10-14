<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BookCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BookCategoryController extends Controller
{
    public function index()
    {
        $cats = BookCategory::withCount('books')->orderBy('sort_order')->orderBy('name')->get();
        return $this->success($cats);
    }

    public function store(Request $request)
    {
        $request->validate(['name'=>'required|string|max:255|unique:book_categories,name','description'=>'nullable|string|max:500','icon'=>'nullable|string|max:50','sort_order'=>'nullable|integer','is_active'=>'nullable|boolean']);
        $cat = BookCategory::create([
            'name'=>$request->name,
            'slug'=>Str::slug($request->name),
            'description'=>$request->description,
            'icon'=>$request->icon,
            'sort_order'=>$request->sort_order ?? 0,
            'is_active'=>$request->is_active ?? true,
            'created_by'=>$request->user()->id,
        ]);
        return $this->success($cat, 'Category created', 201);
    }

    public function show($id)
    {
        return $this->success(BookCategory::withCount('books')->findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $cat = BookCategory::findOrFail($id);
        $request->validate(['name'=>'sometimes|required|string|max:255|unique:book_categories,name,'.$id,'description'=>'nullable|string|max:500','icon'=>'nullable|string|max:50','sort_order'=>'nullable|integer','is_active'=>'nullable|boolean']);
        $data = $request->only(['name','description','icon','sort_order','is_active']);
        if (isset($data['name'])) $data['slug'] = Str::slug($data['name']);
        $cat->update($data);
        return $this->success($cat, 'Category updated');
    }

    public function destroy($id)
    {
        $cat = BookCategory::findOrFail($id);
        if ($cat->books()->count() > 0) {
            return $this->error('Cannot delete category with books. Move books first.', 400);
        }
        $cat->delete();
        return $this->success(null, 'Category deleted');
    }
}
