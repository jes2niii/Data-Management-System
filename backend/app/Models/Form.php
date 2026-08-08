<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Form extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'form_category_id', 'description', 'file_path', 'version',
        'download_count', 'is_active', 'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'download_count' => 'integer',
        'version' => 'integer',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function category()
    {
        return $this->belongsTo(FormCategory::class, 'form_category_id');
    }
}
