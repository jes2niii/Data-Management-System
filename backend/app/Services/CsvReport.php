<?php

namespace App\Services;

use Symfony\Component\HttpFoundation\StreamedResponse;

class CsvReport
{
    public function download(string $filename, array $headers, iterable $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($headers, $rows) {
            $output = fopen('php://output', 'wb');
            try {
                fwrite($output, "\xEF\xBB\xBF");
                fputcsv($output, $headers, ',', '"', '');
                foreach ($rows as $row) {
                    fputcsv($output, array_map($this->safeCell(...), $row), ',', '"', '');
                }
            } finally {
                fclose($output);
            }
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    private function safeCell(mixed $value): mixed
    {
        if (is_string($value) && preg_match('/^(?:[\t\r\n]|[\x00-\x20\x7f\p{Z}\x{FEFF}]*[=+@\x{FF1D}\x{FF0B}\x{FF0D}\x{FF20}-])/u', $value)) {
            return "'".$value;
        }

        return $value;
    }
}
