<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TestAnswer;
use App\Models\TestExam;
use App\Models\TestItem;
use App\Models\TestItemAnalysis;
use App\Models\TestStudent;
use App\Services\ItemAnalysisRecorder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

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
        $data = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'subject' => 'nullable|string|max:100',
            'items' => 'sometimes|required|array|list',
            'items.*.id' => 'sometimes|required|integer|min:1|distinct',
            'items.*.item_number' => 'required|integer|min:1|distinct',
            'items.*.question' => 'nullable|string',
            'items.*.correct_answer' => 'nullable|string|max:50',
            'items.*.item_type' => 'nullable|string|in:multiple_choice,true_false,identification',
            'items.*.options' => 'nullable|array',
            'items.*.options.*' => 'string',
        ]);
        $exam = DB::transaction(function () use ($id, $data) {
            $exam = TestExam::lockForUpdate()->findOrFail($id);
            $metadata = \Illuminate\Support\Arr::except($data, ['items']);
            if (isset($data['items'])) {
                abort_if($exam->students()->exists() || $exam->analysis()->exists() || TestAnswer::whereHas('item', fn ($query) =>
                    $query->where('test_exam_id', $exam->id))->exists(),
                    409, 'Exam items cannot be changed after scores or analysis have been recorded. Create a new exam for structural changes.');

                $existing = $exam->items()->get()->keyBy('id');
                $keep = [];
                foreach ($data['items'] as $index => $values) {
                    $item = isset($values['id']) ? $existing->get($values['id']) : new TestItem(['item_type' => self::ITEM_TYPE_MC]);
                    if ($item === null) {
                        throw ValidationException::withMessages(["items.{$index}.id" => 'The item must belong to this exam.']);
                    }
                    $attributes = \Illuminate\Support\Arr::only($values, ['item_number', 'question', 'correct_answer', 'item_type', 'options']);
                    if (array_key_exists('item_type', $attributes) && $attributes['item_type'] === null) {
                        unset($attributes['item_type']);
                    }
                    $exam->items()->save($item->fill($attributes));
                    $keep[] = $item->id;
                }
                $exam->items()->whereNotIn('id', $keep)->delete();
                $metadata['total_items'] = count($keep);
            }
            $exam->update($metadata);

            return $exam;
        });

        return $this->success($exam->load('items'), 'Exam updated');
    }

    public function destroy($id)
    {
        TestExam::findOrFail($id)->delete();
        return $this->success(null, 'Exam deleted');
    }

    public function addStudents(Request $request, $id)
    {
        $data = $request->validate([
            'students' => 'required|array|list|min:1',
            'students.*.name' => 'required|string|max:255',
            'students.*.answers' => 'required|array|list',
            'students.*.answers.*' => 'required|array:item_id,answer',
            'students.*.answers.*.item_id' => 'required|integer|min:1',
            'students.*.answers.*.answer' => 'nullable|string|max:50',
        ]);

        $exam = DB::transaction(function () use ($id, $data) {
            $exam = TestExam::lockForUpdate()->findOrFail($id);
            // Scores changed the population, so the previous item analysis is stale.
            $exam->analysis()->delete();
            TestStudent::where('test_exam_id', $exam->id)->update(['group' => null, 'rank' => null]);
            $items = $exam->items()->lockForUpdate()->get()->keyBy('id');
            $totalItems = $items->count();

            foreach ($data['students'] as $studentIndex => $studentData) {
                $answers = [];
                $correctCount = 0;
                foreach ($studentData['answers'] as $answerIndex => $answer) {
                    $itemId = (int) $answer['item_id'];
                    $item = $items->get($itemId);
                    $field = "students.{$studentIndex}.answers.{$answerIndex}.item_id";
                    if ($item === null || isset($answers[$itemId])) {
                        throw ValidationException::withMessages([
                            $field => $item === null ? 'The item must belong to this exam.' : 'Each student may answer an item only once.',
                        ]);
                    }
                    $value = $answer['answer'] ?? '';
                    $correct = $value !== '' && $value === $item->correct_answer;
                    $correctCount += (int) $correct;
                    $answers[$itemId] = ['test_item_id' => $itemId, 'answer' => $value, 'is_correct' => $correct];
                }

                $student = $exam->students()->create([
                    'name' => $studentData['name'],
                    'total_score' => $correctCount,
                    'items_correct' => $correctCount,
                    'percentage' => $totalItems > 0 ? round($correctCount / $totalItems * 100, 2) : 0,
                ]);
                $student->answers()->createMany($answers);
            }

            return $exam;
        });

        return $this->success($exam->load('students'), 'Students added', 201);
    }

    public function runAnalysis($id, ItemAnalysisRecorder $recorder)
    {
        $exam = TestExam::findOrFail($id);
        if ($exam->students()->count() < 2) {
            return $this->error('Need at least 2 students for analysis', 400);
        }

        $recorder->record($exam);

        return $this->success($exam->load(['items', 'analysis.item', 'students']), 'Analysis complete');
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

        if ($itemType === self::ITEM_TYPE_ID) {
            $choices = ['Correct' => 0, 'Wrong' => 0];
            foreach ($studentsOrGroup as $student) {
                $answer = $student->answers->firstWhere('test_item_id', $item->id);
                if ($answer === null) {
                    continue;
                }
                $choices[$answer->is_correct ? 'Correct' : 'Wrong']++;
            }

            return $choices;
        }

        $choices = [];
        foreach ($this->getOptions($itemType, $customOptions) as $option) {
            $choices[$option] = 0;
        }

        foreach ($studentsOrGroup as $student) {
            $answer = $student->answers->firstWhere('test_item_id', $item->id);
            if ($answer && isset($choices[$answer->answer])) {
                $choices[$answer->answer]++;
            }
        }

        return $choices;
    }

    private function countCorrect($item, $studentsOrGroup): int
    {
        return $studentsOrGroup->filter(function ($student) use ($item) {
            $answer = $student->answers->firstWhere('test_item_id', $item->id);

            return $answer !== null && (bool) $answer->is_correct;
        })->count();
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
}
