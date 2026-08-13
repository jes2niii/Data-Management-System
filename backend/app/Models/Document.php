<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Document extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'folder_id', 'name', 'original_name', 'file_path', 'file_type',
        'file_size', 'mime_type', 'version', 'description', 'category',
        'document_category_id', 'tags', 'labels', 'status', 'is_favorite', 'is_locked', 'locked_by',
        'expiration_date', 'approval_status', 'approved_by', 'approved_at',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'tags' => 'json',
        'labels' => 'json',
        'is_favorite' => 'boolean',
        'is_locked' => 'boolean',
        'expiration_date' => 'date',
        'approved_at' => 'datetime',
        'file_size' => 'integer',
        'version' => 'integer',
    ];

    public function folder()
    {
        return $this->belongsTo(Folder::class);
    }

    public function documentCategory()
    {
        return $this->belongsTo(DocumentCategory::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function locker()
    {
        return $this->belongsTo(User::class, 'locked_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function versions()
    {
        return $this->hasMany(DocumentVersion::class)->orderBy('version_number', 'desc');
    }

    public function comments()
    {
        return $this->hasMany(DocumentComment::class);
    }

    public function shares()
    {
        return $this->hasMany(DocumentShare::class);
    }

    public function access()
    {
        return $this->hasMany(DocumentAccess::class);
    }
}
