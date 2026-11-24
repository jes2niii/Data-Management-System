<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\ActivityLog;
use App\Models\Bill;
use App\Models\BillCategory;
use App\Models\Document;
use App\Models\Employee;
use App\Models\Folder;
use App\Models\Form;
use App\Models\FormCategory;
use App\Models\InventoryItem;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Setting;
use App\Models\SurveyForm;
use App\Models\TestExam;
use App\Models\User;
use Illuminate\Database\Connection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ContainmentTest extends TestCase
{
    private ?Connection $mysqlFixture = null;

    protected function setUp(): void
    {
        parent::setUp();

        config(['app.key' => 'base64:'.base64_encode(random_bytes(32)), 'cache.default' => 'array']);
        if (getenv('DMS_CI_MYSQL') === '1') {
            $this->startCiMysqlFixture();

            return;
        }

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.url' => null,
            'database.connections.sqlite.database' => ':memory:',
            'database.connections.sqlite.foreign_key_constraints' => true,
        ]);
        DB::purge('sqlite');
        $this->assertSame(':memory:', DB::connection()->getDatabaseName());
        // Load the relevant schema into SQLite. The historical forms migration
        // needs its old index removed explicitly on SQLite, not on MySQL.
        $tables = [
            '073921', '080000', '080100', '080200', '080300', '080400', '080500',
            '080800', '080900', '081000', '081100', '081200', '081300', '081400', '081500', '081700',
            '081900', '082300', '082400', '082500', '082600', '083100', '083200', '083400', '083500',
            '085800', '085900', '086000', '086100',
        ];
        foreach ($tables as $time) {
            if ($time === '082500') {
                Schema::table('forms', fn ($table) => $table->dropIndex(['category']));
            }
            $migration = glob(database_path("migrations/2026_08_07_{$time}_*.php"))[0];
            (require $migration)->up();
        }
    }

    protected function tearDown(): void
    {
        try {
            $this->mysqlFixture?->rollBack(0);
        } finally {
            parent::tearDown();
        }
    }

    private function startCiMysqlFixture(): void
    {
        $settings = config('database.connections.mysql');
        // No fallback to a developer's or deployed application's configuration.
        $this->assertTrue(app()->environment('testing'));
        $this->assertSame('true', getenv('GITHUB_ACTIONS'));
        $this->assertSame('mysql', config('database.default'));
        $this->assertSame('127.0.0.1', $settings['host']);
        $this->assertSame('dms_ci', $settings['database']);
        $this->assertSame('dms_ci', $settings['username']);
        $this->assertEmpty($settings['url']);

        $connection = DB::connection('mysql');
        $this->assertSame('dms_ci', $connection->selectOne('SELECT DATABASE() AS current_db')->current_db);
        $this->assertSame(0, $connection->table('users')->count(), 'Use an unseeded CI-only schema.');
        $connection->beginTransaction();
        $this->mysqlFixture = $connection;
    }

    public function test_document_visibility_applies_to_both_aliases_search_and_folder_counts(): void
    {
        $owner = $this->account();
        $reader = $this->account(['documents.read', 'folders.read']);
        $folder = Folder::create(['name' => 'Team', 'category' => 'general', 'created_by' => $owner->id]);
        $shared = $this->document($owner, 'Shared Document', $folder);
        $restricted = $this->document($owner, 'Restricted Document', $folder);
        $restricted->access()->create(['access_type' => 'user', 'access_id' => $owner->id]);
        Sanctum::actingAs($reader);

        foreach (['files', 'documents'] as $alias) {
            $this->getJson("/api/{$alias}/{$shared->id}")->assertOk();
            $this->getJson("/api/{$alias}/{$restricted->id}")->assertNotFound();
            $this->getJson("/api/{$alias}/{$restricted->id}/download")->assertNotFound();
            $this->postJson("/api/{$alias}/{$shared->id}/approve")->assertForbidden();
        }

        $this->getJson('/api/search?keyword=Document&modules=files,users')
            ->assertOk()->assertJsonCount(1, 'data.files')->assertJsonMissingPath('data.users')
            ->assertJsonPath('data.files.0.id', $shared->id);
        $this->getJson("/api/folders/{$folder->id}")
            ->assertOk()->assertJsonPath('data.documents_count', 1)->assertJsonCount(1, 'data.documents');
    }

    public function test_new_upload_is_private_and_is_readable_through_the_api(): void
    {
        Storage::fake('documents');
        Storage::fake('public');
        $author = $this->account(['documents.read', 'documents.create']);
        Sanctum::actingAs($author);
        $file = UploadedFile::fake()->createWithContent('note.txt', 'An example document.');
        $response = $this->post('/api/files', ['file' => $file], ['Accept' => 'application/json']);
        $response->assertCreated();
        Storage::disk('documents')->assertExists($response->json('data.file_path'));
        Storage::disk('public')->assertMissing($response->json('data.file_path'));
        $id = $response->json('data.id');

        $this->get("/api/documents/{$id}/preview")->assertOk()
            ->assertHeader('Content-Type', 'text/plain; charset=utf-8')->assertStreamedContent('An example document.');
        $this->get("/api/files/{$id}/download")->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')->assertDownload('note.txt');
    }

    public function test_legacy_document_remains_downloadable_from_the_authorized_api(): void
    {
        Storage::fake('documents');
        Storage::fake('public');
        $owner = $this->account(['documents.read']);
        $folder = Folder::create(['name' => 'Archive', 'category' => 'general', 'created_by' => $owner->id]);
        $document = $this->document($owner, 'Legacy', $folder);
        Storage::disk('public')->put($document->file_path, 'Existing document.');
        Sanctum::actingAs($owner);

        $this->get("/api/files/{$document->id}/download")->assertOk()->assertStreamedContent('Existing document.');
    }

    public function test_module_permissions_apply_to_writes_and_dashboard_sections(): void
    {
        Sanctum::actingAs($this->account(['inventory.read', 'inventory_categories.read', 'reports.read']));

        $this->patchJson('/api/inventory/1')->assertForbidden();
        $this->deleteJson('/api/inventory-categories/1')->assertForbidden();
        $this->postJson('/api/attendances')->assertForbidden();
        $this->getJson('/api/book-inventories')->assertForbidden();
        $this->getJson('/api/reports/activity')->assertForbidden();
        $this->getJson('/api/dashboard')->assertOk()
            ->assertJsonPath('data.total_employees', 0)
            ->assertJsonPath('data.recent_activities', [])
            ->assertJsonPath('data.latest_files', [])
            ->assertJsonPath('data.inventory_stats.total_items', 0);
    }

    public function test_inventory_dashboard_preserves_totals_with_a_bounded_query_count(): void
    {
        Sanctum::actingAs($this->account(['inventory.read']));
        InventoryItem::create(['name' => 'Low stock', 'quantity' => 2, 'unit_cost' => 3, 'reorder_point' => 5]);
        InventoryItem::create(['name' => 'Out of stock', 'quantity' => 0, 'unit_cost' => 4, 'reorder_point' => 5]);
        InventoryItem::create(['name' => 'In stock', 'quantity' => 20, 'unit_cost' => 2, 'reorder_point' => 10]);
        InventoryItem::create(['name' => 'Archived', 'quantity' => 100, 'unit_cost' => 5])->delete();
        DB::enableQueryLog();

        $this->getJson('/api/dashboard')->assertOk()
            ->assertJsonPath('data.inventory_stats.total_items', 3)
            ->assertJsonPath('data.inventory_stats.total_quantity', 22)
            ->assertJsonPath('data.inventory_stats.total_value', 46)
            ->assertJsonPath('data.inventory_stats.low_stock', 1)
            ->assertJsonPath('data.inventory_stats.out_of_stock', 1);

        $inventoryTable = DB::connection()->getQueryGrammar()->wrapTable('inventory_items');
        $queries = collect(DB::getQueryLog())->filter(fn ($entry) => str_contains($entry['query'], "from {$inventoryTable}"));
        $this->assertCount(4, $queries);
    }

    public function test_opt_in_report_profiler_measures_buffered_and_streamed_responses_without_request_data(): void
    {
        config(['dms.profile_reports' => true]);
        Sanctum::actingAs($this->account(['reports.read', 'reports.export', 'activity_logs.read']));
        Log::spy();

        $this->getJson('/api/reports/activity?module=private-filter')->assertOk();
        $export = $this->get('/api/reports/export/activity/csv?module=private-filter')->assertOk();
        $export->streamedContent();

        Log::shouldHaveReceived('info')->withArgs(fn ($event, $metrics) => $event === 'dms.performance'
            && $metrics['route'] === 'api/reports/activity'
            && $metrics['db_queries'] > 0 && $metrics['response_bytes'] > 0
            && $metrics['completed'] === true && $metrics['streamed'] === false
            && !str_contains(json_encode($metrics, JSON_THROW_ON_ERROR), 'private-filter'))->once();
        Log::shouldHaveReceived('info')->withArgs(fn ($event, $metrics) => $event === 'dms.performance'
            && $metrics['route'] === 'api/reports/export/{type}/{format}'
            && $metrics['db_queries'] > 0 && $metrics['response_bytes'] === null
            && $metrics['completed'] === true && $metrics['streamed'] === true
            && !str_contains(json_encode($metrics, JSON_THROW_ON_ERROR), 'private-filter'))->once();
    }

    public function test_report_profiler_is_off_by_default_and_ignores_other_routes(): void
    {
        config(['dms.profile_reports' => false]);
        Sanctum::actingAs($this->account());
        Log::spy();
        $this->getJson('/api/dashboard')->assertOk();
        config(['dms.profile_reports' => true]);
        $this->getJson('/api/me')->assertOk();
        Log::shouldNotHaveReceived('info');
    }

    public function test_delegated_admin_cannot_change_system_accounts_or_grant_unheld_permissions(): void
    {
        $super = $this->account([], Role::SUPER_ADMIN);
        $operator = $this->account(['users.update', 'roles.update']);
        $employee = $this->account();
        $permission = $this->permission('settings.update');
        Sanctum::actingAs($operator);

        $this->postJson("/api/users/{$super->id}/disable")->assertForbidden();
        $this->postJson("/api/users/{$employee->id}/assign-role", ['role_id' => $super->role_id])->assertForbidden();
        $this->postJson("/api/roles/{$employee->role_id}/permissions", ['attach' => [$permission->name]])->assertForbidden();
        $this->assertFalse($super->fresh()->is_disabled);
        $this->assertSame($employee->role_id, $employee->fresh()->role_id);
    }

    public function test_last_super_admin_is_protected_and_disabling_a_user_revokes_tokens(): void
    {
        $super = $this->account([], Role::SUPER_ADMIN);
        $employee = $this->account();
        $token = $employee->createToken('test')->accessToken;
        Sanctum::actingAs($super);

        $this->postJson("/api/users/{$super->id}/disable")->assertConflict();
        $this->deleteJson("/api/roles/{$super->role_id}")->assertForbidden();
        $this->postJson("/api/users/{$employee->id}/disable")->assertOk();
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $token->id]);
        $this->assertTrue($employee->fresh()->is_disabled);
    }

    public function test_disabled_account_cannot_use_an_existing_bearer_token(): void
    {
        $user = $this->account();
        $token = $user->createToken('test')->plainTextToken;
        $user->update(['is_disabled' => true]);

        $this->withToken($token)->getJson('/api/me')->assertForbidden();
    }

    public function test_password_change_requires_current_password_and_revokes_tokens(): void
    {
        $user = $this->account();
        $oldPassword = Str::random(24);
        $newPassword = Str::random(24);
        $user->update(['password' => $oldPassword]);
        $token = $user->createToken('test')->accessToken;
        Sanctum::actingAs($user);
        $fields = ['password' => $newPassword, 'password_confirmation' => $newPassword];

        $this->putJson('/api/profile', $fields)->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $this->putJson('/api/profile', $fields + ['current_password' => Str::random(24)])
            ->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $oversized = str_repeat('€', 25);
        $this->putJson('/api/profile', [
            'current_password' => $oldPassword, 'password' => $oversized, 'password_confirmation' => $oversized,
        ])->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $token->id]);
        $this->putJson('/api/profile', $fields + ['current_password' => $oldPassword])->assertOk()->assertJsonMissingPath('data.password');
        $this->assertTrue(Hash::check($newPassword, $user->fresh()->password));
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $token->id]);
    }

    public function test_profile_json_and_multipart_updates_return_the_current_account(): void
    {
        Storage::fake('public');
        $user = $this->account();
        $user->update(['phone' => '123456']);
        Sanctum::actingAs($user);
        $this->putJson('/api/profile', ['name' => 'Updated Name', 'phone' => null])
            ->assertOk()->assertJsonPath('data.name', 'Updated Name')
            ->assertJsonPath('data.phone', null)
            ->assertJsonPath('data.role.id', $user->role_id);

        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aR7sAAAAASUVORK5CYII=');
        $result = $this->post('/api/profile', [
            '_method' => 'PUT',
            'photo' => UploadedFile::fake()->createWithContent('avatar.png', $png),
        ], ['Accept' => 'application/json']);
        $result->assertOk()->assertJsonPath('data.name', 'Updated Name');
        $path = $result->json('data.photo');
        Storage::disk('public')->assertExists($path);
        $this->assertSame($path, $user->fresh()->photo);
        $this->assertNull($user->fresh()->phone);
    }

    public function test_forms_filter_paginate_update_categories_and_count_downloads(): void
    {
        Storage::fake('public');
        $user = $this->account(['forms.read', 'forms.update']);
        Sanctum::actingAs($user);
        $category = FormCategory::create(['name' => 'Templates']);
        $other = FormCategory::create(['name' => 'Records']);
        $create = fn ($name, $categoryId, $path) => Form::create([
            'name' => $name, 'form_category_id' => $categoryId,
            'file_path' => $path, 'created_by' => $user->id,
        ]);
        $first = $create('Template/Example', $category->id, 'forms/example.txt');
        $missing = $create('Missing', $category->id, 'forms/missing.txt');
        $create('Other', $other->id, 'forms/other.txt');
        Storage::disk('public')->put($first->file_path, 'Template text');

        $this->getJson("/api/forms?category={$category->id}&per_page=1&page=2")
            ->assertOk()->assertJsonPath('data.total', 2)->assertJsonPath('data.current_page', 2)
            ->assertJsonPath('data.data.0.id', $first->id)->assertJsonPath('data.data.0.category.name', 'Templates');
        $this->getJson('/api/forms?per_page=101')->assertUnprocessable()->assertJsonValidationErrors('per_page');
        $this->get("/api/forms/{$first->id}/download")->assertOk()
            ->assertDownload('Template_Example.txt')->assertStreamedContent('Template text');
        $this->getJson("/api/forms/{$missing->id}/download")->assertNotFound();
        $this->assertSame(1, $first->fresh()->download_count);
        $this->assertSame(0, $missing->fresh()->download_count);
        $this->putJson("/api/forms/{$first->id}", ['form_category_id' => $other->id])
            ->assertOk()->assertJsonPath('data.category.id', $other->id);
    }

    public function test_report_csv_preserves_document_visibility_and_includes_the_end_date(): void
    {
        $owner = $this->account();
        $reader = $this->account(['reports.read', 'reports.export', 'documents.read']);
        $folder = Folder::create(['name' => 'Reports', 'category' => 'general', 'created_by' => $owner->id]);
        $visible = $this->document($owner, 'Visible, subject', $folder);
        $restricted = $this->document($owner, 'Restricted', $folder);
        $tomorrow = $this->document($owner, 'Tomorrow', $folder);
        $restricted->access()->create(['access_type' => 'user', 'access_id' => $owner->id]);
        DB::table('documents')->whereIn('id', [$visible->id, $restricted->id])->update(['created_at' => '2026-08-01 23:59:59']);
        DB::table('documents')->where('id', $tomorrow->id)->update(['created_at' => '2026-08-02 00:00:00']);
        Sanctum::actingAs($reader);

        $filter = '?date_to=2026-08-01';
        $this->getJson('/api/reports/documents'.$filter)->assertOk()
            ->assertJsonPath('data.total_documents', 1)->assertJsonPath('data.documents.0.id', $visible->id)
            ->assertJsonPath('data.monthly_uploads.0.count', 1);
        $this->getJson('/api/reports/export/document/json'.$filter)->assertOk()
            ->assertHeader('Content-Disposition', 'attachment; filename="document-report.json"')
            ->assertJsonPath('data.total_documents', 1);
        $response = $this->get('/api/reports/export/document/csv'.$filter)->assertOk()->assertDownload('document-report.csv');
        $csv = $response->streamedContent();
        $this->assertStringContainsString('"Visible, subject.txt"', $csv);
        $this->assertStringNotContainsString('Restricted', $csv);
        $this->assertStringNotContainsString('Tomorrow', $csv);
        $this->getJson('/api/reports/export/document/csv?date_from=2026-08-02&date_to=2026-08-01')
            ->assertUnprocessable()->assertJsonValidationErrors('date_to');
        $this->getJson('/api/reports/export/document/pdf')->assertBadRequest();
        $this->getJson('/api/reports/export/employee/csv')->assertForbidden();
    }

    public function test_other_csv_reports_apply_their_filters_and_preserve_safe_cell_boundaries(): void
    {
        $user = $this->account(['reports.read', 'reports.export', 'employees.read', 'bills.read', 'activity_logs.read']);
        Sanctum::actingAs($user);
        Employee::create(['employee_id' => 'E-1', 'full_name' => 'Included Employee', 'department_id' => $user->department_id,
            'position' => 'Analyst', 'status' => 'active']);
        Employee::create(['employee_id' => 'E-2', 'full_name' => 'Excluded Employee', 'department_id' => $user->department_id,
            'position' => 'Analyst', 'status' => 'inactive']);
        $this->getJson('/api/reports/employees/departments')->assertOk()->assertJsonPath('data.0.id', $user->department_id);
        $employees = $this->get('/api/reports/export/employee/csv?status=active&department_id='.$user->department_id)
            ->assertOk()->streamedContent();
        $this->assertStringContainsString('Included Employee', $employees);
        $this->assertStringNotContainsString('Excluded Employee', $employees);

        $category = BillCategory::create(['name' => 'Utilities']);
        Bill::create(['name' => 'Pending Bill', 'bill_category_id' => $category->id, 'amount' => 40,
            'billing_date' => '2026-08-01', 'due_date' => '2026-08-20', 'created_by' => $user->id, 'status' => 'pending']);
        Bill::create(['name' => 'Paid Bill', 'bill_category_id' => $category->id, 'amount' => 20,
            'billing_date' => '2026-08-01', 'due_date' => '2026-08-20', 'created_by' => $user->id, 'status' => 'paid']);
        $bills = $this->get('/api/reports/export/bill/csv?status=pending&date_from=2026-08-01')->assertOk()->streamedContent();
        $this->assertStringContainsString('Pending Bill', $bills);
        $this->assertStringNotContainsString('Paid Bill', $bills);

        ActivityLog::create(['user_id' => $user->id, 'module' => 'reports', 'action' => 'review',
            'description' => " =example, \"review\"", 'created_at' => '2026-08-01 12:00:00']);
        $activity = $this->get('/api/reports/export/activity/csv?module=reports')->assertOk()->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF", $activity);
        $this->assertStringContainsString('"\' =example, ""review"""', $activity);
    }

    public function test_login_is_throttled_and_successful_login_issues_expiring_credentials(): void
    {
        $user = $this->account();
        $password = Str::random(24);
        $user->update(['password' => $password]);
        $this->postJson('/api/login', ['email' => $user->email, 'password' => $password])->assertOk();
        $this->assertNotNull($user->tokens()->sole()->expires_at);

        for ($attempt = 0; $attempt < 4; $attempt++) {
            $this->postJson('/api/login', ['email' => $user->email, 'password' => Str::random()])->assertUnauthorized();
        }
        $this->postJson('/api/login', ['email' => $user->email, 'password' => Str::random()])->assertTooManyRequests();
    }

    public function test_reset_is_disabled_and_smtp_secrets_are_write_only(): void
    {
        Sanctum::actingAs($this->account([], Role::SUPER_ADMIN));
        $secret = Str::random(24);
        $this->putJson('/api/settings/email', ['smtp_password' => $secret])
            ->assertOk()->assertJsonPath('data.smtp_password_configured', true)
            ->assertJsonMissingPath('data.smtp_password');
        $setting = Setting::where('key', 'smtp_password')->sole();
        $this->assertNotSame($secret, $setting->value);
        $this->assertTrue(hash_equals($secret, Crypt::decryptString($setting->value)));
        $this->getJson('/api/settings')->assertOk()->assertJsonMissingPath('data.smtp_password');
        $this->putJson('/api/settings/preferences', ['currency' => 'PHP'])
            ->assertOk()->assertJsonMissingPath('data.smtp_password');
        $this->postJson('/api/settings/reset')->assertForbidden();
        $this->assertDatabaseHas('settings', ['id' => $setting->id]);
    }

    public function test_survey_submission_scopes_questions_and_accepts_a_no_score_of_zero(): void
    {
        Sanctum::actingAs($this->account(['items.read']));
        $form = SurveyForm::create(['title' => 'First form', 'status' => 'active']);
        $other = SurveyForm::create(['title' => 'Second form', 'status' => 'active']);
        $yesNo = $form->questions()->create(['question' => 'Did this help?', 'type' => 'yes_no', 'max_score' => 1]);
        $rating = $form->questions()->create(['question' => 'Rate the session', 'type' => 'rating', 'max_score' => 5]);
        $unrelated = $other->questions()->create(['question' => 'Other question', 'type' => 'rating']);
        $url = "/api/surveys/{$form->id}/responses";

        $this->postJson($url, ['answers' => [['question_id' => $unrelated->id, 'score' => 1]]])
            ->assertUnprocessable()->assertJsonValidationErrors('answers.0.question_id');
        $this->postJson($url, ['answers' => [['question_id' => $rating->id, 'score' => 6]]])
            ->assertUnprocessable()->assertJsonValidationErrors('answers.0.score');
        $this->postJson($url, ['answers' => array_fill(0, 2, ['question_id' => $rating->id, 'score' => 1])])
            ->assertUnprocessable()->assertJsonValidationErrors('answers.0.question_id');
        $this->assertDatabaseCount('survey_responses', 0);
        $this->assertDatabaseCount('survey_answers', 0);

        $this->postJson($url, ['answers' => [
            ['question_id' => $yesNo->id, 'score' => 0, 'answer_text' => 'No'],
            ['question_id' => $rating->id, 'score' => 4],
        ]])->assertCreated()->assertJsonPath('data.total_score', '4.00')->assertJsonPath('data.average_score', '2.00');
        $this->assertDatabaseHas('survey_answers', ['survey_question_id' => $yesNo->id, 'score' => 0]);
    }

    public function test_invalid_later_exam_submission_rolls_back_the_batch(): void
    {
        Sanctum::actingAs($this->account(['items.update']));
        $exam = TestExam::create(['title' => 'First exam']);
        $other = TestExam::create(['title' => 'Second exam']);
        $item = $exam->items()->create(['item_number' => 1, 'correct_answer' => 'A']);
        $blankKey = $exam->items()->create(['item_number' => 2]);
        $unrelated = $other->items()->create(['item_number' => 1, 'correct_answer' => 'A']);
        $url = "/api/test-exams/{$exam->id}/students";
        $valid = ['name' => 'Student One', 'answers' => [
            ['item_id' => $item->id, 'answer' => 'A'],
            ['item_id' => $blankKey->id, 'answer' => null],
        ]];

        $this->postJson($url, ['students' => [$valid, [
            'name' => 'Student Two', 'answers' => [['item_id' => $unrelated->id, 'answer' => 'A']],
        ]]])->assertUnprocessable()->assertJsonValidationErrors('students.1.answers.0.item_id');
        $this->assertDatabaseCount('test_students', 0);
        $this->assertDatabaseCount('test_answers', 0);

        $duplicate = ['name' => 'Student Two', 'answers' => array_fill(0, 2, ['item_id' => $item->id, 'answer' => 'A'])];
        $this->postJson($url, ['students' => [$duplicate]])
            ->assertUnprocessable()->assertJsonValidationErrors('students.0.answers.1.item_id');
        $this->postJson($url, ['students' => [$valid, ['name' => 'Student Two', 'answers' => $valid['answers']]]])
            ->assertCreated()->assertJsonCount(2, 'data.students');
        $this->assertDatabaseCount('test_answers', 4);
        $this->assertDatabaseHas('test_students', ['name' => 'Student One', 'items_correct' => 1, 'percentage' => 50]);
        $this->assertDatabaseHas('test_answers', ['test_item_id' => $blankKey->id, 'is_correct' => false]);
    }

    private function permission(string $name): Permission
    {
        [$module, $action] = explode('.', $name);

        return Permission::firstOrCreate(compact('name', 'module', 'action'), ['description' => $name]);
    }

    private function account(array $permissions = [], ?string $roleName = null): User
    {
        $id = Str::lower(Str::random(12));
        $role = Role::create(['name' => $roleName ?? "Role {$id}"]);
        $role->permissions()->sync(array_map(fn ($name) => $this->permission($name)->id, $permissions));
        $department = Department::create(['name' => "Department {$id}", 'code' => $id]);

        return User::create([
            'name' => "User {$id}", 'email' => "{$id}@example.test", 'username' => $id,
            'position' => 'Test', 'role_id' => $role->id, 'department_id' => $department->id,
            'password' => Hash::make(Str::random(24)),
        ]);
    }

    private function document(User $owner, string $name, Folder $folder): Document
    {
        return Document::create([
            'name' => $name, 'original_name' => "$name.txt", 'file_path' => 'documents/'.Str::random(),
            'file_size' => 1, 'file_type' => 'txt', 'mime_type' => 'text/plain',
            'created_by' => $owner->id, 'folder_id' => $folder->id,
        ]);
    }
}
