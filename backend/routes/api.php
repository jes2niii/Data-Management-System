<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillCategoryController;
use App\Http\Controllers\Api\BillController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\DocumentCategoryController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\EmployeeAttachmentCategoryController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\FolderCategoryController;
use App\Http\Controllers\Api\FolderController;
use App\Http\Controllers\Api\FormCategoryController;
use App\Http\Controllers\Api\FormController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\SurveyController;
use App\Http\Controllers\Api\TestAnalysisController;
use App\Http\Controllers\Api\InventoryCategoryController;
use App\Http\Controllers\Api\InventoryItemController;
use App\Http\Controllers\Api\InventorySupplierController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\TrainingController;
use App\Http\Controllers\Api\TrainingDetailController;
use App\Http\Controllers\Api\TrainingMonitoringController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
// Public branding (company name + logo) for the login page / favicon.
Route::get('/branding', [SettingsController::class, 'branding']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);

    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Users
    Route::get('/users', [UserController::class, 'index'])->middleware('permission:users.read');
    Route::post('/users', [UserController::class, 'store'])->middleware('permission:users.create');
    Route::get('/users/{user}', [UserController::class, 'show'])->middleware('permission:users.read');
    Route::put('/users/{user}', [UserController::class, 'update'])->middleware('permission:users.update');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->middleware('permission:users.delete');
    Route::post('/users/{id}/disable', [UserController::class, 'disable'])->middleware('permission:users.update');
    Route::post('/users/{id}/enable', [UserController::class, 'enable'])->middleware('permission:users.update');
    Route::post('/users/{id}/reset-password', [UserController::class, 'resetPassword'])->middleware('permission:users.update');
    Route::post('/users/{id}/assign-role', [UserController::class, 'assignRole'])->middleware('permission:users.update');

    // Employees
    Route::get('/employees', [EmployeeController::class, 'index'])->middleware('permission:employees.read');
    Route::post('/employees', [EmployeeController::class, 'store'])->middleware('permission:employees.create');
    Route::get('/employees/{employee}', [EmployeeController::class, 'show'])->middleware('permission:employees.read');
    Route::put('/employees/{employee}', [EmployeeController::class, 'update'])->middleware('permission:employees.update');
    Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy'])->middleware('permission:employees.delete');
    Route::post('/employees/{id}/attachments', [EmployeeController::class, 'uploadAttachment'])->middleware('permission:employees.update');
    Route::delete('/employees/{employee}/attachments/{attachment}', [EmployeeController::class, 'deleteAttachment'])->middleware('permission:employees.update');

    // Departments
    Route::get('/departments', [DepartmentController::class, 'index'])->middleware('permission:departments.read');
    Route::post('/departments', [DepartmentController::class, 'store'])->middleware('permission:departments.create');
    Route::put('/departments/{department}', [DepartmentController::class, 'update'])->middleware('permission:departments.update');
    Route::delete('/departments/{department}', [DepartmentController::class, 'destroy'])->middleware('permission:departments.delete');

    // Roles & Permissions
    Route::get('/roles', [RoleController::class, 'index'])->middleware('permission:roles.read');
    Route::post('/roles', [RoleController::class, 'store'])->middleware('permission:roles.create');
    Route::put('/roles/{role}', [RoleController::class, 'update'])->middleware('permission:roles.update');
    Route::delete('/roles/{role}', [RoleController::class, 'destroy'])->middleware('permission:roles.delete');
    Route::get('/roles/{id}/permissions', [RoleController::class, 'permissions'])->middleware('permission:roles.read');
    Route::post('/roles/{id}/permissions', [RoleController::class, 'syncPermissions'])->middleware('permission:roles.update');
    Route::get('/permissions', [PermissionController::class, 'index'])->middleware('permission:roles.read');

    // Files / Documents
    $fileRoutes = function () {
        Route::get('/download', [DocumentController::class, 'download']);
        Route::get('/preview', [DocumentController::class, 'preview']);
        Route::get('/versions', [DocumentController::class, 'versions']);
        Route::post('/version', [DocumentController::class, 'newVersion']);
        Route::get('/comments', [DocumentController::class, 'comments']);
        Route::post('/comments', [DocumentController::class, 'addComment']);
        Route::post('/restore', [DocumentController::class, 'restore']);
        Route::post('/favorite', [DocumentController::class, 'favorite']);
        Route::post('/lock', [DocumentController::class, 'lock']);
        Route::post('/share', [DocumentController::class, 'share']);
        Route::post('/approve', [DocumentController::class, 'approve']);
        Route::post('/reject', [DocumentController::class, 'reject']);
        Route::post('/archive', [DocumentController::class, 'archive']);
        Route::post('/move', [DocumentController::class, 'move']);
    };

    Route::prefix('files')->middleware('permission:documents.read')->group(function () use ($fileRoutes) {
        Route::get('/', [DocumentController::class, 'index']);
        Route::get('/{document}', [DocumentController::class, 'show']);
        Route::prefix('/{document}')->group($fileRoutes);
    });
    Route::post('/files', [DocumentController::class, 'store'])->middleware('permission:documents.create');
    Route::put('/files/{document}', [DocumentController::class, 'update'])->middleware('permission:documents.update');
    Route::delete('/files/{document}', [DocumentController::class, 'destroy'])->middleware('permission:documents.delete');

    Route::prefix('documents')->middleware('permission:documents.read')->group(function () use ($fileRoutes) {
        Route::get('/', [DocumentController::class, 'index']);
        Route::get('/{document}', [DocumentController::class, 'show']);
        Route::prefix('/{document}')->group($fileRoutes);
    });
    Route::post('/documents', [DocumentController::class, 'store'])->middleware('permission:documents.create');
    Route::put('/documents/{document}', [DocumentController::class, 'update'])->middleware('permission:documents.update');
    Route::delete('/documents/{document}', [DocumentController::class, 'destroy'])->middleware('permission:documents.delete');

    // Folders
    Route::get('/folder-tree', [FolderController::class, 'tree'])->middleware('permission:folders.read');
    Route::get('/folders', [FolderController::class, 'index'])->middleware('permission:folders.read');
    Route::post('/folders', [FolderController::class, 'store'])->middleware('permission:folders.create');
    Route::get('/folders/{folder}', [FolderController::class, 'show'])->middleware('permission:folders.read');
    Route::put('/folders/{folder}', [FolderController::class, 'update'])->middleware('permission:folders.update');
    Route::delete('/folders/{folder}', [FolderController::class, 'destroy'])->middleware('permission:folders.delete');

    // Forms
    Route::get('/forms/{id}/download', [FormController::class, 'download'])->middleware('permission:forms.read');
    Route::get('/forms', [FormController::class, 'index'])->middleware('permission:forms.read');
    Route::post('/forms', [FormController::class, 'store'])->middleware('permission:forms.create');
    Route::get('/forms/{form}', [FormController::class, 'show'])->middleware('permission:forms.read');
    Route::put('/forms/{form}', [FormController::class, 'update'])->middleware('permission:forms.update');
    Route::delete('/forms/{form}', [FormController::class, 'destroy'])->middleware('permission:forms.delete');
    Route::apiResource('/form-categories', FormCategoryController::class);

    // Billing
    Route::get('/billing/analytics', [BillController::class, 'analytics'])->middleware('permission:bills.read');
    Route::get('/bills/export/{format}', [BillController::class, 'export'])->middleware('permission:bills.export');
    Route::post('/bills/{id}/mark-paid', [BillController::class, 'markAsPaid'])->middleware('permission:bills.update');
    Route::get('/bills', [BillController::class, 'index'])->middleware('permission:bills.read');
    Route::post('/bills', [BillController::class, 'store'])->middleware('permission:bills.create');
    Route::get('/bills/{bill}', [BillController::class, 'show'])->middleware('permission:bills.read');
    Route::put('/bills/{bill}', [BillController::class, 'update'])->middleware('permission:bills.update');
    Route::delete('/bills/{bill}', [BillController::class, 'destroy'])->middleware('permission:bills.delete');
    Route::apiResource('/bill-categories', BillCategoryController::class);

    // Subscriptions (Billing - Subscription Monitoring)
    Route::get('/subscriptions/stats', [SubscriptionController::class, 'stats'])->middleware('permission:bills.read');
    Route::get('/subscriptions/upcoming', [SubscriptionController::class, 'upcoming'])->middleware('permission:bills.read');
    Route::post('/subscriptions/{id}/renew', [SubscriptionController::class, 'renew'])->middleware('permission:bills.update');
    Route::post('/subscriptions/{id}/pause', [SubscriptionController::class, 'pause'])->middleware('permission:bills.update');
    Route::post('/subscriptions/{id}/resume', [SubscriptionController::class, 'resume'])->middleware('permission:bills.update');
    Route::get('/subscriptions/{id}/billings', [SubscriptionController::class, 'billings'])->middleware('permission:bills.read');
    Route::post('/subscriptions/{id}/billings', [SubscriptionController::class, 'storeBilling'])->middleware('permission:bills.create');
    Route::get('/subscriptions', [SubscriptionController::class, 'index'])->middleware('permission:bills.read');
    Route::post('/subscriptions', [SubscriptionController::class, 'store'])->middleware('permission:bills.create');
    Route::get('/subscriptions/{subscription}', [SubscriptionController::class, 'show'])->middleware('permission:bills.read');
    Route::put('/subscriptions/{subscription}', [SubscriptionController::class, 'update'])->middleware('permission:bills.update');
    Route::delete('/subscriptions/{subscription}', [SubscriptionController::class, 'destroy'])->middleware('permission:bills.delete');
    Route::apiResource('/document-categories', DocumentCategoryController::class);
    Route::apiResource('/folder-categories', FolderCategoryController::class);
    Route::apiResource('/employee-attachment-categories', EmployeeAttachmentCategoryController::class);

    // Activity Logs
    Route::get('/activity-logs', [ActivityLogController::class, 'index'])->middleware('permission:activity_logs.read');
    Route::get('/activity-logs/{id}', [ActivityLogController::class, 'show'])->middleware('permission:activity_logs.read');
    Route::get('/activity-logs/export/{format}', [ActivityLogController::class, 'export'])->middleware('permission:activity_logs.export');

    // Reports
    Route::get('/reports/export/{type}/{format}', [ReportController::class, 'export'])->middleware('permission:reports.export');
    Route::get('/reports/employees', [ReportController::class, 'employeeReport'])->middleware('permission:reports.read');
    Route::get('/reports/documents', [ReportController::class, 'documentReport'])->middleware('permission:reports.read');
    Route::get('/reports/bills', [ReportController::class, 'billReport'])->middleware('permission:reports.read');
    Route::get('/reports/activity', [ReportController::class, 'activityReport'])->middleware('permission:reports.read');

    // Settings
    Route::get('/settings', [SettingsController::class, 'index'])->middleware('permission:settings.read');
    Route::put('/settings', [SettingsController::class, 'update'])->middleware('permission:settings.update');
    Route::post('/settings/company-profile', [SettingsController::class, 'updateCompanyProfile'])->middleware('permission:settings.update');
    Route::put('/settings/preferences', [SettingsController::class, 'updatePreferences'])->middleware('permission:settings.update');
    Route::put('/settings/email', [SettingsController::class, 'updateEmail'])->middleware('permission:settings.update');
    Route::get('/settings/data-counts', [SettingsController::class, 'getDataCounts'])->middleware('permission:settings.read');
    Route::post('/settings/reset', [SettingsController::class, 'resetData'])->middleware('permission:settings.update');

    // Surveys
    Route::get('/surveys', [SurveyController::class, 'index'])->middleware('permission:items.read');
    Route::post('/surveys', [SurveyController::class, 'store'])->middleware('permission:items.create');
    Route::get('/surveys/{survey}', [SurveyController::class, 'show'])->middleware('permission:items.read');
    Route::put('/surveys/{survey}', [SurveyController::class, 'update'])->middleware('permission:items.update');
    Route::delete('/surveys/{survey}', [SurveyController::class, 'destroy'])->middleware('permission:items.delete');
    Route::post('/surveys/{id}/responses', [SurveyController::class, 'submitResponse']);
    Route::get('/surveys/{id}/responses', [SurveyController::class, 'responses']);
    Route::get('/surveys/{id}/analysis', [SurveyController::class, 'analysis']);

    // Attendance
    Route::get('/attendances', [AttendanceController::class, 'index']);
    Route::post('/attendances', [AttendanceController::class, 'store']);
    Route::put('/attendances/{attendance}', [AttendanceController::class, 'update']);
    Route::delete('/attendances/{attendance}', [AttendanceController::class, 'destroy']);
    Route::get('/attendances/summary', [AttendanceController::class, 'summary']);
    Route::get('/attendance-statuses', [AttendanceController::class, 'getStatuses']);

    // Test Item Analysis (U-L Method)
    Route::get('/test-exams', [TestAnalysisController::class, 'index']);
    Route::post('/test-exams', [TestAnalysisController::class, 'store']);
    Route::get('/test-exams/{test_exam}', [TestAnalysisController::class, 'show']);
    Route::put('/test-exams/{test_exam}', [TestAnalysisController::class, 'update']);
    Route::delete('/test-exams/{test_exam}', [TestAnalysisController::class, 'destroy']);
    Route::post('/test-exams/{id}/students', [TestAnalysisController::class, 'addStudents']);
    Route::post('/test-exams/{id}/analyze', [TestAnalysisController::class, 'runAnalysis']);
    Route::get('/test-exams/{id}/analysis', [TestAnalysisController::class, 'getAnalysis']);

    // Training Monitoring
    Route::get('/training-monitorings/stats', [TrainingMonitoringController::class, 'stats']);
    Route::get('/training-monitorings/export/{format}', [TrainingMonitoringController::class, 'export']);
    Route::get('/training-monitorings', [TrainingMonitoringController::class, 'index']);
    Route::post('/training-monitorings', [TrainingMonitoringController::class, 'store']);
    Route::get('/training-monitorings/{id}', [TrainingMonitoringController::class, 'show']);
    Route::put('/training-monitorings/{id}', [TrainingMonitoringController::class, 'update']);
    Route::delete('/training-monitorings/{id}', [TrainingMonitoringController::class, 'destroy']);

    // Trainings Catalog (for Settings)
    Route::get('/trainings/stats', [TrainingController::class, 'stats']);
    Route::get('/trainings/price-logs', [TrainingController::class, 'allPriceLogs']);
    Route::get('/trainings/{id}/price-history', [TrainingController::class, 'priceHistory']);
    Route::apiResource('trainings', TrainingController::class);

    // Training Details
    Route::get('/training-details/{id}/price-history', [TrainingDetailController::class, 'priceHistory']);
    Route::apiResource('training-details', TrainingDetailController::class);

    // Training Price Logs (global)
    Route::get('/training-price-logs', [TrainingController::class, 'allPriceLogs']);

    // Inventory Monitoring (Supply Chain Management Department) - 5 Types
    Route::get('/inventory/stats', [InventoryItemController::class, 'stats'])->middleware('permission:inventory.read');
    Route::post('/inventory/{id}/adjust', [InventoryItemController::class, 'adjustStock'])->middleware('permission:inventory.update');
    Route::get('/inventory/{id}/transactions', [InventoryItemController::class, 'transactions'])->middleware('permission:inventory.read');
    Route::get('/inventory/{id}/batches', [InventoryItemController::class, 'batches'])->middleware('permission:inventory.read');
    Route::apiResource('inventory', InventoryItemController::class)->middleware('permission:inventory.read');
    Route::post('/inventory', [InventoryItemController::class, 'store'])->middleware('permission:inventory.create')->withoutMiddleware('permission:inventory.read');
    Route::put('/inventory/{inventory_item}', [InventoryItemController::class, 'update'])->middleware('permission:inventory.update')->withoutMiddleware('permission:inventory.read');
    Route::delete('/inventory/{inventory_item}', [InventoryItemController::class, 'destroy'])->middleware('permission:inventory.delete')->withoutMiddleware('permission:inventory.read');
    Route::apiResource('inventory-categories', InventoryCategoryController::class)->middleware('permission:inventory_categories.read');
    Route::apiResource('inventory-suppliers', InventorySupplierController::class)->middleware('permission:inventory_suppliers.read');

    // Supply Chain 5-Type Inventory
    Route::apiResource('supply-inventories', \App\Http\Controllers\Api\SupplyInventoryController::class);
    Route::apiResource('uniform-inventories', \App\Http\Controllers\Api\UniformInventoryController::class);
    Route::apiResource('certificate-inventories', \App\Http\Controllers\Api\CertificateInventoryController::class);
    Route::apiResource('individual-inventories', \App\Http\Controllers\Api\IndividualInventoryController::class);
    Route::apiResource('property-summaries', \App\Http\Controllers\Api\PropertySummaryController::class);
    Route::get('/supply-inventories-stats', [\App\Http\Controllers\Api\SupplyInventoryController::class, 'stats']);
    Route::get('/uniform-inventories-stats', [\App\Http\Controllers\Api\UniformInventoryController::class, 'stats']);
    Route::get('/certificate-inventories-stats', [\App\Http\Controllers\Api\CertificateInventoryController::class, 'stats']);

    // Book Inventory (Records Department)
    Route::get('/book-inventories/stats', [\App\Http\Controllers\Api\BookInventoryController::class, 'stats']);
    Route::get('/book-inventories/{id}/download', [\App\Http\Controllers\Api\BookInventoryController::class, 'download']);
    Route::get('/book-inventories/{id}/preview', [\App\Http\Controllers\Api\BookInventoryController::class, 'preview']);
    Route::get('/book-inventories/{id}/view', [\App\Http\Controllers\Api\BookInventoryController::class, 'view']);
    Route::apiResource('book-inventories', \App\Http\Controllers\Api\BookInventoryController::class);
    Route::apiResource('book-categories', \App\Http\Controllers\Api\BookCategoryController::class);

    // Search
    Route::get('/search', [SearchController::class, 'search']);

    // Notifications (no special permission needed)
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
});
