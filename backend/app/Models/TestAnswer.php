<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TestAnswer extends Model
{
    use HasFactory;

    protected $fillable = ['test_student_id', 'test_item_id', 'answer', 'is_correct'];

    protected $casts = ['is_correct' => 'boolean'];

    public function student()
    {
        return $this->belongsTo(TestStudent::class, 'test_student_id');
    }

    public function item()
    {
        return $this->belongsTo(TestItem::class, 'test_item_id');
    }
}
