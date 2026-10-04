<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\PublicController;
use App\Http\Controllers\RepairController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\TechnicianController;
use App\Http\Controllers\TemplateController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

/* ===================== AUTH ===================== */
Route::post('/login', [AuthController::class, 'login']);

/* ===================== PUBLIC: SEARCH (ไม่ต้อง login) ===================== */
Route::get('/public/search', [PublicController::class, 'search']);

/* ===================== PUBLIC: UPLOADED FILES ===================== */
// Node เดิมเสิร์ฟ /uploads ที่ root แต่ frontend ต่อ URL เป็น ${VITE_API_BASE}/uploads/... และ base ของ Laravel มี /api นำหน้า
// จึงต้องมี route นี้เพื่อให้รูปแจ้งซ่อม/รูปสินค้าแสดงได้โดยไม่ต้องแก้ frontend
Route::get('/uploads/{path}', [PublicController::class, 'uploadedFile'])->where('path', '.*');

/* ===================== REPAIR: FILE UPLOAD ===================== */
Route::post('/upload-repair-files', [RepairController::class, 'uploadFiles']);
Route::delete('/delete-file/{filename}', [RepairController::class, 'deleteFile']);

/* ===================== REPAIR: CREATE ===================== */
Route::post('/repair-requests-with-files', [RepairController::class, 'createRepair']);
Route::post('/repair-requests', [RepairController::class, 'createRepair']);

/* ===================== REPAIR: UPDATE ===================== */
Route::put('/repair-requests-with-files/{code}', [RepairController::class, 'updateRepair']);
Route::put('/repair-requests/{code}', [RepairController::class, 'updateRepair']);

/* ===================== REPAIR: VIEW ===================== */
Route::get('/admin/repairs', [RepairController::class, 'getAdminRepairs'])->middleware('auth.jwt');
Route::get('/my-repairs/{userId}', [RepairController::class, 'getUserRepairs']);
Route::delete('/my-repairs/{code}', [RepairController::class, 'deleteRepair'])->middleware('auth.jwt');

/* ===================== REPAIR: DETAIL ===================== */
Route::get('/repair-requests/{code}', [RepairController::class, 'getRepairDetail']);

/* ===================== REPAIR: ASSIGNMENT ===================== */
Route::post('/assign-repair', [RepairController::class, 'assignIndividual'])->middleware('auth.jwt');
Route::post('/assign-repair-team', [RepairController::class, 'assignTeam'])->middleware('auth.jwt');

/* ===================== REPAIR: TECHNICIAN ===================== */
Route::put('/technician/accept-job/{code}', [RepairController::class, 'acceptJob'])->middleware('auth.jwt');

/* ===================== REPAIR: STATISTICS ===================== */
Route::get('/repair-stats/{userId}', [RepairController::class, 'getStats']);

/* ===================== USER ===================== */
Route::get('/titles', [UserController::class, 'getTitles'])->middleware('auth.jwt');
Route::get('/roles', [UserController::class, 'getRoles'])->middleware('auth.jwt');
Route::get('/users', [UserController::class, 'getUsers'])->middleware('auth.jwt');
Route::post('/users', [UserController::class, 'createUser']);
Route::get('/users/{id}', [UserController::class, 'getUserById'])->middleware('auth.jwt');
Route::put('/users/{id}', [UserController::class, 'updateUser'])->middleware('auth.jwt');
Route::post('/users/{id}/reset-password', [UserController::class, 'resetPassword'])->middleware('auth.jwt');
Route::delete('/users/{id}', [UserController::class, 'deleteUser'])->middleware('auth.jwt');
Route::get('/user/{id}', [UserController::class, 'getUserById']);
Route::put('/edit-personal/{id}', [UserController::class, 'updatePersonalProfile']);
Route::post('/users/import', [UserController::class, 'importUsers'])->middleware('auth.jwt');

/* ===================== TECHNICIAN (management) ===================== */
Route::get('/technicians', [TechnicianController::class, 'getTechnicians'])->middleware('auth.jwt');
Route::get('/technician-types', [TechnicianController::class, 'getTypes']);
Route::post('/technician-types', [TechnicianController::class, 'createType']);
Route::put('/technician-types/{id}', [TechnicianController::class, 'updateType']);
Route::delete('/technician-types/{id}', [TechnicianController::class, 'deleteType']);
// หมายเหตุ: ต้นฉบับ Node มี route "/technician/repairs" ซ้ำกัน 2 ที่ (technician-routes.js กับ repair-routes.js)
// เพราะ technician-routes.js ถูก mount ก่อน Express เลยใช้ query นี้จริง (มี building/floor/room join สด + rf_prop_number)
// ส่วนอีกตัวใน repair-service.js เป็น dead code ที่ไม่เคยถูกเรียกจริง เลยไม่พอร์ตมา
Route::get('/technician/repairs', [TechnicianController::class, 'getMyRepairs'])->middleware('auth.jwt');
Route::get('/technician/history', [TechnicianController::class, 'getHistory'])->middleware('auth.jwt');
Route::get('/technician/my-stock-forms', [TechnicianController::class, 'getMyStockForms'])->middleware('auth.jwt');
Route::put('/technician/close-job/{rfCode}', [TechnicianController::class, 'closeJob'])->middleware('auth.jwt');
// หมายเหตุ: ต้นฉบับ Node มี POST /withdraw ซ้ำกันอีกจุด (technician-routes.js กับ stock-routes.js)
// technician-routes.js mount ก่อนเหมือนเดิม เลยเป็นตัวที่ทำงานจริง ฝั่ง stock-service.js ของเดิมเป็น dead code
Route::post('/withdraw', [TechnicianController::class, 'withdrawStock'])->middleware('auth.jwt');

