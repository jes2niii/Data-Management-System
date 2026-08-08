<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

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
}
