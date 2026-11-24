<?php

namespace Tests\Feature;

use App\Services\IntegrityPreflight;
use Illuminate\Database\Connection;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class IntegrityPreflightTest extends TestCase
{
    public function test_command_requires_an_explicit_separate_database(): void
    {
        config([
            'database.default' => 'mysql',
            'database.connections.mysql.database' => 'application_database',
            'database.connections.dms_audit.database' => 'application_database',
        ]);

        $this->artisan('dms:integrity-preflight')->assertExitCode(2);
        $this->artisan('dms:integrity-preflight', ['--staging-database' => 'application_database'])->assertExitCode(2);
    }

    public function test_preflight_detects_inconsistencies_without_changing_records(): void
    {
        $db = $this->auditConnection();
        $db->statement('CREATE TABLE attendances (id INTEGER PRIMARY KEY, employee_id INTEGER, date TEXT, session TEXT)');
        $db->table('attendances')->insert([
            ['employee_id' => 1, 'date' => '2026-08-01', 'session' => null],
            ['employee_id' => 1, 'date' => '2026-08-01', 'session' => null],
            ['employee_id' => 2, 'date' => '2026-08-01', 'session' => 'morning'],
        ]);
        $db->statement('CREATE TABLE employees (id INTEGER PRIMARY KEY)');
        $db->table('employees')->insert(['id' => 1]);
        $db->statement('CREATE TABLE inventory_items (id INTEGER PRIMARY KEY, quantity DECIMAL(12,2))');
        $db->table('inventory_items')->insert(['id' => 1, 'quantity' => 9.00]);
        $db->statement('CREATE TABLE inventory_batches (inventory_item_id INTEGER, quantity DECIMAL(12,2), remaining_quantity DECIMAL(12,2))');
        $db->table('inventory_batches')->insert(['inventory_item_id' => 1, 'quantity' => 5.00, 'remaining_quantity' => 6.00]);

        $db->enableQueryLog();
        $rows = array_column((new IntegrityPreflight)->database($db), null, 0);
        $this->assertSame([1, 2, 1], [
            $rows['Duplicate attendance key groups'][2],
            $rows['Attendance rows without a session'][2],
            $rows['Attendance rows without an employee'][2],
        ]);
        $this->assertSame(1, $rows['Inventory items with a batch balance difference'][2]);
        $this->assertSame(1, $rows['Inventory batches with out-of-range balances'][2]);
        $this->assertSame('skipped: schema missing', $rows['Test answers with inconsistent exam references'][1]);
        foreach ($db->getQueryLog() as $query) {
            $this->assertStringStartsWith('select', strtolower(ltrim($query['query'])));
        }
        $this->assertSame(3, $db->table('attendances')->count());
        $this->artisan('dms:integrity-preflight', ['--staging-database' => ':memory:'])
            ->expectsOutputToContain('File checks not run')->assertExitCode(2);
    }

    public function test_file_inventory_counts_public_missing_and_unsafe_references_without_showing_paths(): void
    {
        $db = $this->auditConnection();
        $db->statement('CREATE TABLE documents (id INTEGER PRIMARY KEY, file_path TEXT)');
        $db->statement('CREATE TABLE book_inventories (id INTEGER PRIMARY KEY, file_path TEXT)');
        $db->table('documents')->insert([
            ['file_path' => 'legacy.txt'],
            ['file_path' => 'private.txt'],
            ['file_path' => 'missing.txt'],
            ['file_path' => 'both.txt'],
            ['file_path' => '../outside.txt'],
        ]);
        $db->table('book_inventories')->insert(['file_path' => null]);

        $base = str_replace('\\', '/', sys_get_temp_dir()).'/dms-integrity-'.bin2hex(random_bytes(10));
        $public = $base.'/public';
        $private = $base.'/private';
        mkdir($public, 0700, true);
        mkdir($private, 0700);
        $files = [$public.'/legacy.txt', $public.'/both.txt', $private.'/private.txt', $private.'/both.txt'];
        try {
            foreach ($files as $file) {
                file_put_contents($file, 'test fixture');
            }

            $rows = (new IntegrityPreflight)->files($db, $public, $private);
            $counts = array_column($rows, 2, 0);
            $this->assertSame(2, $counts['documents: public snapshot']);
            $this->assertSame(1, $counts['documents: both snapshots']);
            $this->assertSame(1, $counts['documents: missing']);
            $this->assertSame(1, $counts['documents: unsafe or empty']);
            $this->assertSame(0, $counts['book_inventories: missing']);
            $this->assertStringNotContainsString('legacy.txt', json_encode($rows, JSON_THROW_ON_ERROR));
            $this->artisan('dms:integrity-preflight', [
                '--staging-database' => ':memory:', '--public-copy' => $public, '--private-copy' => $private,
            ])->expectsOutputToContain('documents: public snapshot')->assertExitCode(2);
        } finally {
            foreach ($files as $file) {
                if (is_file($file)) {
                    unlink($file);
                }
            }
            rmdir($private);
            rmdir($public);
            rmdir($base);
        }
    }

    private function auditConnection(): Connection
    {
        config([
            'database.default' => 'mysql',
            'database.connections.mysql.database' => 'application_database',
            'database.connections.dms_audit' => [
                'driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '',
            ],
        ]);
        DB::purge('dms_audit');

        return DB::connection('dms_audit');
    }
}
