<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TestStudent extends Model
{
    use HasFactory;

    protected $fillable = ['test_exam_id', 'name', 'total_score', 'rank', 'group', 'items_correct', 'percentage'];

    public function exam()
    {
        return $this->belongsTo(TestExam::class, 'test_exam_id');
    }

    public function answers()
    {
        return $this->hasMany(TestAnswer::class);
    }
}
