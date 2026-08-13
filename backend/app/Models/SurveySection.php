<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SurveySection extends Model
{
    use HasFactory;

    protected $fillable = ['survey_form_id', 'title', 'description', 'order'];

    protected $casts = ['order' => 'integer'];

    public function form()
    {
        return $this->belongsTo(SurveyForm::class, 'survey_form_id');
    }

    public function questions()
    {
        return $this->hasMany(SurveyQuestion::class, 'survey_section_id')->orderBy('order');
    }
}
