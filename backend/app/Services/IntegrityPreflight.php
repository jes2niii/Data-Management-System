<?php

namespace App\Services;

use Closure;
use Illuminate\Database\Connection;

class IntegrityPreflight
{
    private array $columns = [];

    public function database(Connection $db): array
    {
        $attendanceDuplicates = fn () => $db->table('attendances')
            ->select('employee_id', 'date', 'session')
            ->groupBy('employee_id', 'date', 'session')->havingRaw('COUNT(*) > 1');
        $batchTotals = fn () => $db->table('inventory_batches')->select('inventory_item_id')
            ->selectRaw('SUM(remaining_quantity) AS remaining')->groupBy('inventory_item_id');

        return [
            $this->check($db, 'Duplicate attendance key groups', ['attendances' => ['employee_id', 'date', 'session']],
                fn () => $db->query()->fromSub($attendanceDuplicates(), 'duplicates')->count()),
            $this->check($db, 'Attendance rows without a session', ['attendances' => ['session']],
                fn () => $db->table('attendances')->whereNull('session')->orWhereRaw("TRIM(session) = ''")->count()),
            $this->check($db, 'Attendance rows without an employee', ['attendances' => ['employee_id'], 'employees' => ['id']],
                fn () => $db->table('attendances as a')->leftJoin('employees as e', 'a.employee_id', '=', 'e.id')->whereNull('e.id')->count()),
            $this->check($db, 'Training courses with missing category references', ['trainings' => ['category_id'], 'training_categories' => ['id']],
                fn () => $db->table('trainings as t')->leftJoin('training_categories as c', 't.category_id', '=', 'c.id')
                    ->whereNotNull('t.category_id')->whereNull('c.id')->count()),
            $this->check($db, 'Training records with inconsistent course/detail links',
                ['training_monitorings' => ['training_id', 'training_detail_id'], 'training_details' => ['id', 'training_id']],
                fn () => $db->table('training_monitorings as m')->leftJoin('training_details as d', 'm.training_detail_id', '=', 'd.id')
                    ->whereNotNull('m.training_detail_id')
                    ->where(fn ($q) => $q->whereNull('d.id')->orWhereNull('m.training_id')->orWhereColumn('m.training_id', '!=', 'd.training_id'))->count()),
            $this->check($db, 'Survey answers with inconsistent form references', [
                'survey_answers' => ['survey_response_id', 'survey_question_id'],
                'survey_responses' => ['id', 'survey_form_id'], 'survey_questions' => ['id', 'survey_form_id'],
            ], fn () => $db->table('survey_answers as a')->leftJoin('survey_responses as r', 'a.survey_response_id', '=', 'r.id')
                ->leftJoin('survey_questions as q', 'a.survey_question_id', '=', 'q.id')
                ->where(fn ($query) => $query->whereNull('r.id')->orWhereNull('q.id')->orWhereColumn('r.survey_form_id', '!=', 'q.survey_form_id'))->count()),
            $this->check($db, 'Test answers with inconsistent exam references', [
                'test_answers' => ['test_student_id', 'test_item_id'],
                'test_students' => ['id', 'test_exam_id'], 'test_items' => ['id', 'test_exam_id'],
            ], fn () => $db->table('test_answers as a')->leftJoin('test_students as s', 'a.test_student_id', '=', 's.id')
                ->leftJoin('test_items as i', 'a.test_item_id', '=', 'i.id')
                ->where(fn ($q) => $q->whereNull('s.id')->orWhereNull('i.id')->orWhereColumn('s.test_exam_id', '!=', 'i.test_exam_id'))->count()),
            $this->duplicatePairs($db, 'Duplicate survey answer groups', 'survey_answers', 'survey_response_id', 'survey_question_id'),
            $this->duplicatePairs($db, 'Duplicate test answer groups', 'test_answers', 'test_student_id', 'test_item_id'),
            $this->check($db, 'Document access rows with missing parents or targets', [
                'document_access' => ['document_id', 'access_type', 'access_id'],
                'documents' => ['id'], 'users' => ['id'], 'departments' => ['id'],
            ], fn () => $db->table('document_access as a')->leftJoin('documents as d', 'a.document_id', '=', 'd.id')
                ->leftJoin('users as u', 'a.access_id', '=', 'u.id')->leftJoin('departments as p', 'a.access_id', '=', 'p.id')
                ->where(fn ($q) => $q->whereNull('d.id')
                    ->orWhereNotIn('a.access_type', ['user', 'department'])
                    ->orWhere(fn ($q) => $q->where('a.access_type', 'user')->whereNull('u.id'))
                    ->orWhere(fn ($q) => $q->where('a.access_type', 'department')->whereNull('p.id')))->count()),
            $this->check($db, 'Inventory items with a batch balance difference', [
                'inventory_items' => ['id', 'quantity'], 'inventory_batches' => ['inventory_item_id', 'remaining_quantity'],
            ], fn () => $db->table('inventory_items as i')->leftJoinSub($batchTotals(), 'b', 'i.id', '=', 'b.inventory_item_id')
                ->whereRaw('ROUND(i.quantity - COALESCE(b.remaining, 0), 2) <> 0')->count()),
            $this->check($db, 'Inventory batches with out-of-range balances', ['inventory_batches' => ['quantity', 'remaining_quantity']],
                fn () => $db->table('inventory_batches')->where('remaining_quantity', '<', 0)
                    ->orWhereColumn('remaining_quantity', '>', 'quantity')->count()),
            $this->duplicatePairs($db, 'Subscription billing date collisions (groups)', 'subscription_billings', 'subscription_id', 'billing_date'),
        ];
    }

