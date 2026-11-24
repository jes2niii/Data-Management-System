<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ItemAnalysisCalculator;
use Illuminate\Http\Request;

class QuickAnalysisController extends Controller
{
    public function analyze(Request $request, ItemAnalysisCalculator $calculator)
    {
        $studentCount = (int) $request->input('student_count', 0);
        $itemCount = (int) $request->input('item_count', 0);

        $data = $request->validate([
            'student_count' => 'required|integer|min:2|max:100',
            'item_count' => 'required|integer|min:1|max:50',
            'results' => "required|array|size:{$studentCount}",
            'results.*' => "required|array|size:{$itemCount}",
            'results.*.*' => 'required|boolean',
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

        return $this->success([
            'students' => $students,
            'items' => $items,
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
