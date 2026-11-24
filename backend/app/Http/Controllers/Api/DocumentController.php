<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\DocumentAccess;
use App\Models\DocumentComment;
use App\Models\DocumentShare;
use App\Models\DocumentVersion;
use App\Models\Folder;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class DocumentController extends Controller
{
    public function index(Request $request)
    {
        $query = $this->visibleDocuments()->with(['folder', 'creator:id,name', 'updater:id,name', 'documentCategory']);

        if ($request->has('folder_id')) {
            $query->where('folder_id', $request->folder_id ?: null);
        } else {
            $query->whereNull('folder_id');
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('approval_status')) {
            $query->where('approval_status', $request->approval_status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('original_name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('tags')) {
            $tags = explode(',', $request->tags);
            $query->where(function ($q) use ($tags) {
                foreach ($tags as $tag) {
                    $q->orWhereJsonContains('tags', trim($tag));
                }
            });
        }

        if ($request->filled('is_favorite')) {
            $query->where('is_favorite', $request->is_favorite);
        }

        $documents = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return $this->success($documents);
    }

    public function store(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:51200',
            'folder_id' => 'nullable|exists:folders,id',
            'name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'document_category_id' => 'nullable|exists:document_categories,id',
            'tags' => 'nullable|array',
            'labels' => 'nullable|array',
            'status' => 'nullable|string|in:draft,published,archived',
            'expiration_date' => 'nullable|date',
            'access_type' => 'nullable|string|in:department,user,all',
            'access_ids' => 'required_if:access_type,user,department|nullable|array|min:1',
            'access_ids.*' => $this->accessIdRules($request),
        ]);

        $file = $request->file('file');
        $path = $file->store('documents', 'documents');

        try {
            $document = DB::transaction(function () use ($request, $file, $path) {
                $document = Document::create([
                    'folder_id' => $request->folder_id,
                    'name' => $request->name ?? $file->getClientOriginalName(),
                    'original_name' => $file->getClientOriginalName(),
                    'file_path' => $path,
                    'file_type' => $file->getClientOriginalExtension(),
                    'file_size' => $file->getSize(),
                    'mime_type' => $file->getMimeType(),
                    'version' => 1,
                    'description' => $request->description,
                    'category' => $request->category,
                    'document_category_id' => $request->document_category_id,
                    'tags' => $request->tags,
                    'labels' => $request->labels,
                    'status' => $request->status ?? 'draft',
                    'expiration_date' => $request->expiration_date,
                    'created_by' => $request->user()->id,
                ]);
                $this->saveAccess($document, $request);

                return $document;
            });
        } catch (\Throwable $exception) {
            Storage::disk('documents')->delete($path);
            throw $exception;
        }

        return $this->success($document->load(['folder', 'creator:id,name']), 'Document uploaded', 201);
    }

    public function show($id)
    {
        $document = $this->visibleDocuments()->with([
            'folder', 'creator:id,name', 'updater:id,name', 'locker:id,name', 'approver:id,name',
            'versions' => function ($q) { $q->limit(5); },
        ])->findOrFail($id);

        return $this->success($document);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'folder_id' => 'nullable|exists:folders,id',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'tags' => 'nullable|array',
            'labels' => 'nullable|array',
            'status' => 'nullable|string|in:draft,published,archived',
            'expiration_date' => 'nullable|date',
            'access_type' => 'nullable|string|in:department,user,all',
            'access_ids' => 'required_if:access_type,user,department|nullable|array|min:1',
            'access_ids.*' => $this->accessIdRules($request),
        ]);

        $data = $request->only([
            'name', 'folder_id', 'description', 'category',
            'tags', 'labels', 'status', 'expiration_date',
        ]);
        $data['updated_by'] = $request->user()->id;

        $document = DB::transaction(function () use ($id, $data, $request) {
            $document = $this->visibleDocuments()->lockForUpdate()->findOrFail($id);
            $document->update($data);
            if ($request->filled('access_type')) {
                $document->access()->delete();
                $this->saveAccess($document, $request);
            }

            return $document;
        });

        return $this->success($document->load(['folder', 'creator:id,name', 'updater:id,name', 'access']), 'Document updated');
    }

    public function destroy($id)
    {
        $document = $this->visibleDocuments()->findOrFail($id);
        $document->delete();

        return $this->success(null, 'Document moved to trash');
    }

    public function download($id)
    {
        $document = $this->visibleDocuments()->findOrFail($id);

        $disk = $this->documentDisk($document);
        if (!$disk->exists($document->file_path)) {
            return $this->error('File not found', 404);
        }

        return $disk->download(
            $document->file_path,
            $document->original_name,
            ['Content-Type' => 'application/octet-stream', 'X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'private, no-store']
        );
    }

    public function preview($id)
    {
        $document = $this->visibleDocuments()->findOrFail($id);

        $disk = $this->documentDisk($document);
        if (!$disk->exists($document->file_path)) {
            return $this->error('File not found', 404);
        }

        $mime = $disk->mimeType($document->file_path);
        $safeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'text/plain'];
        abort_unless(in_array($mime, $safeTypes, true), 415, 'Preview is not available for this file type.');

        return $disk->response(
            $document->file_path,
            $document->original_name,
            ['Content-Type' => $mime, 'X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'private, no-store']
        );
    }

    public function newVersion(Request $request, $id)
    {
        $this->visibleDocuments()->findOrFail($id);

        $request->validate([
            'file' => 'required|file|max:51200',
            'changes' => 'nullable|string|max:2000',
        ]);

        $file = $request->file('file');
        $path = $file->store('documents', 'documents');

        try {
            $document = DB::transaction(function () use ($id, $request, $file, $path) {
                $document = $this->visibleDocuments()->lockForUpdate()->findOrFail($id);
                $newVersion = $document->version + 1;

                DocumentVersion::create([
                    'document_id' => $document->id,
                    'version_number' => $document->version,
                    'file_path' => $document->file_path,
                    'file_size' => $document->file_size,
                    'changes' => $request->input('changes'),
                    'created_by' => $document->updated_by ?? $document->created_by,
                    'created_at' => $document->updated_at ?? $document->created_at,
                ]);

                $document->update([
                    'file_path' => $path,
                    'file_type' => $file->getClientOriginalExtension(),
                    'file_size' => $file->getSize(),
                    'mime_type' => $file->getMimeType(),
                    'version' => $newVersion,
                    'original_name' => $file->getClientOriginalName(),
                    'updated_by' => $request->user()->id,
                ]);

                return $document;
            });
        } catch (\Throwable $exception) {
            Storage::disk('documents')->delete($path);
            throw $exception;
        }

        return $this->success($document->load('versions'), 'New version uploaded');
    }

    public function versions($id)
    {
        $document = $this->visibleDocuments()->findOrFail($id);
        $versions = $document->versions()->with('creator:id,name')->get();

        return $this->success($versions);
    }

    public function restore($id)
    {
        $document = $this->visibleDocuments()->onlyTrashed()->findOrFail($id);
        $document->restore();

        return $this->success($document, 'Document restored');
    }

    public function favorite($id)
    {
        $document = $this->visibleDocuments()->findOrFail($id);
        $document->update(['is_favorite' => !$document->is_favorite]);

        return $this->success($document, $document->is_favorite ? 'Added to favorites' : 'Removed from favorites');
    }

    public function lock($id)
    {
        $document = $this->visibleDocuments()->findOrFail($id);
        $user = request()->user();

        if ($document->is_locked && $document->locked_by !== $user->id) {
            return $this->error('Document is locked by another user', 403);
        }

        $document->update([
            'is_locked' => !$document->is_locked,
            'locked_by' => $document->is_locked ? null : $user->id,
        ]);

        return $this->success($document, $document->is_locked ? 'Document locked' : 'Document unlocked');
    }

    public function share(Request $request, $id)
    {
        $document = $this->visibleDocuments()->findOrFail($id);

        $request->validate([
            'shared_to' => 'required|exists:users,id',
            'permission' => 'required|string|in:view,edit,download',
            'expires_at' => 'nullable|date|after:now',
        ]);

        $share = DocumentShare::create([
            'document_id' => $document->id,
            'shared_by' => $request->user()->id,
            'shared_to' => $request->shared_to,
            'permission' => $request->permission,
            'expires_at' => $request->expires_at,
            'created_at' => now(),
        ]);

        return $this->success($share->load(['recipient:id,name']), 'Document shared');
    }

    public function comments($id)
    {
        $document = $this->visibleDocuments()->findOrFail($id);
        $comments = $document->comments()->with('user:id,name')->orderBy('created_at', 'desc')->get();

        return $this->success($comments);
    }

    public function addComment(Request $request, $id)
    {
        $document = $this->visibleDocuments()->findOrFail($id);

        $request->validate(['content' => 'required|string|max:5000']);

        $comment = $document->comments()->create([
            'user_id' => $request->user()->id,
            'content' => $request->content,
        ]);

        return $this->success($comment->load('user:id,name'), 'Comment added', 201);
    }

    public function approve($id)
    {
        $document = $this->visibleDocuments()->findOrFail($id);
        $document->update([
            'approval_status' => 'approved',
            'approved_by' => request()->user()->id,
            'approved_at' => now(),
        ]);

        return $this->success($document, 'Document approved');
    }

    public function reject(Request $request, $id)
    {
        $document = $this->visibleDocuments()->findOrFail($id);

        $document->update([
            'approval_status' => 'rejected',
        ]);

        return $this->success($document, 'Document rejected');
    }

    public function archive($id)
    {
        $document = $this->visibleDocuments()->findOrFail($id);
        $document->update(['status' => 'archived']);

        return $this->success($document, 'Document archived');
    }

    public function move(Request $request, $id)
    {
        $document = $this->visibleDocuments()->findOrFail($id);

        $request->validate([
            'folder_id' => 'nullable|exists:folders,id',
        ]);

        $document->update([
            'folder_id' => $request->folder_id,
            'updated_by' => $request->user()->id,
        ]);

        return $this->success($document->load('folder'), 'Document moved');
    }

    private function visibleDocuments(): Builder
    {
        return Document::query()->visibleTo(request()->user());
    }

    private function documentDisk(Document $document): FilesystemAdapter
    {
        $private = Storage::disk('documents');

        return $private->exists($document->file_path) ? $private : Storage::disk('public');
    }

    private function accessIdRules(Request $request): array
    {
        return match ($request->input('access_type')) {
            'user' => ['integer', 'distinct', Rule::exists('users', 'id')->whereNull('deleted_at')],
            'department' => ['integer', 'distinct', Rule::exists('departments', 'id')],
            default => ['integer', 'distinct'],
        };
    }

    private function saveAccess(Document $document, Request $request): void
    {
        if (!in_array($request->input('access_type'), ['user', 'department'], true)) {
            return;
        }

        foreach ($request->input('access_ids') as $accessId) {
            $document->access()->create([
                'access_type' => $request->input('access_type'),
                'access_id' => $accessId,
            ]);
        }
    }
}
