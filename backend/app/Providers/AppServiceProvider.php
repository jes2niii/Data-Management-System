<?php

namespace App\Providers;

use App\Http\Middleware\ProfileReports;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (app()->environment('staging', 'testing')) {
            Event::listen(QueryExecuted::class, static function (QueryExecuted $event) {
                $request = app()->bound('request') ? app('request') : null;
                if ($request instanceof Request && ($metrics = $request->attributes->get(ProfileReports::STATE))) {
                    $metrics->queryCount++;
                    $metrics->dbMs += $event->time ?? 0.0;
                }
            });
        }

        RateLimiter::for('dms-login', function (Request $request) {
            $email = $request->input('email');
            $email = is_string($email) ? mb_strtolower(trim($email)) : '';

            return [
                Limit::perMinute(30)->by('ip:'.$request->ip()),
                Limit::perMinute(5)->by('account:'.hash('sha256', $email.'|'.$request->ip())),
            ];
        });
    }
}
