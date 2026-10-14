<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BookInventory extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'book_inventories';

    protected $fillable = [
        'title','book_category_id','references','alternative_references','link',
        'file_path','file_name','file_type','file_size','description','author','publisher','year','edition',
        'is_active','created_by','updated_by'
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function category()
    {
        return $this->belongsTo(BookCategory::class, 'book_category_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function getFileUrlAttribute()
    {
        if (!$this->file_path) return null;
        // Use current request host when available so file URLs work on
        // both localhost and local network (e.g., http://192.168.x.x:8000)
        // when frontend runs with `npm run dev -- --host`.
        try {
            $request = request();
            if ($request && $request->getHost()) {
                return $request->getSchemeAndHttpHost() . '/storage/' . ltrim($this->file_path, '/');
            }
        } catch (\Throwable $e) {
            // fall through to asset()
        }
        return asset('storage/' . $this->file_path);
    }
}
