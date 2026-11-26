<?php

namespace App\Services;

use App\Models\IncidentReport;

class IncidentNumberGenerator
{
    /**
     * Build the next IR number for the current year. The unique index on
     * ir_number is the final guard; callers retry on duplicate key errors.
     */
    public function next(): string
    {
        $year = now()->year;
        $prefix = "IR-{$year}-";

        $last = IncidentReport::withTrashed()
            ->where('ir_number', 'like', $prefix.'%')
            ->max('ir_number');

        $sequence = $last ? ((int) substr($last, -4)) + 1 : 1;

        return $prefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
    }
}
