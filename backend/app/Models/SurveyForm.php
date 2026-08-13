<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SurveyForm extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['title', 'description', 'type', 'status', 'created_by'];

    public function sections()
    {
        return $this->hasMany(SurveySection::class)->orderBy('order');
    }

    public function questions()
    {
        return $this->hasMany(SurveyQuestion::class)->orderBy('order');
    }

    public function responses()
    {
        return $this->hasMany(SurveyResponse::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getAverageRatingAttribute()
    {
        return $this->responses()->avg('average_score') ?? 0;
    }

    public function getTotalResponsesAttribute()
    {
        return $this->responses()->count();
    }
}
