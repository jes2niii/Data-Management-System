<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TestAnswer;
use App\Models\TestExam;
use App\Models\TestItem;
use App\Models\TestItemAnalysis;
use App\Models\TestStudent;
use Illuminate\Http\Request;

class TestAnalysisController extends Controller
{
    public const ITEM_TYPE_MC = 'multiple_choice';
    public const ITEM_TYPE_TF = 'true_false';
    public const ITEM_TYPE_ID = 'identification';

    public const MC_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];
    public const TF_OPTIONS = ['True', 'False'];
    public const ID_OPTIONS = ['Correct', 'Wrong'];

    public function index(Request $request)
    {
        $query = TestExam::with(['creator'])->withCount(['students', 'items', 'analysis']);
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', "%{$s}%")->orWhere('subject', 'like', "%{$s}%");
            });
        }
        $exams = $query->orderBy('created_at', 'desc')->paginate($request->get('per_page', 15));
        $exams->getCollection()->transform(function ($exam) {
            $exam->has_analysis = $exam->analysis_count > 0;
            return $exam;
        });
        return $this->success($exams);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'subject' => 'nullable|string|max:100',
            'items' => 'required|array|min:1',
            'items.*.item_number' => 'required|integer',
            'items.*.question' => 'nullable|string',
            'items.*.correct_answer' => 'nullable|string|max:50',
            'items.*.item_type' => 'nullable|string|in:multiple_choice,true_false,identification',
            'items.*.options' => 'nullable|array',
            'items.*.options.*' => 'string',
        ]);

        $exam = TestExam::create([
            'title' => $request->title,
            'description' => $request->description,
            'subject' => $request->subject,
            'total_items' => count($request->items),
            'created_by' => $request->user()->id,
        ]);

        foreach ($request->items as $item) {
            TestItem::create([
                'test_exam_id' => $exam->id,
                'item_number' => $item['item_number'],
                'question' => $item['question'] ?? null,
                'correct_answer' => $item['correct_answer'] ?? null,
                'item_type' => $item['item_type'] ?? self::ITEM_TYPE_MC,
                'options' => $item['options'] ?? null,
                'max_score' => 1,
            ]);
        }

        return $this->success($exam->load('items'), 'Exam created', 201);
    }

    public function show($id)
    {
        $exam = TestExam::with(['items', 'students.answers', 'creator'])->findOrFail($id);
        $exam->has_analysis = $exam->analysis()->count() > 0;
        return $this->success($exam);
    }

    public function update(Request $request, $id)
    {
        $exam = TestExam::with('items')->findOrFail($id);
        $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'subject' => 'nullable|string|max:100',
            'items' => 'nullable|array',
            'items.*.item_number' => 'required|integer',
            'items.*.question' => 'nullable|string',
            'items.*.correct_answer' => 'nullable|string|max:50',
            'items.*.item_type' => 'nullable|string|in:multiple_choice,true_false,identification',
            'items.*.options' => 'nullable|array',
            'items.*.options.*' => 'string',
        ]);
        $exam->update($request->only(['title', 'description', 'subject']));

        if ($request->has('items')) {
            $keepIds = [];
            foreach ($request->items as $itemData) {
                $id = $itemData['id'] ?? null;
                if ($id && $exam->items->contains($id)) {
                    $item = TestItem::find($id);
                    $item->update([
                        'question' => $itemData['question'] ?? $item->question,
                        'correct_answer' => $itemData['correct_answer'] ?? $item->correct_answer,
                        'item_number' => $itemData['item_number'],
                        'item_type' => $itemData['item_type'] ?? $item->item_type,
                        'options' => $itemData['options'] ?? $item->options,
                    ]);
                } else {
                    $item = TestItem::create([
                        'test_exam_id' => $exam->id,
                        'item_number' => $itemData['item_number'],
                        'question' => $itemData['question'] ?? null,
                        'correct_answer' => $itemData['correct_answer'] ?? null,
                        'item_type' => $itemData['item_type'] ?? self::ITEM_TYPE_MC,
                        'options' => $itemData['options'] ?? null,
                    ]);
                }
                $keepIds[] = $item->id;
            }
            $exam->items()->whereNotIn('id', $keepIds)->delete();
            $exam->update(['total_items' => count($keepIds)]);
        }

        return $this->success($exam->load('items'), 'Exam updated');
    }

    public function destroy($id)
    {
        TestExam::findOrFail($id)->delete();
        return $this->success(null, 'Exam deleted');
    }

    public function addStudents(Request $request, $id)
    {
        $exam = TestExam::with('items')->findOrFail($id);
        $request->validate([
            'students' => 'required|array|min:1',
            'students.*.name' => 'required|string|max:255',
            'students.*.answers' => 'required|array',
            'students.*.answers.*.item_id' => 'required|exists:test_items,id',
            'students.*.answers.*.answer' => 'nullable|string|max:50',
        ]);

        foreach ($request->students as $studentData) {
            $correctCount = 0;
            $student = TestStudent::create([
                'test_exam_id' => $exam->id,
                'name' => $studentData['name'],
            ]);

            foreach ($studentData['answers'] as $ans) {
                $item = TestItem::find($ans['item_id']);
                $isCorrect = $item && $ans['answer'] === $item->correct_answer;
                if ($isCorrect) $correctCount++;
                TestAnswer::create([
                    'test_student_id' => $student->id,
                    'test_item_id' => $ans['item_id'],
                    'answer' => $ans['answer'] ?? '',
                    'is_correct' => $isCorrect,
                ]);
            }

            $totalItems = $exam->items->count();
            $student->update([
                'total_score' => $correctCount,
                'items_correct' => $correctCount,
                'percentage' => $totalItems > 0 ? round(($correctCount / $totalItems) * 100, 2) : 0,
            ]);
        }

        return $this->success($exam->load('students'), 'Students added', 201);
    }

    public function runAnalysis($id)
    {
        $exam = TestExam::with(['items', 'students.answers'])->findOrFail($id);
        $students = $exam->students()->orderBy('total_score', 'desc')->get();
        $totalStudents = $students->count();

        if ($totalStudents < 2) {
            return $this->error('Need at least 2 students for analysis', 400);
        }

        $topCount = (int) ceil($totalStudents * 0.27);
        $ua = $students->take($topCount);
        $la = $students->reverse()->take($topCount);

        $ua->each(function ($s) { $s->group = 'UA'; });
        $la->each(function ($s) { $s->group = 'LA'; });

        $uaTotal = $ua->count();
        $laTotal = $la->count();

        $exam->analysis()->delete();

        foreach ($exam->items as $item) {
            $uaChoices = $this->getItemChoices($item, $ua);
            $laChoices = $this->getItemChoices($item, $la);

            $uaCorrect = $uaChoices[$item->correct_answer] ?? 0;
            $laCorrect = $laChoices[$item->correct_answer] ?? 0;

            $uaProp = $uaTotal > 0 ? $uaCorrect / $uaTotal : 0;
            $laProp = $laTotal > 0 ? $laCorrect / $laTotal : 0;
            $df = ($uaProp + $laProp) / 2;
            $ds = $uaProp - $laProp;

            $difficultyLevel = $this->getDifficultyLevel($df);
            $discriminationLevel = $this->getDiscriminationLevel($ds);
            $action = $this->getAction($df, $ds);

            TestItemAnalysis::create([
                'test_exam_id' => $exam->id,
                'test_item_id' => $item->id,
                'ua_correct' => $uaCorrect, 'la_correct' => $laCorrect,
                'ua_total' => $uaTotal, 'la_total' => $laTotal,
                'ua_proportion' => $uaProp, 'la_proportion' => $laProp,
                'difficulty_index' => round($df, 4),
                'discrimination_index' => round($ds, 4),
                'difficulty_level' => $difficultyLevel,
                'discrimination_level' => $discriminationLevel,
                'action' => $action,
                'upper_choices' => $uaChoices,
                'lower_choices' => $laChoices,
            ]);
        }

        return $this->success($exam->load(['items', 'analysis.item']), 'Analysis complete');
    }

    public function getAnalysis($id)
    {
        $analysis = TestItemAnalysis::with('item')->where('test_exam_id', $id)
            ->orderBy('test_item_id')->get();

        $students = TestStudent::with(['answers.item'])->withCount(['answers as correct_count' => function ($q) {
            $q->where('is_correct', true);
        }])->where('test_exam_id', $id)->orderBy('id')->get();

        $summary = [
            'retain' => $analysis->where('action', 'Retain')->count(),
            'revise' => $analysis->where('action', 'Revise')->count(),
            'reject' => $analysis->where('action', 'Reject')->count(),
        ];

        $enriched = $analysis->map(function ($a) {
            return [
                'item_id' => $a->test_item_id,
                'item_number' => $a->item->item_number,
                'question' => $a->item->question,
                'item_type' => $a->item->item_type ?? self::ITEM_TYPE_MC,
                'options' => $a->item->options,
                'correct_answer' => $a->item->correct_answer,
                'upper_choices' => $a->upper_choices,
                'lower_choices' => $a->lower_choices,
                'ua_correct' => $a->ua_correct,
                'la_correct' => $a->la_correct,
                'ua_proportion' => round($a->ua_proportion, 4),
                'la_proportion' => round($a->la_proportion, 4),
                'difficulty_index' => round($a->difficulty_index, 4),
                'difficulty_level' => $a->difficulty_level,
                'discrimination_index' => round($a->discrimination_index, 4),
                'discrimination_level' => $a->discrimination_level,
                'action' => $a->action,
            ];
        });

        return $this->success([
            'items' => $enriched,
            'summary' => $summary,
            'students' => $students,
        ]);
    }

    private function getItemChoices($item, $studentsOrGroup)
    {
        $itemType = $item->item_type ?? self::ITEM_TYPE_MC;
        $customOptions = $item->options ?? null;
        $options = $this->getOptions($itemType, $customOptions);

        $choices = [];
        foreach ($options as $opt) {
            $choices[$opt] = 0;
        }

        foreach ($studentsOrGroup as $s) {
            $answer = $s->answers->where('test_item_id', $item->id)->first();
            if ($answer && isset($choices[$answer->answer])) {
                $choices[$answer->answer]++;
            }
        }
        return $choices;
    }

    public function getOptions($itemType, $customOptions = null)
    {
        if ($customOptions && is_array($customOptions) && count($customOptions) > 0) {
            return $customOptions;
        }
        switch ($itemType) {
            case self::ITEM_TYPE_TF:
                return self::TF_OPTIONS;
            case self::ITEM_TYPE_ID:
                return self::ID_OPTIONS;
            default:
                return self::MC_OPTIONS;
        }
    }

    private function getDifficultyLevel($df)
    {
        if ($df <= 0.20) return 'Very Difficult';
        if ($df <= 0.40) return 'Difficult';
        if ($df <= 0.60) return 'Moderately Difficult';
        if ($df <= 0.80) return 'Easy';
        return 'Very Easy';
    }

    private function getDiscriminationLevel($ds)
    {
        if ($ds <= -0.60) return 'Questionable';
        if ($ds <= -0.22) return 'Not Discriminating';
        if ($ds <= 0.20) return 'Moderately Discriminating';
        if ($ds <= 0.60) return 'Discriminating';
        return 'Very Discriminating';
    }

    private function getAction($df, $ds)
    {
        $dsCat = $this->getDiscriminationCategory($ds);
        if ($df <= 0.40) {
            if ($dsCat === 'low') return 'Reject';
            return 'Revise';
        }
        if ($df <= 0.60) {
            if ($dsCat === 'low') return 'Revise';
            return 'Retain';
        }
        if ($dsCat === 'low') return 'Reject';
        return 'Revise';
    }

    private function getDiscriminationCategory($ds)
    {
        if ($ds <= -0.22) return 'low';
        if ($ds <= 0.20) return 'mid';
        return 'high';
    }
}
