<?php

namespace App\Services;

use Illuminate\Support\Collection;

/**
 * Shared scoring rules for the detailed test exam analysis and the simplified
 * quick analysis. Both upper/lower grouping and item indices come from here.
 */
class ItemAnalysisCalculator
{
    public const TOP_FRACTION = 0.27;

    /**
     * Split students into the upper and lower groups (27% from each end).
     * The collection is expected to be ordered by descending total score.
     */
    public function splitGroups(Collection $students): array
    {
        $top = (int) ceil($students->count() * self::TOP_FRACTION);

        return [$students->take($top), $students->reverse()->take($top)];
    }

    public function metrics(int $uaCorrect, int $laCorrect, int $uaTotal, int $laTotal): array
    {
        $uaProportion = $uaTotal > 0 ? $uaCorrect / $uaTotal : 0;
        $laProportion = $laTotal > 0 ? $laCorrect / $laTotal : 0;
        $df = ($uaProportion + $laProportion) / 2;
        $ds = $uaProportion - $laProportion;

        return [
            'ua_proportion' => $uaProportion,
            'la_proportion' => $laProportion,
            'difficulty_index' => round($df, 4),
            'discrimination_index' => round($ds, 4),
            'difficulty_level' => $this->difficultyLevel($df),
            'discrimination_level' => $this->discriminationLevel($ds),
            'action' => $this->action($df, $ds),
        ];
    }

    private function difficultyLevel(float $df): string
    {
        if ($df <= 0.20) return 'Very Difficult';
        if ($df <= 0.40) return 'Difficult';
        if ($df <= 0.60) return 'Moderately Difficult';
        if ($df <= 0.80) return 'Easy';

        return 'Very Easy';
    }

    private function discriminationLevel(float $ds): string
    {
        if ($ds <= -0.60) return 'Questionable';
        if ($ds <= -0.22) return 'Not Discriminating';
        if ($ds <= 0.20) return 'Moderately Discriminating';
        if ($ds <= 0.60) return 'Discriminating';

        return 'Very Discriminating';
    }

    private function action(float $df, float $ds): string
    {
        $category = $this->discriminationCategory($ds);
        if ($df <= 0.40) {
            return $category === 'low' ? 'Reject' : 'Revise';
        }
        if ($df <= 0.60) {
            return $category === 'low' ? 'Revise' : 'Retain';
        }

        return $category === 'low' ? 'Reject' : 'Revise';
    }

    private function discriminationCategory(float $ds): string
    {
        if ($ds <= -0.22) return 'low';
        if ($ds <= 0.20) return 'mid';

        return 'high';
    }
}
