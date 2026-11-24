<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Folder;
use Illuminate\Http\Request;

class FolderController extends Controller
{
    public function index(Request $request)
    {
        $query = Folder::with(['creator:id,name'])->withCount([
            'documents' => fn ($query) => $query->visibleTo($request->user()),
            'children',
        ]);

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
        $visible = fn ($query) => $query->visibleTo(request()->user());
        $folder = Folder::with(['creator:id,name', 'parent', 'children', 'documents' => $visible])
            ->withCount(['documents' => $visible, 'children'])
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

        if ($request->has('parent_id') && $request->parent_id !== null) {
            $this->assertValidParent($folder, (int) $request->parent_id);
        }

        $folder->update($request->only(['name', 'parent_id', 'category', 'is_public']));

        return $this->success($folder->load('creator'), 'Folder updated');
    }

    public function destroy($id)
    {
        $folder = Folder::findOrFail($id);

        abort_if($folder->children()->exists(), 409, 'Move or delete the subfolders before deleting this folder.');
        abort_if($folder->documents()->exists(), 409, 'Move or delete the documents before deleting this folder.');

        $folder->delete();

        return $this->success(null, 'Folder deleted');
    }

    private function assertValidParent(Folder $folder, int $parentId): void
    {
        abort_if($parentId === (int) $folder->id, 422, 'A folder cannot be its own parent.');

        $seen = [];
        $cursor = Folder::find($parentId);
        while ($cursor !== null) {
            abort_if((int) $cursor->id === (int) $folder->id, 422, 'A folder cannot be moved beneath one of its own subfolders.');
            if (isset($seen[$cursor->id])) {
                break; // A pre-existing cycle elsewhere already makes the tree invalid.
            }
            $seen[$cursor->id] = true;
            $cursor = $cursor->parent_id ? Folder::find($cursor->parent_id) : null;
        }
    }

    public function tree()
    {
        $allFolders = Folder::withCount([
            'documents' => fn ($query) => $query->visibleTo(request()->user()),
            'children',
        ])->get();

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
