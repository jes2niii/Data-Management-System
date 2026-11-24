<?php

namespace App\Services;

use Closure;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class StageReplacement
{
    public function commit(?UploadedFile $file, string $directory, Closure $write): mixed
    {
        $path = $file?->store($directory, 'public');
        if ($path === false) {
            throw new RuntimeException('Could not store the replacement file.');
        }

        try {
            return DB::transaction(fn () => $write($path));
        } catch (Throwable $error) {
            if ($path !== null) {
                try {
                    if (!Storage::disk('public')->delete($path)) {
                        report(new RuntimeException('Could not clean up an uncommitted replacement file.'));
                    }
                } catch (Throwable $cleanupError) {
                    report($cleanupError);
                }
            }
            throw $error;
        }
    }

    public function retainAfterCommit(?string $path, string $directory): void
    {
        if ($path === null || !preg_match('~^'.preg_quote($directory, '~').'/[a-zA-Z0-9][a-zA-Z0-9_.-]*$~D', $path)) {
            return;
        }

        DB::afterCommit(function () use ($path) {
            try {
                $public = Storage::disk('public');
                $private = Storage::disk('local');
                if (!$public->exists($path)) {
                    return;
                }
                $archive = 'recovery/obsolete-public/'.Str::uuid().'/'.$path;
                $stream = $public->readStream($path);
                if (!is_resource($stream)) {
                    throw new RuntimeException('Could not read the previous file for retention.');
                }
                try {
                    if (!$private->put($archive, $stream)) {
                        throw new RuntimeException('Could not archive the previous file.');
                    }
                } finally {
                    if (is_resource($stream)) {
                        fclose($stream);
                    }
                }
                $options = ['checksum_algo' => 'sha256'];
                if ($private->checksum($archive, $options) !== $public->checksum($path, $options)) {
                    throw new RuntimeException('The archived file could not be verified.');
                }
                if (!$public->delete($path)) {
                    throw new RuntimeException('Could not remove a replaced file from public storage.');
                }
            } catch (Throwable $error) {
                // The database commit has completed. Keep the public original on archive failure and alert operators.
                try {
                    report($error);
                } catch (Throwable) {
                    error_log('DMS could not report a file-retention failure.');
                }
            }
        });
    }
}
