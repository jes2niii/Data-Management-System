<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BookInventory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BookInventoryController extends Controller
{
    public function index(Request $request)
    {
        $query = BookInventory::with(['category','creator'])->orderBy('title');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search){
                $q->where('title','like',"%{$search}%")
                  ->orWhere('alternative_references','like',"%{$search}%")
                  ->orWhere('author','like',"%{$search}%");
            });
        }
        if ($request->filled('category_id')) {
            $query->where('book_category_id', $request->category_id);
        }
        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $perPage = $request->get('per_page', 15);
        $books = $query->paginate($perPage);
        // Append file_url
        $books->getCollection()->transform(function($book){
            $book->file_url = $book->file_url;
            return $book;
        });
        return $this->success($books);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'book_category_id' => 'nullable|exists:book_categories,id',
            'references' => 'nullable|string|max:255',
            'alternative_references' => 'nullable|string|max:2000',
            'link' => 'nullable|url|max:500',
            'file' => 'nullable|file|max:51200|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,zip,epub,mobi',
            'description' => 'nullable|string|max:2000',
            'author' => 'nullable|string|max:255',
            'publisher' => 'nullable|string|max:255',
            'year' => 'nullable|string|max:10',
            'edition' => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
        ]);

        $data = $request->only(['title','book_category_id','references','alternative_references','link','description','author','publisher','year','edition','is_active']);
        $data['created_by'] = $request->user()->id;
        $data['updated_by'] = $request->user()->id;
        $data['is_active'] = $data['is_active'] ?? true;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->store('books', 'public');
            $data['file_path'] = $path;
            $data['file_name'] = $file->getClientOriginalName();
            $data['file_type'] = $file->getClientOriginalExtension();
            $data['file_size'] = $file->getSize();
        }

        $book = BookInventory::create($data);
        return $this->success($book->load(['category','creator']), 'Book created', 201);
    }

    public function show($id)
    {
        $book = BookInventory::with(['category','creator','updater'])->findOrFail($id);
        $book->file_url = $book->file_url;
        return $this->success($book);
    }

    public function update(Request $request, $id)
    {
        $book = BookInventory::findOrFail($id);
        $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'book_category_id' => 'nullable|exists:book_categories,id',
            'references' => 'nullable|string|max:255',
            'alternative_references' => 'nullable|string|max:2000',
            'link' => 'nullable|url|max:500',
            'file' => 'nullable|file|max:51200|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,zip,epub,mobi',
            'description' => 'nullable|string|max:2000',
            'author' => 'nullable|string|max:255',
            'publisher' => 'nullable|string|max:255',
            'year' => 'nullable|string|max:10',
            'edition' => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
        ]);

        $data = $request->only(['title','book_category_id','references','alternative_references','link','description','author','publisher','year','edition','is_active']);
        $data['updated_by'] = $request->user()->id;

        if ($request->hasFile('file')) {
            // Delete old file
            if ($book->file_path) {
                Storage::disk('public')->delete($book->file_path);
            }
            $file = $request->file('file');
            $path = $file->store('books', 'public');
            $data['file_path'] = $path;
            $data['file_name'] = $file->getClientOriginalName();
            $data['file_type'] = $file->getClientOriginalExtension();
            $data['file_size'] = $file->getSize();
        }

        // Handle link/file removal if requested
        if ($request->has('remove_file') && $request->boolean('remove_file')) {
            if ($book->file_path) Storage::disk('public')->delete($book->file_path);
            $data['file_path'] = null;
            $data['file_name'] = null;
            $data['file_type'] = null;
            $data['file_size'] = null;
        }

        $book->update($data);
        return $this->success($book->load(['category','creator']), 'Book updated');
    }

    public function destroy($id)
    {
        $book = BookInventory::findOrFail($id);
        if ($book->file_path) {
            Storage::disk('public')->delete($book->file_path);
        }
        $book->delete();
        return $this->success(null, 'Book deleted');
    }

    public function download($id)
    {
        $book = BookInventory::findOrFail($id);
        if (!$book->file_path || !Storage::disk('public')->exists($book->file_path)) {
            return $this->error('File not found', 404);
        }
        return Storage::disk('public')->download($book->file_path, $book->file_name ?? basename($book->file_path));
    }

    public function preview($id)
    {
        $book = BookInventory::findOrFail($id);
        if (!$book->file_path || !Storage::disk('public')->exists($book->file_path)) {
            return $this->error('File not found', 404);
        }
        $mime = Storage::disk('public')->mimeType($book->file_path) ?? 'application/octet-stream';
        $headers = [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="' . ($book->file_name ?? basename($book->file_path)) . '"',
        ];
        return response()->file(Storage::disk('public')->path($book->file_path), $headers);
    }

    public function view($id)
    {
        $book = BookInventory::with(['category','creator'])->findOrFail($id);
        if (!$book->file_path) {
            return $this->error('No file available for this book', 404);
        }
        if (!Storage::disk('public')->exists($book->file_path)) {
            return $this->error('File not found on server', 404);
        }
        $book->file_url = $book->file_url;
        $book->preview_url = url("/api/book-inventories/{$book->id}/preview");
        $book->has_file = true;
        return $this->success($book);
    }

    public function stats()
    {
        $total = BookInventory::count();
        $active = BookInventory::where('is_active', true)->count();
        $withFile = BookInventory::whereNotNull('file_path')->count();
        $withLink = BookInventory::whereNotNull('link')->count();
        $byCategory = BookInventory::leftJoin('book_categories','book_inventories.book_category_id','=','book_categories.id')
            ->selectRaw('COALESCE(book_categories.name, "Uncategorized") as category, COUNT(*) as count')
            ->groupBy('category')
            ->orderByDesc('count')
            ->get();
        return $this->success([
            'total' => $total,
            'active' => $active,
            'with_file' => $withFile,
            'with_link' => $withLink,
            'by_category' => $byCategory,
        ]);
    }
}
