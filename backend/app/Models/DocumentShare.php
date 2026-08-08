<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentShare extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'document_id', 'shared_by', 'shared_to', 'permission', 'expires_at', 'created_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function document()
    {
        return $this->belongsTo(Document::class);
    }

    public function sharer()
    {
        return $this->belongsTo(User::class, 'shared_by');
    }

    public function recipient()
    {
        return $this->belongsTo(User::class, 'shared_to');
    }
}
