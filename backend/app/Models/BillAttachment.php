<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BillAttachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'bill_id', 'name', 'file_path', 'file_type', 'file_size',
    ];

    public function bill()
    {
        return $this->belongsTo(Bill::class);
    }
}
