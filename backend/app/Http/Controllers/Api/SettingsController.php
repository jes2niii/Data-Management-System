<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    public function index()
    {
        $settings = $this->publicSettings();
        $settings['company_logo_url'] = $this->logoUrl($settings['company_logo'] ?? null);

        return $this->success($settings);
    }

    /**
     * Public branding for login page / favicon (no auth required).
     */
    public function branding()
    {
        $settings = Setting::whereIn('key', ['company_name', 'company_logo'])->pluck('value', 'key')->toArray();

        return $this->success([
            'company_name' => $settings['company_name'] ?? 'SEATECH',
            'company_logo' => $settings['company_logo'] ?? null,
            'company_logo_url' => $this->logoUrl($settings['company_logo'] ?? null),
        ]);
    }

    private function logoUrl($path)
    {
        if (!$path) {
            return null;
        }
        // Already a full URL? return as-is.
        if (preg_match('#^https?://#i', $path)) {
            return $path;
        }
        // Stored as "logos/xxx.jpg" -> public "/storage/logos/xxx.jpg".
        $relative = str_starts_with($path, 'storage/')
            ? '/' . $path
            : '/storage/' . ltrim($path, '/');

        return $relative;
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
            if (in_array(strtolower(trim($setting['key'])), ['smtp_password', 'smtp_password_configured', 'company_logo'], true)) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'settings' => 'Use the dedicated settings endpoint for the logo or SMTP password.',
                ]);
            }
        }

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

        $settings = $this->publicSettings();

        return $this->success($settings, 'Settings updated');
    }

    public function updateCompanyProfile(Request $request)
    {
        $request->validate([
            'company_name' => 'nullable|string|max:255',
            'company_address' => 'nullable|string|max:500',
            'company_email' => 'nullable|email|max:255',
            'company_phone' => 'nullable|string|max:50',
            'logo' => 'nullable|image|mimes:png,jpg,jpeg,svg,webp|max:2048',
            'remove_logo' => 'nullable|boolean',
        ]);

        $keys = ['company_name', 'company_address', 'company_email', 'company_phone'];
        $fields = $request->only($keys);

        if ($request->boolean('remove_logo')) {
            $existing = Setting::where('key', 'company_logo')->first();
            if ($existing?->value && preg_match('#^logos/[^/\\\\]+$#D', $existing->value)) {
                Storage::disk('public')->delete($existing->value);
            }
            Setting::updateOrCreate(['key' => 'company_logo'], [
                'value' => null,
                'group' => 'general',
                'type' => 'image',
            ]);
        } elseif ($request->hasFile('logo')) {
            // Delete the old logo so storage doesn't fill with orphans.
            $existing = Setting::where('key', 'company_logo')->first();
            if ($existing?->value && preg_match('#^logos/[^/\\\\]+$#D', $existing->value)) {
                Storage::disk('public')->delete($existing->value);
            }
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

        $settings = $this->publicSettings();
        $settings['company_logo_url'] = $this->logoUrl($settings['company_logo'] ?? null);

        return $this->success($settings, 'Company profile updated');
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

        return $this->success($this->publicSettings(), 'Preferences updated');
    }

    public function updateEmail(Request $request)
    {
        $fields = $request->validate([
            'smtp_host' => 'sometimes|nullable|string|max:255',
            'smtp_port' => 'sometimes|nullable|integer|min:1|max:65535',
            'smtp_username' => 'sometimes|nullable|string|max:255',
            'smtp_password' => 'sometimes|required|string|max:1024',
            'smtp_encryption' => 'sometimes|nullable|in:tls,ssl,none',
            'from_address' => 'sometimes|nullable|email|max:255',
            'from_name' => 'sometimes|nullable|string|max:255',
        ]);
        foreach ($fields as $key => $value) {
            Setting::updateOrCreate(['key' => $key], [
                'value' => $key === 'smtp_password' ? Crypt::encryptString($value) : $value,
                'group' => 'email',
                'type' => $key === 'smtp_password' ? 'encrypted' : 'string',
            ]);
        }

        return $this->success($this->publicSettings(), 'Email settings updated');
    }

    private function publicSettings(): array
    {
        $settings = Setting::query()->pluck('value', 'key')->toArray();
        $configured = false;
        foreach ($settings as $key => $value) {
            if (strtolower(trim($key)) === 'smtp_password') {
                $configured = $configured || ($value !== null && $value !== '');
                unset($settings[$key]);
            }
        }
        $settings['smtp_password_configured'] = $configured;

        return $settings;
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

    public function resetData()
    {
        return $this->error('Web-based data reset is disabled.', 403);
    }
}
