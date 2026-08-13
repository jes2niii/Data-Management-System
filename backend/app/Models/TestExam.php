<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TestExam extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['title', 'description', 'subject', 'total_items', 'created_by'];

    public function items()
    {
        return $this->hasMany(TestItem::class)->orderBy('item_number');
    }

    public function students()
    {
        return $this->hasMany(TestStudent::class)->orderBy('total_score', 'desc');
    }

    public function analysis()
    {
        return $this->hasMany(TestItemAnalysis::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
