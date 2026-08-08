<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Folder;
use Illuminate\Http\Request;

class FolderController extends Controller
{
    public function index(Request $request)
    {
        $query = Folder::with(['creator'])->withCount(['documents', 'children']);

        if ($request->filled('parent_id')) {
            $query->where('parent_id', $request->parent_id);
        } else {
            $query->whereNull('parent_id');
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('name', 'like', "%{$search}%");
        }

        $folders = $query->orderBy('name')->get();

        return $this->success($folders);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'parent_id' => 'nullable|exists:folders,id',
            'category' => 'nullable|string|max:100',
            'folder_category_id' => 'nullable|exists:folder_categories,id',
            'is_public' => 'boolean',
        ]);

        $folder = Folder::create([
            'name' => $request->name,
            'parent_id' => $request->parent_id,
            'category' => $request->category ?? 'general',
            'folder_category_id' => $request->folder_category_id,
            'is_public' => $request->is_public ?? false,
            'created_by' => $request->user()->id,
        ]);

        return $this->success($folder->load('creator'), 'Folder created', 201);
    }

    public function show($id)
    {
        $folder = Folder::with(['creator', 'parent', 'children', 'documents'])
            ->withCount(['documents', 'children'])
            ->findOrFail($id);

        return $this->success($folder);
    }

    public function update(Request $request, $id)
    {
        $folder = Folder::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'parent_id' => 'nullable|exists:folders,id',
            'category' => 'sometimes|string|max:100',
            'is_public' => 'boolean',
        ]);

        $folder->update($request->only(['name', 'parent_id', 'category', 'is_public']));

        return $this->success($folder->load('creator'), 'Folder updated');
    }

    public function destroy($id)
    {
        $folder = Folder::findOrFail($id);
        $folder->delete();

        return $this->success(null, 'Folder deleted');
    }

    public function tree()
    {
        $allFolders = Folder::withCount(['documents', 'children'])->get();

        $tree = $this->buildTree($allFolders);

        return $this->success($tree);
    }

    private function buildTree($folders, $parentId = null)
    {
        $branch = [];

        foreach ($folders as $folder) {
            if ($folder->parent_id === $parentId) {
                $children = $this->buildTree($folders, $folder->id);
                $data = $folder->toArray();
                $data['children'] = $children;
                $branch[] = $data;
            }
        }

        return $branch;
    }
}
