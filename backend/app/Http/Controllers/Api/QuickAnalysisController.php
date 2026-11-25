<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TestExam;
use App\Services\ItemAnalysisCalculator;
use App\Services\ItemAnalysisRecorder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuickAnalysisController extends Controller
{
    public function analyze(Request $request, ItemAnalysisCalculator $calculator, ItemAnalysisRecorder $recorder)
    {
        $studentCount = (int) $request->input('student_count', 0);
        $itemCount = (int) $request->input('item_count', 0);

        $data = $request->validate([
            'student_count' => 'required|integer|min:2|max:100',
            'item_count' => 'required|integer|min:1|max:50',
            'results' => "required|array|size:{$studentCount}",
            'results.*' => "required|array|size:{$itemCount}",
            'results.*.*' => 'required|boolean',
            'save' => 'nullable|boolean',
            'title' => 'nullable|string|max:255',
        ]);

        $students = collect($data['results'])->map(function (array $row, int $index) use ($itemCount) {
            $correct = collect($row)->filter()->count();

            return [
                'student_number' => $index + 1,
                'items_correct' => $correct,
                'items_incorrect' => $itemCount - $correct,
                'total_score' => $correct,
                'percentage' => round($correct / $itemCount * 100, 2),
                'group' => null,
            ];
        })->values();

        [$upper, $lower] = $calculator->splitGroups(
            $students->sortByDesc('total_score')->values()
        );

        $groups = [];
        foreach ($upper as $student) {
            $groups[$student['student_number']] = 'UA';
        }
        foreach ($lower as $student) {
            $groups[$student['student_number']] = 'LA';
        }
        $students = $students->map(function (array $student) use ($groups) {
            $student['group'] = $groups[$student['student_number']] ?? null;

            return $student;
        })->values();

        $upperTotal = $upper->count();
        $lowerTotal = $lower->count();
        $items = [];

        for ($item = 0; $item < $itemCount; $item++) {
            $upperCorrect = $upper->filter(fn (array $student) => !empty($data['results'][$student['student_number'] - 1][$item]))->count();
            $lowerCorrect = $lower->filter(fn (array $student) => !empty($data['results'][$student['student_number'] - 1][$item]))->count();

            $items[] = [
                'item_number' => $item + 1,
                'ua_correct' => $upperCorrect,
                'la_correct' => $lowerCorrect,
                'ua_total' => $upperTotal,
                'la_total' => $lowerTotal,
                ...$calculator->metrics($upperCorrect, $lowerCorrect, $upperTotal, $lowerTotal),
            ];
        }

        $analysis = collect($items);
        $saved = null;

        if ($request->boolean('save')) {
            abort_unless($request->user()->hasPermission('items', 'create'), 403);
            $title = $data['title'] ?? ('Quick Analysis '.now()->format('Y-m-d H:i'));

            $exam = DB::transaction(function () use ($title, $data, $studentCount, $itemCount, $recorder, $request) {
                $exam = TestExam::create([
                    'title' => $title,
                    'total_items' => $itemCount,
                    'created_by' => $request->user()->id,
                ]);

                for ($item = 0; $item < $itemCount; $item++) {
                    $exam->items()->create([
                        'item_number' => $item + 1,
                        'question' => 'Item '.($item + 1),
                        'correct_answer' => 'Correct',
                        'item_type' => 'identification',
                        'max_score' => 1,
                    ]);
                }

                foreach ($data['results'] as $index => $row) {
                    $correct = collect($row)->filter()->count();
                    $student = $exam->students()->create([
                        'name' => 'Student '.($index + 1),
                        'total_score' => $correct,
                        'items_correct' => $correct,
                        'percentage' => round($correct / $itemCount * 100, 2),
                    ]);
                    foreach ($row as $item => $isCorrect) {
                        $student->answers()->create([
                            'test_item_id' => $exam->items[$item]->id,
                            'answer' => $isCorrect ? 'Correct' : 'Wrong',
                            'is_correct' => (bool) $isCorrect,
                        ]);
                    }
                }

                $recorder->record($exam->load('items'));

                return $exam;
            }, 3);

            $saved = ['id' => $exam->id, 'title' => $exam->title];
        }

        return $this->success([
            'students' => $students,
            'items' => $items,
            'saved' => $saved,
            'summary' => [
                'student_count' => $studentCount,
                'item_count' => $itemCount,
                'retain' => $analysis->where('action', 'Retain')->count(),
                'revise' => $analysis->where('action', 'Revise')->count(),
                'reject' => $analysis->where('action', 'Reject')->count(),
            ],
        ]);
    }
}
