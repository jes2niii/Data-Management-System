<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TestItem extends Model
{
    use HasFactory;

    protected $fillable = ['test_exam_id', 'item_number', 'question', 'correct_answer', 'max_score', 'item_type', 'options', 'survey_section_id'];

    protected $casts = [
        'options' => 'array',
        'max_score' => 'integer',
    ];

    public function exam()
    {
        return $this->belongsTo(TestExam::class, 'test_exam_id');
    }
}
