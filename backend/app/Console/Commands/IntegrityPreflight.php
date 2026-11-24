<?php

namespace App\Console\Commands;

use App\Services\IntegrityPreflight as Preflight;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class IntegrityPreflight extends Command
{
    protected $signature = 'dms:integrity-preflight
        {--staging-database= : Exact name of the authorized staging copy}
        {--public-copy= : Absolute path to the staged public storage snapshot}
        {--private-copy= : Absolute path to the staged private storage snapshot}';

    protected $description = 'Report database and optional file integrity counts using the dedicated staging connection';

    public function handle(Preflight $preflight): int
    {
        $config = config('database.connections.dms_audit');
        $expected = $this->option('staging-database');
        if (!is_string($expected) || $expected === '' || $expected !== ($config['database'] ?? null)
            || ($config['driver'] !== 'mysql' && !app()->environment('testing'))
            || $this->matchesApplicationDatabase($expected)) {
            $this->error('Provide the exact database name of a separately configured staging copy.');

            return self::INVALID;
        }

        if ($config['driver'] === 'mysql' && (blank($config['host']) || blank($config['username']) || blank($config['password']))) {
            $this->error('Configure a dedicated staging host and read-only credentials.');

            return self::INVALID;
        }

        $public = $this->option('public-copy');
        $private = $this->option('private-copy');
        $scanFiles = $public !== null || $private !== null;
        if ($scanFiles) {
            $public = $this->validateDirectory($public);
            $private = $this->validateDirectory($private);
            if ($public === null || $private === null || $public === $private) {
                $this->error('File checks require two distinct, readable, absolute snapshot directories outside application storage.');

                return self::INVALID;
            }
        }

        try {
            $connection = DB::connection('dms_audit');
            if ($connection->getDriverName() === 'mysql') {
                $connection->statement('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
            }
            $report = $connection->transaction(function () use ($connection, $preflight, $scanFiles, $public, $private) {
                $report = $preflight->database($connection);
                if ($scanFiles) {
                    array_push($report, ...$preflight->files($connection, $public, $private));
                }

                return $report;
            });
        } catch (Throwable) {
            // Database and filesystem exceptions can contain connection details or sensitive paths.
            $this->error('Preflight could not complete. Check the staging connection, schema, and snapshot permissions.');

            return self::INVALID;
        }

        $this->table(['Check', 'Status', 'Count'], $report);
        if (!$scanFiles) {
            $this->warn('File checks not run. Supply both snapshot directories to include them.');
        }
        if (in_array('skipped: schema missing', array_column($report, 1), true)) {
            return self::INVALID;
        }

        return in_array('review', array_column($report, 1), true) ? self::FAILURE : self::SUCCESS;
    }

    private function matchesApplicationDatabase(string $name): bool
    {
        $default = config('database.default');
        $application = config("database.connections.{$default}", []);
        $urlPath = parse_url($application['url'] ?? '', PHP_URL_PATH);

        return $default === 'dms_audit'
            || $name === ($application['database'] ?? null)
            || (is_string($urlPath) && $name === rawurldecode(ltrim($urlPath, '/')));
    }

    private function validateDirectory(?string $directory): ?string
    {
        if ($directory === null || !preg_match('~^(?:/|[a-z]:[/\\\\])~i', $directory)) {
            return null;
        }
        $resolved = realpath($directory);
        if ($resolved === false || !is_dir($resolved) || !is_readable($resolved)) {
            return null;
        }

        $resolved = str_replace('\\', '/', $resolved);
        $appStorage = str_replace('\\', '/', realpath(storage_path()) ?: storage_path());
        if ($resolved === '/' || preg_match('~^[a-z]:/?$~i', $resolved)
            || strcasecmp($resolved, $appStorage) === 0
            || str_starts_with(strtolower($resolved), strtolower($appStorage).'/')
            || str_starts_with(strtolower($appStorage), strtolower($resolved).'/')) {
            return null;
        }

        return rtrim($resolved, '/');
    }
}
