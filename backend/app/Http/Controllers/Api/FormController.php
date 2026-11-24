<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Form;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FormController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => 'nullable|string|max:255',
            'category' => 'nullable|integer|min:1',
            'is_active' => 'nullable|boolean',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);
        $query = Form::with(['creator:id,name', 'category']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category')) {
            $query->where('form_category_id', $request->category);
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        $forms = $query->orderBy('created_at', 'desc')
            ->orderByDesc('id')->paginate($filters['per_page'] ?? 15);

        return $this->success($forms);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'form_category_id' => 'nullable|exists:form_categories,id',
            'description' => 'nullable|string',
            'file' => 'required|file|max:20480',
            'is_active' => 'boolean',
        ]);

        $file = $request->file('file');
        $path = $file->store('forms', 'public');

        $form = Form::create([
            'name' => $request->name,
            'form_category_id' => $request->form_category_id,
            'description' => $request->description,
            'file_path' => $path,
            'version' => 1,
            'download_count' => 0,
            'is_active' => $request->is_active ?? true,
            'created_by' => $request->user()->id,
        ]);

        return $this->success($form->load(['creator', 'category']), 'Form created', 201);
    }

    public function show($id)
    {
        $form = Form::with('creator')->findOrFail($id);

        return $this->success($form);
    }

    public function update(Request $request, $id)
    {
        $form = Form::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'form_category_id' => 'sometimes|nullable|exists:form_categories,id',
            'description' => 'nullable|string',
            'file' => 'nullable|file|max:20480',
            'is_active' => 'boolean',
        ]);

        $data = $request->only(['name', 'form_category_id', 'description', 'is_active']);

        if ($request->hasFile('file')) {
            if ($form->file_path) {
                Storage::disk('public')->delete($form->file_path);
            }
            $data['file_path'] = $request->file('file')->store('forms', 'public');
            $data['version'] = $form->version + 1;
        }

        $form->update($data);

        return $this->success($form->load(['creator:id,name', 'category']), 'Form updated');
    }

    public function destroy($id)
    {
        $form = Form::findOrFail($id);
        if ($form->file_path) {
            Storage::disk('public')->delete($form->file_path);
        }
        $form->delete();

        return $this->success(null, 'Form deleted');
    }

    public function download($id)
    {
        $form = Form::findOrFail($id);

        if (!$form->file_path || !Storage::disk('public')->exists($form->file_path)) {
            return $this->error('File not found', 404);
        }

        $name = str_replace(['/', '\\'], '_', $form->name);
        $name = preg_replace('/[\x00-\x1f\x7f]/', '_', $name);
        $download = Storage::disk('public')->download(
            $form->file_path,
            $name . '.' . pathinfo($form->file_path, PATHINFO_EXTENSION),
            ['Content-Type' => 'application/octet-stream', 'X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'private, no-store']
        );
        $form->increment('download_count');

        return $download;
    }
}
