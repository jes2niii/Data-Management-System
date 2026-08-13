<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SurveyQuestion extends Model
{
    use HasFactory;

    protected $fillable = ['survey_form_id', 'survey_section_id', 'question', 'type', 'max_score', 'order'];

    protected $casts = ['max_score' => 'integer', 'order' => 'integer'];

    public function form()
    {
        return $this->belongsTo(SurveyForm::class, 'survey_form_id');
    }
}
