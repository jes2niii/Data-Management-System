<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ActivityLogService
{
    public static function log(Request $request, string $module, string $action, string $description, $affectedRecord = null, ?array $oldValues = null, ?array $newValues = null, string $status = 'success'): ActivityLog
    {
        $ua = $request->header('User-Agent');

        return ActivityLog::create([
            'user_id' => $request->user()?->id,
            'ip_address' => $request->ip(),
            'device' => $ua ? self::parseDevice($ua) : null,
            'browser' => $ua ? self::parseBrowser($ua) : null,
            'operating_system' => $ua ? self::parseOS($ua) : null,
            'module' => $module,
            'action' => $action,
            'description' => $description,
            'affected_record_id' => $affectedRecord?->id,
            'affected_record_type' => $affectedRecord ? get_class($affectedRecord) : null,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'status' => $status,
            'created_at' => now(),
        ]);
    }

    private static function parseDevice(string $ua): string
    {
        if (stripos($ua, 'mobile') !== false || stripos($ua, 'android') !== false && stripos($ua, 'mobile') !== false) {
            return 'Mobile';
        }
        if (stripos($ua, 'tablet') !== false || stripos($ua, 'ipad') !== false) {
            return 'Tablet';
        }
        return 'Desktop';
    }

    private static function parseBrowser(string $ua): string
    {
        $browsers = [
            'Edge' => '/edg/i',
            'Chrome' => '/chrome/i',
            'Firefox' => '/firefox/i',
            'Safari' => '/safari/i',
        ];

        foreach ($browsers as $name => $pattern) {
            if (preg_match($pattern, $ua)) {
                return $name;
            }
        }

        return 'Unknown';
    }

    private static function parseOS(string $ua): string
    {
        $systems = [
            'Windows' => '/windows/i',
            'macOS' => '/macintosh|mac os x/i',
            'Linux' => '/linux/i',
            'Android' => '/android/i',
            'iOS' => '/iphone|ipad|ipod/i',
        ];

        foreach ($systems as $name => $pattern) {
            if (preg_match($pattern, $ua)) {
                return $name;
            }
        }

        return 'Unknown';
    }
}
