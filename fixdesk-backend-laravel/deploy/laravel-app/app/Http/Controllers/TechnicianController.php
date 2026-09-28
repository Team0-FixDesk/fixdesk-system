<?php

namespace App\Http\Controllers;

use App\Services\RepairFileUploadService;
use App\Services\TechnicianService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TechnicianController extends Controller
{
    public function __construct(
        private TechnicianService $techService,
        private RepairFileUploadService $fileUpload,
    ) {}

    public function getTechnicians()
    {
        try {
            return response()->json($this->techService->getAllTechnicians());
        } catch (\Throwable $e) {
            return response()->json(['message' => 'ดึงข้อมูลช่างไม่สำเร็จ', 'error' => $e->getMessage()], 500);
        }
    }

    public function getTypes()
    {
        try {
            return response()->json($this->techService->getAllTechnicianTypes());
        } catch (\Throwable $e) {
            return response()->json(['message' => 'ดึงข้อมูลไม่สำเร็จ'], 500);
        }
    }

    public function createType(Request $request)
    {
        $ttName = trim((string) $request->input('tt_name'));
        if (! $ttName) {
            return response()->json(['message' => 'กรุณากรอกชื่อประเภทงาน'], 400);
        }

        try {
            $newId = $this->techService->createTechnicianType($ttName);

            return response()->json(['message' => 'เพิ่มประเภทงานสำเร็จ', 'tt_id' => $newId, 'tt_name' => $ttName], 201);
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'DUPLICATE_NAME') {
                return response()->json(['message' => 'ชื่อซ้ำในระบบ'], 400);
            }

            return response()->json(['message' => 'เพิ่มข้อมูลไม่สำเร็จ'], 500);
        }
    }

    public function updateType(Request $request, int $id)
    {
        $ttName = trim((string) $request->input('tt_name'));
        if (! $ttName) {
            return response()->json(['message' => 'กรุณากรอกชื่อประเภทงาน'], 400);
        }

        try {
            $this->techService->updateTechnicianType($id, $ttName);

            return response()->json(['message' => 'แก้ไขข้อมูลสำเร็จ']);
        } catch (\RuntimeException $e) {
            return match ($e->getMessage()) {
                'DEPENDENCY_EXISTS' => response()->json(['message' => 'ประเภทนี้ถูกใช้งานอยู่ แก้ไขไม่ได้'], 400),
                'DUPLICATE_NAME' => response()->json(['message' => 'ชื่อซ้ำในระบบ'], 400),
                'NOT_FOUND' => response()->json(['message' => 'ไม่พบข้อมูล'], 404),
                default => response()->json(['message' => 'แก้ไขข้อมูลไม่สำเร็จ'], 500),
            };
        }
    }

    public function deleteType(int $id)
    {
        try {
            $this->techService->deleteTechnicianType($id);

            return response()->json(['message' => 'ลบข้อมูลสำเร็จ']);
        } catch (\RuntimeException $e) {
            return match ($e->getMessage()) {
                'DEPENDENCY_EXISTS' => response()->json(['message' => 'ลบไม่ได้ มีการใช้งานอยู่ในแบบฟอร์ม'], 400),
                'NOT_FOUND' => response()->json(['message' => 'ไม่พบข้อมูล'], 404),
                default => response()->json(['message' => 'ลบข้อมูลไม่สำเร็จ'], 500),
            };
        }
    }

    public function getMyRepairs(Request $request)
    {
        $authUser = $request->attributes->get('authUser');
        $techId = (int) ($authUser['us_id'] ?? 0);

        try {
            return response()->json($this->techService->getTechnicianRepairs($techId));
        } catch (\Throwable $e) {
            return response()->json(['message' => 'ดึงงานซ่อมไม่สำเร็จ'], 500);
        }
    }

    public function getHistory(Request $request)
    {
        $authUser = $request->attributes->get('authUser');
        $techId = (int) ($authUser['us_id'] ?? 0);

        try {
            return response()->json($this->techService->getTechnicianHistory($techId));
        } catch (\Throwable $e) {
            return response()->json(['message' => 'ดึงประวัติไม่สำเร็จ'], 500);
        }
    }

    public function getMyStockForms(Request $request)
    {
        $authUser = $request->attributes->get('authUser');
        $techId = (int) ($authUser['us_id'] ?? 0);

        try {
            return response()->json($this->techService->getMyStockForms($techId));
        } catch (\Throwable $e) {
            return response()->json(['message' => 'ดึงใบเบิกไม่สำเร็จ'], 500);
        }
    }

    public function closeJob(Request $request, string $rfCode)
    {
        $authUser = $request->attributes->get('authUser');
        $techId = (int) ($authUser['us_id'] ?? 0);

        $techImageAfterPath = $request->input('tech_image_after') ?? $request->input('rf_tech_image_after');

        $files = $this->fileUpload->filesFromRequest($request, 'tech_image_after');
        if (! empty($files)) {
            $validator = Validator::make(['files' => $files], [
                'files' => 'array|max:10',
                'files.*' => $this->fileUpload->imageOnlyValidationRule(),
            ]);
            if ($validator->fails()) {
                return response()->json(['message' => 'รองรับเฉพาะไฟล์รูปภาพเท่านั้น'], 400);
            }
            $stored = $this->fileUpload->store($files, 'RF_AFTER');
            $techImageAfterPath = json_encode(array_column($stored, 'path'));
        }

        $targetStatus = $request->input('status') ?: 'done';

        try {
            $this->techService->closeJob(
                $techId,
                $rfCode,
                $targetStatus,
                $request->input('tech_summary'),
                $techImageAfterPath,
                $request->input('repair_method'),
                $request->input('repair_method_remark'),
                $request->input('result_status'),
                $request->input('result_remark'),
            );

            $statusMessages = [
                'done' => 'ปิดงานสำเร็จ',
                'outsource' => 'ส่ง Outsource สำเร็จ',
                'other' => 'บันทึกข้อมูลสำเร็จ',
            ];

            return response()->json(['message' => $statusMessages[$targetStatus] ?? 'บันทึกข้อมูลสำเร็จ']);
        } catch (\RuntimeException $e) {
            return match ($e->getMessage()) {
                'PENDING_STOCK_APPROVAL' => response()->json(['message' => 'ไม่สามารถปิดงานได้ มีใบเบิกที่รออนุมัติอยู่'], 400),
                'JOB_NOT_FOUND_OR_INVALID_STATUS' => response()->json(['message' => 'ไม่พบงานซ่อม หรือสถานะไม่ถูกต้อง'], 400),
                default => response()->json(['message' => 'ดำเนินการไม่สำเร็จ', 'error' => $e->getMessage()], 500),
            };
        }
    }

    public function withdrawStock(Request $request)
    {
        $items = $request->input('items');
        if (! is_array($items) || empty($items)) {
            return response()->json(['message' => 'ไม่พบรายการวัสดุ/อุปกรณ์'], 400);
        }

        $authUser = $request->attributes->get('authUser');
        $techId = (int) ($authUser['us_id'] ?? 0);

        try {
            $result = $this->techService->withdrawStock($techId, $request->input('repair_code'), $items);

            return response()->json(['message' => 'ส่งแบบฟอร์มขอเบิกเรียบร้อย', 'sf_code' => $result['sfCode']]);
        } catch (\RuntimeException $e) {
            $message = $e->getMessage();
            if (str_starts_with($message, 'INSUFFICIENT_STOCK')) {
                return response()->json(['message' => 'จำนวนวัสดุ/อุปกรณ์ไม่เพียงพอ : '.explode(':', $message)[1]], 400);
            }
            if (str_starts_with($message, 'PRODUCT_NOT_FOUND')) {
                return response()->json(['message' => 'ไม่พบรายการวัสดุ/อุปกรณ์ที่ต้องการ : '.explode(':', $message)[1]], 404);
            }

            return response()->json(['message' => 'ส่งแบบฟอร์มขอเบิกไม่สำเร็จ', 'error' => $message], 500);
        }
    }
}