    private function duplicatePairs(Connection $db, string $label, string $table, string $first, string $second): array
    {
        return $this->check($db, $label, [$table => [$first, $second]], fn () => $db->query()
            ->fromSub($db->table($table)->select($first, $second)->groupBy($first, $second)->havingRaw('COUNT(*) > 1'), 'duplicates')
            ->count());
    }

    public function files(Connection $db, string $public, string $private): array
    {
        $report = [];
        foreach (['documents', 'document_versions', 'employee_attachments', 'bill_attachments', 'forms', 'book_inventories'] as $table) {
            if (!$this->hasSchema($db, [$table => ['id', 'file_path']])) {
                $report[] = [$table.' file references', 'skipped: schema missing', null];
                continue;
            }

            $counts = ['public snapshot' => 0, 'missing' => 0, 'unsafe or empty' => 0, 'both snapshots' => 0];
            $documents = in_array($table, ['documents', 'document_versions'], true);
            $query = $db->table($table)->select('id', 'file_path');
            if ($table === 'book_inventories') {
                $query->whereNotNull('file_path'); // External-reference-only books are valid.
            }

            foreach ($query->lazyById(500) as $row) {
                $path = $row->file_path;
                if (!$this->isSafeRelativePath($path)) {
                    $counts['unsafe or empty']++;
                    continue;
                }
                $inPublic = $this->locate($public, $path);
                $inPrivate = $documents ? $this->locate($private, $path) : false;
                if ($inPublic === null || $inPrivate === null) {
                    $counts['unsafe or empty']++;
                    continue;
                }
                if ($inPublic) {
                    $counts['public snapshot']++;
                }
                if ($inPublic && $inPrivate) {
                    $counts['both snapshots']++;
                } elseif (!$inPublic && !$inPrivate) {
                    $counts['missing']++;
                }
            }

            foreach ($counts as $type => $count) {
                $report[] = [$table.': '.$type, $count === 0 ? 'ok' : 'review', $count];
            }
        }

        return $report;
    }

    private function check(Connection $db, string $label, array $schema, Closure $count): array
    {
        if (!$this->hasSchema($db, $schema)) {
            return [$label, 'skipped: schema missing', null];
        }

        $result = $count();

        return [$label, $result === 0 ? 'ok' : 'review', $result];
    }

    private function hasSchema(Connection $db, array $schema): bool
    {
        foreach ($schema as $table => $columns) {
            $key = $db->getName().':'.$table;
            $this->columns[$key] ??= $db->getSchemaBuilder()->getColumnListing($table);
            if (array_diff($columns, $this->columns[$key]) !== []) {
                return false;
            }
        }

        return true;
    }

    private function isSafeRelativePath(?string $path): bool
    {
        return $path !== null && trim($path) !== ''
            && !str_contains($path, '\\') && !str_contains($path, ':')
            && !preg_match('~[\x00-\x1f]|(?:^|/)\.\.?(?:/|$)|^/|//|/$~', $path);
    }

    private function locate(string $root, string $path): ?bool
    {
        $resolved = realpath($root.'/'.$path);
        if ($resolved === false) {
            return false;
        }
        $resolved = str_replace('\\', '/', $resolved);
        $prefix = $root.'/';
        if (PHP_OS_FAMILY === 'Windows') {
            $resolved = strtolower($resolved);
            $prefix = strtolower($prefix);
        }
        if (!str_starts_with($resolved, $prefix)) {
            return null;
        }

        return is_file($resolved) && is_readable($resolved) ? true : null;
    }
}