/* ===================== LOCATION ===================== */
Route::get('/buildings', [LocationController::class, 'getBuildings']);
Route::post('/buildings', [LocationController::class, 'createBuilding'])->middleware('auth.jwt');
Route::put('/buildings/{id}', [LocationController::class, 'updateBuilding'])->middleware('auth.jwt');
Route::delete('/buildings/{id}', [LocationController::class, 'deleteBuilding'])->middleware('auth.jwt');
Route::get('/floors/{buildingId?}', [LocationController::class, 'getFloors']);
Route::post('/floors', [LocationController::class, 'createFloor'])->middleware('auth.jwt');
Route::put('/floors/{id}', [LocationController::class, 'updateFloor'])->middleware('auth.jwt');
Route::delete('/floors/{id}', [LocationController::class, 'deleteFloor'])->middleware('auth.jwt');
Route::get('/rooms/{floorId?}', [LocationController::class, 'getRooms']);
Route::post('/rooms', [LocationController::class, 'createRoom'])->middleware('auth.jwt');
Route::put('/rooms/{id}', [LocationController::class, 'updateRoom'])->middleware('auth.jwt');
Route::delete('/rooms/{id}', [LocationController::class, 'deleteRoom'])->middleware('auth.jwt');
Route::post('/locations/import', [LocationController::class, 'importLocations'])->middleware('auth.jwt');
Route::get('/locations/check-usage/{type}/{id}', [LocationController::class, 'checkUsageInRepairs']);

/* ===================== STOCK: PRODUCTS ===================== */
Route::get('/show-stock', [StockController::class, 'getAllProducts'])->middleware('auth.jwt');
Route::post('/add-stock', [StockController::class, 'addProduct'])->middleware('auth.jwt');
Route::put('/update-stock/{id}', [StockController::class, 'updateProduct'])->middleware('auth.jwt');
Route::delete('/delete-stock/{id}', [StockController::class, 'deleteProduct'])->middleware('auth.jwt');

/* ===================== STOCK: TRANSACTIONS ===================== */
Route::get('/transactions', [StockController::class, 'getAllTransactions'])->middleware('auth.jwt');

/* ===================== STOCK: CATEGORY / UNITS ===================== */
Route::get('/category', [StockController::class, 'getCategories']);
Route::post('/category', [StockController::class, 'addCategory'])->middleware('auth.jwt');
Route::put('/category/{id}', [StockController::class, 'updateCategory'])->middleware('auth.jwt');
Route::delete('/category/{id}', [StockController::class, 'deleteCategory'])->middleware('auth.jwt');
Route::get('/units', [StockController::class, 'getUnits']);

/* ===================== STOCK: FORMS ===================== */
Route::get('/stock-forms', [StockController::class, 'getAllStockForms'])->middleware('auth.jwt');
Route::get('/stock-forms/detail/{sfCode}', [StockController::class, 'getStockFormDetail'])->middleware('auth.jwt');
Route::get('/stock-forms/{id}', [StockController::class, 'getUserStockForms'])->middleware('auth.jwt');
Route::put('/stock-forms/update-status', [StockController::class, 'updateFormStatus'])->middleware('auth.jwt');
Route::put('/stock-forms/detail/update-item-status', [StockController::class, 'updateItemStatus'])->middleware('auth.jwt');
Route::put('/stock-forms/detail/update-items-status-batch', [StockController::class, 'updateMultipleItemsStatus'])->middleware('auth.jwt');
Route::put('/stock-forms/return-item', [StockController::class, 'returnItem'])->middleware('auth.jwt');

/* ===================== STOCK: IMPORT ===================== */
Route::post('/stock/import', [StockController::class, 'importStock'])->middleware('auth.jwt');

/* ===================== EXCEL TEMPLATE DOWNLOAD ===================== */
Route::get('/download-template/{type}', [TemplateController::class, 'downloadTemplate']);

Route::get('/health', function () {
    $dbStatus = 'not connected';

    try {
        DB::connection()->getPdo();
        $dbStatus = 'connected';
    } catch (\Throwable $e) {
        $dbStatus = 'error: '.$e->getMessage();
    }

    return response()->json([
        'status' => 'OK',
        'timestamp' => now()->toIso8601String(),
        'environment' => app()->environment(),
        'database' => $dbStatus,
    ]);
});


