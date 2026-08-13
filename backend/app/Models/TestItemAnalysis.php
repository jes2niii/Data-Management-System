<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TestItemAnalysis extends Model
{
    use HasFactory;

    protected $table = 'test_item_analysis';

    protected $fillable = [
        'test_exam_id', 'test_item_id',
        'ua_correct', 'la_correct', 'ua_total', 'la_total',
        'ua_proportion', 'la_proportion',
        'difficulty_index', 'discrimination_index',
        'difficulty_level', 'discrimination_level', 'action',
        'upper_choices', 'lower_choices',
    ];

    protected $casts = [
        'ua_proportion' => 'decimal:4',
        'la_proportion' => 'decimal:4',
        'difficulty_index' => 'decimal:4',
        'discrimination_index' => 'decimal:4',
        'upper_choices' => 'array',
        'lower_choices' => 'array',
    ];

    public function exam()
    {
        return $this->belongsTo(TestExam::class, 'test_exam_id');
    }

    public function item()
    {
        return $this->belongsTo(TestItem::class, 'test_item_id');
    }
}
