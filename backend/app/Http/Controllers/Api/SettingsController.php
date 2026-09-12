<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SettingsController extends Controller
{
    public function index()
    {
        $settings = Setting::all()->pluck('value', 'key');

        return $this->success($settings);
    }

    public function update(Request $request)
    {
        $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.value' => 'nullable',
            'settings.*.group' => 'nullable|string',
            'settings.*.type' => 'nullable|string',
        ]);

        foreach ($request->settings as $setting) {
            Setting::updateOrCreate(
                ['key' => $setting['key']],
                [
                    'value' => $setting['value'] ?? null,
                    'group' => $setting['group'] ?? null,
                    'type' => $setting['type'] ?? 'string',
                ]
            );
        }

        $settings = Setting::all()->pluck('value', 'key');

        return $this->success($settings, 'Settings updated');
    }

    public function updateCompanyProfile(Request $request)
    {
        $keys = ['company_name', 'company_address', 'company_email', 'company_phone'];
        $fields = $request->only($keys);

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('logos', 'public');
            Setting::updateOrCreate(['key' => 'company_logo'], [
                'value' => $path,
                'group' => 'general',
                'type' => 'image',
            ]);
        }

        foreach ($fields as $key => $value) {
            if ($value !== null) {
                Setting::updateOrCreate(['key' => $key], [
                    'value' => $value,
                    'group' => 'general',
                    'type' => 'string',
                ]);
            }
        }

        return $this->success(Setting::all()->pluck('value', 'key'), 'Company profile updated');
    }

    public function updatePreferences(Request $request)
    {
        $keys = ['timezone', 'currency', 'date_format'];
        foreach ($keys as $key) {
            if ($request->has($key)) {
                Setting::updateOrCreate(['key' => $key], [
                    'value' => $request->$key,
                    'group' => 'general',
                    'type' => 'string',
                ]);
            }
        }

        return $this->success(Setting::all()->pluck('value', 'key'), 'Preferences updated');
    }

    public function updateEmail(Request $request)
    {
        $keys = ['smtp_host', 'smtp_port', 'smtp_username', 'smtp_password', 'smtp_encryption', 'from_address', 'from_name'];
        foreach ($keys as $key) {
            if ($request->has($key)) {
                Setting::updateOrCreate(['key' => $key], [
                    'value' => $request->$key,
                    'group' => 'email',
                    'type' => 'string',
                ]);
            }
        }

        return $this->success(Setting::all()->pluck('value', 'key'), 'Email settings updated');
    }

    public function getDataCounts()
    {
        $counts = [
            'employees' => \App\Models\Employee::count(),
            'attendances' => \App\Models\Attendance::count(),
            'trainings' => \App\Models\Training::count(),
            'training_details' => \App\Models\TrainingDetail::count(),
            'training_monitorings' => \App\Models\TrainingMonitoring::count(),
            'training_price_logs' => \App\Models\TrainingPriceLog::count(),
            'training_categories' => \App\Models\TrainingCategory::count(),
            'bills' => \App\Models\Bill::count(),
            'documents' => \App\Models\Document::count(),
            'forms' => \App\Models\Form::count(),
            'activity_logs' => \App\Models\ActivityLog::count(),
            'notifications' => \App\Models\Notification::count(),
        ];
        return $this->success($counts);
    }

    public function resetData(Request $request)
    {
        $request->validate([
            'confirm' => 'required|string|in:RESET',
            'modules' => 'nullable|array',
            'modules.*' => 'string|in:employees,attendances,trainings,training_details,training_monitorings,training_price_logs,bills,documents,forms,activity_logs,notifications,all',
        ]);

        $user = $request->user();
        if ($user->role?->name !== 'Super Admin' && $user->role?->name !== 'Administrator') {
            // Also allow via permission check, but we enforce role for safety
            if (!$user->hasPermission('settings.update')) {
                return $this->error('Unauthorized. Only Super Admin can reset data.', 403);
            }
        }

        $modules = $request->get('modules', ['all']);
        if (in_array('all', $modules)) {
            $modules = ['employees','attendances','trainings','training_details','training_monitorings','bills','documents','forms','activity_logs','notifications'];
        }

        // Map modules to tables
        $tableMap = [
            'employees' => ['employees','employee_attachments','employee_histories'],
            'attendances' => ['attendances'],
            'trainings' => ['trainings'],
            'training_details' => ['training_details'],
            'training_monitorings' => ['training_monitorings'],
            'training_price_logs' => ['training_price_logs'],
            'training_categories' => ['training_categories'],
            'bills' => ['bills','bill_attachments'],
            'documents' => ['documents','document_versions','document_comments','document_shares','document_access','folders'],
            'forms' => ['forms'],
            'activity_logs' => ['activity_logs'],
            'notifications' => ['notifications'],
        ];

        // Special handling: trainings includes details and price logs and categories if 'all' was requested, but we keep categories separate
        // If 'trainings' is requested and training_details/price_logs not explicitly, include them for completeness
        $tablesToTruncate = [];
        foreach ($modules as $mod) {
            if (isset($tableMap[$mod])) {
                $tablesToTruncate = array_merge($tablesToTruncate, $tableMap[$mod]);
            }
        }
        // Ensure trainings also clears its dependents if clear all
        if (in_array('trainings', $modules) && !in_array('training_details', $modules)) {
            // Don't auto-clear details unless explicitly requested; but for 'all' we already have them
        }

        $tablesToTruncate = array_unique($tablesToTruncate);

        // Filter to only existing tables
        $existingTables = [];
        foreach ($tablesToTruncate as $table) {
            if (Schema::hasTable($table)) {
                $existingTables[] = $table;
            }
        }

        if (empty($existingTables)) {
            return $this->error('No valid tables to clear.', 400);
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        $cleared = [];
        foreach ($existingTables as $table) {
            // Special handling for employees: keep at least? No, clear all
            // For users, we never clear
            try {
                DB::table($table)->truncate();
                $cleared[] = $table;
            } catch (\Throwable $e) {
                // Fallback to delete if truncate fails due to FK
                try {
                    DB::table($table)->delete();
                    $cleared[] = $table . ' (deleted)';
                } catch (\Throwable $e2) {
                    // ignore
                }
            }
        }
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // Log the reset action
        try {
            \App\Models\ActivityLog::create([
                'user_id' => $user->id,
                'module' => 'settings',
                'action' => 'reset_data',
                'description' => 'Reset data: ' . implode(', ', $cleared) . ' by ' . $user->email,
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {}

        return $this->success(['cleared' => $cleared, 'counts' => $this->getCountsForTables($cleared)], 'Data reset successfully. Cleared: ' . implode(', ', $cleared));
    }

    private function getCountsForTables(array $tables): array
    {
        $counts = [];
        foreach ($tables as $table) {
            $clean = str_replace(' (deleted)', '', $table);
            if (Schema::hasTable($clean)) {
                try {
                    $counts[$clean] = DB::table($clean)->count();
                } catch (\Throwable $e) {
                    $counts[$clean] = 'unknown';
                }
            }
        }
        return $counts;
    }
}
