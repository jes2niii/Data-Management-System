<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Bill;
use App\Models\Document;
use App\Models\Employee;
use App\Models\Form;
use App\Models\User;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function search(Request $request)
    {
        $request->validate(['keyword' => 'nullable|string|max:255']);

        $keyword = $request->get('keyword', '');
        $modules = $request->get('modules', ['employees', 'users', 'files', 'forms', 'bills', 'activity_logs']);

        if (is_string($modules)) {
            $modules = explode(',', $modules);
        }

        $results = [];

        if (in_array('employees', $modules)) {
            $query = Employee::with('department');
            if ($keyword) {
                $query->where(function ($q) use ($keyword) {
                    $q->where('full_name', 'like', "%{$keyword}%")
                        ->orWhere('employee_id', 'like', "%{$keyword}%")
                        ->orWhere('position', 'like', "%{$keyword}%")
                        ->orWhere('email', 'like', "%{$keyword}%");
                });
            }
            if ($request->filled('department_id')) {
                $query->where('department_id', $request->department_id);
            }
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }
            $results['employees'] = $query->limit(20)->get();
        }

        if (in_array('users', $modules)) {
            $query = User::with(['role', 'department']);
            if ($keyword) {
                $query->where(function ($q) use ($keyword) {
                    $q->where('name', 'like', "%{$keyword}%")
                        ->orWhere('email', 'like', "%{$keyword}%")
                        ->orWhere('username', 'like', "%{$keyword}%")
                        ->orWhere('position', 'like', "%{$keyword}%");
                });
            }
            if ($request->filled('department_id')) {
                $query->where('department_id', $request->department_id);
            }
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }
            $results['users'] = $query->limit(20)->get();
        }

        if (in_array('files', $modules)) {
            $query = Document::with(['folder', 'creator']);
            if ($keyword) {
                $query->where(function ($q) use ($keyword) {
                    $q->where('name', 'like', "%{$keyword}%")
                        ->orWhere('original_name', 'like', "%{$keyword}%")
                        ->orWhere('description', 'like', "%{$keyword}%");
                });
            }
            if ($request->filled('category')) {
                $query->where('category', $request->category);
            }
            if ($request->filled('tags')) {
                $tags = explode(',', $request->tags);
                $query->where(function ($q) use ($tags) {
                    foreach ($tags as $tag) {
                        $q->orWhereJsonContains('tags', trim($tag));
                    }
                });
            }
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }
            $results['files'] = $query->limit(20)->get();
        }

        if (in_array('forms', $modules)) {
            $query = Form::with('creator');
            if ($keyword) {
                $query->where(function ($q) use ($keyword) {
                    $q->where('name', 'like', "%{$keyword}%")
                        ->orWhere('description', 'like', "%{$keyword}%");
                });
            }
            if ($request->filled('category')) {
                $query->where('category', $request->category);
            }
            $results['forms'] = $query->limit(20)->get();
        }

        if (in_array('bills', $modules)) {
            $query = Bill::with(['category', 'creator']);
            if ($keyword) {
                $query->where(function ($q) use ($keyword) {
                    $q->where('name', 'like', "%{$keyword}%")
                        ->orWhere('provider', 'like', "%{$keyword}%")
                        ->orWhere('reference_number', 'like', "%{$keyword}%");
                });
            }
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }
            if ($request->filled('date_from') && $request->filled('date_to')) {
                $query->whereBetween('billing_date', [$request->date_from, $request->date_to]);
            }
            $results['bills'] = $query->limit(20)->get();
        }

        if (in_array('activity_logs', $modules)) {
            $query = ActivityLog::with('user');
            if ($keyword) {
                $query->where(function ($q) use ($keyword) {
                    $q->where('description', 'like', "%{$keyword}%")
                        ->orWhere('module', 'like', "%{$keyword}%")
                        ->orWhere('action', 'like', "%{$keyword}%");
                });
            }
            if ($request->filled('date_from') && $request->filled('date_to')) {
                $query->whereBetween('created_at', [$request->date_from, $request->date_to]);
            }
            $results['activity_logs'] = $query->orderBy('created_at', 'desc')->limit(20)->get();
        }

        return $this->success($results);
    }
}
