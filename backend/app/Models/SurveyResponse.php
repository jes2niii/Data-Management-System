<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SurveyResponse extends Model
{
    use HasFactory;

    protected $fillable = [
        'survey_form_id', 'respondent_name', 'respondent_email',
        'department', 'total_score', 'average_score', 'remarks', 'submitted_by',
    ];

    protected $casts = ['total_score' => 'decimal:2', 'average_score' => 'decimal:2'];

    public function form()
    {
        return $this->belongsTo(SurveyForm::class, 'survey_form_id');
    }

    public function answers()
    {
        return $this->hasMany(SurveyAnswer::class);
    }

    public function submitter()
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }
}
