<?php

namespace App\Services;

use App\Models\TestExam;
use App\Models\TestItemAnalysis;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Persists item analysis rows, student groups and ranks for an exam.
 * Used by both the detailed exam analysis and saved quick analyses so the
 * stored results always follow the same rules.
 */
class ItemAnalysisRecorder
{
    private const ITEM_TYPE_MC = 'multiple_choice';
    private const ITEM_TYPE_TF = 'true_false';
    private const ITEM_TYPE_ID = 'identification';
    private const MC_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];
    private const TF_OPTIONS = ['True', 'False'];
    private const ID_OPTIONS = ['Correct', 'Wrong'];

    public function __construct(private ItemAnalysisCalculator $calculator)
    {
    }

    public function record(TestExam $exam): void
    {
        $students = $exam->students()->with('answers')
            ->orderBy('total_score', 'desc')->orderBy('id')->get();
        $items = $exam->items;
        [$upper, $lower] = $this->calculator->splitGroups($students);
        $upperTotal = $upper->count();
        $lowerTotal = $lower->count();

        DB::transaction(function () use ($exam, $students, $items, $upper, $lower, $upperTotal, $lowerTotal) {
            $exam->analysis()->delete();

            // Persist group membership and rank so the analysis can be audited later.
            foreach ($students->values() as $index => $student) {
                $student->update(['group' => null, 'rank' => $index + 1]);
            }
            foreach ($upper as $student) {
                $student->update(['group' => 'UA']);
            }
            foreach ($lower as $student) {
                $student->update(['group' => 'LA']);
            }

            foreach ($items as $item) {
                $upperChoices = $this->choices($item, $upper);
                $lowerChoices = $this->choices($item, $lower);
                $upperCorrect = $this->correctCount($item, $upper);
                $lowerCorrect = $this->correctCount($item, $lower);
                $metrics = $this->calculator->metrics($upperCorrect, $lowerCorrect, $upperTotal, $lowerTotal);

                TestItemAnalysis::create([
                    'test_exam_id' => $exam->id,
                    'test_item_id' => $item->id,
                    'ua_correct' => $upperCorrect, 'la_correct' => $lowerCorrect,
                    'ua_total' => $upperTotal, 'la_total' => $lowerTotal,
                    'ua_proportion' => $metrics['ua_proportion'], 'la_proportion' => $metrics['la_proportion'],
                    'difficulty_index' => $metrics['difficulty_index'],
                    'discrimination_index' => $metrics['discrimination_index'],
                    'difficulty_level' => $metrics['difficulty_level'],
                    'discrimination_level' => $metrics['discrimination_level'],
                    'action' => $metrics['action'],
                    'upper_choices' => $upperChoices,
                    'lower_choices' => $lowerChoices,
                ]);
            }
        }, 3);
    }

    private function choices($item, Collection $students): array
    {
        $itemType = $item->item_type ?? self::ITEM_TYPE_MC;
        if ($itemType === self::ITEM_TYPE_ID) {
            $choices = ['Correct' => 0, 'Wrong' => 0];
            foreach ($students as $student) {
                $answer = $student->answers->firstWhere('test_item_id', $item->id);
                if ($answer !== null) {
                    $choices[$answer->is_correct ? 'Correct' : 'Wrong']++;
                }
            }

            return $choices;
        }

        $options = $item->options ?? [];
        if (!is_array($options) || $options === []) {
            $options = match ($itemType) {
                self::ITEM_TYPE_TF => self::TF_OPTIONS,
                default => self::MC_OPTIONS,
            };
        }
        $choices = array_fill_keys($options, 0);
        foreach ($students as $student) {
            $answer = $student->answers->firstWhere('test_item_id', $item->id);
            if ($answer !== null && array_key_exists($answer->answer, $choices)) {
                $choices[$answer->answer]++;
            }
        }

        return $choices;
    }

    private function correctCount($item, Collection $students): int
    {
        return $students->filter(function ($student) use ($item) {
            $answer = $student->answers->firstWhere('test_item_id', $item->id);

            return $answer !== null && (bool) $answer->is_correct;
        })->count();
    }
}
