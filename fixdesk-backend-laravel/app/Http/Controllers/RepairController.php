<?php

namespace App\Http\Controllers;

use App\Services\RepairFileUploadService;
use App\Services\RepairService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class RepairController extends Controller
{
    public function __construct(
        private RepairService $repairService,
        private RepairFileUploadService $fileUpload,
    ) {}

    public function uploadFiles(Request $request)
    {
        $files = $this->fileUpload->filesFromRequest($request);
        if (empty($files)) {
            return response()->json(['message' => 'กรุณาเลือกไฟล์'], 400);
        }

        $validator = Validator::make(['files' => $files], [
            'files' => 'array|max:5',
            'files.*' => $this->fileUpload->validationRule(),
        ]);
        if ($validator->fails()) {
            return response()->json(['message' => 'รองรับเฉพาะไฟล์รูปภาพและวิดีโอเท่านั้น'], 400);
        }

        try {
            $stored = $this->fileUpload->store($files);

            return response()->json([
                'message' => 'อัพโหลดไฟล์สำเร็จ',
                'files' => $stored,
                'filePaths' => array_column($stored, 'path'),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'อัพโหลดล้มเหลว', 'error' => $e->getMessage()], 500);
        }
    }

    public function deleteFile(Request $request, string $filename)
    {
        if (! $this->fileUpload->delete($filename)) {
            return response()->json(['message' => 'ลบไฟล์ไม่สำเร็จ'], 500);
        }

        return response()->json(['message' => 'ลบไฟล์สำเร็จ']);
    }

    public function createRepair(Request $request)
    {
        $usId = $request->input('us_id');
        $repairTypeId = $request->input('repair_type_id');
        $roomId = $request->input('room_id');
        $problemDetail = $request->input('problem_detail');

        if (! $usId || ! $repairTypeId || ! $roomId || ! $problemDetail) {
            return response()->json(['message' => 'ข้อมูลไม่ครบ'], 400);
        }

        $files = $this->fileUpload->filesFromRequest($request);
        $filePaths = [];
        $uploadedFiles = [];
        if (! empty($files)) {
            $validator = Validator::make(['files' => $files], [
                'files' => 'array|max:5',
                'files.*' => $this->fileUpload->validationRule(),
            ]);
            if ($validator->fails()) {
                return response()->json(['message' => 'รองรับเฉพาะไฟล์รูปภาพและวิดีโอเท่านั้น'], 400);
            }
            $uploadedFiles = $this->fileUpload->store($files);
            $filePaths = array_column($uploadedFiles, 'path');
        } elseif ($request->has('file_paths')) {
            $filePaths = $request->input('file_paths');
        }

        try {
            $result = $this->repairService->createRepair([
                'usId' => $usId,
                'repairTypeId' => $repairTypeId,
                'roomId' => $roomId,
                'assetCode' => $request->input('asset_code'),
                'problemDetail' => $problemDetail,
                'issueDescription' => $request->input('issue_description'),
                'phoneNumber' => $request->input('phone_number'),
                'urgency' => $request->input('urgency'),
                'filePaths' => $filePaths,
                'skip_line_notification' => $request->input('skip_line_notification'),
            ]);

            $response = [
                'message' => 'บันทึกฟอร์มแจ้งซ่อมสำเร็จ',
                'id' => $result['insertId'],
                'rf_code' => $result['rfCode'],
                'uploaded_files' => array_map(fn ($f) => ['filename' => $f['filename']], $uploadedFiles),
            ];
            if (isset($result['lineNotificationError'])) {
                $response['lineNotificationError'] = $result['lineNotificationError'];
            }

            return response()->json($response);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'บันทึกข้อมูลไม่สำเร็จ', 'error' => $e->getMessage()], 500);
        }
    }

    public function updateRepair(Request $request, string $code)
    {
        $repairTypeId = $request->input('repair_type_id');
        $roomId = $request->input('room_id');
        $problemDetail = $request->input('problem_detail');
        $existingFiles = $request->input('existing_files');

        if (! $repairTypeId || ! $roomId || ! $problemDetail) {
            return response()->json(['message' => 'ข้อมูลไม่ครบ'], 400);
        }

        $existingPaths = $existingFiles ? json_decode($existingFiles, true) : [];
        $files = $this->fileUpload->filesFromRequest($request);
        $newPaths = [];
        if (! empty($files)) {
            $validator = Validator::make(['files' => $files], [
                'files' => 'array|max:5',
                'files.*' => $this->fileUpload->validationRule(),
            ]);
            if ($validator->fails()) {
                return response()->json(['message' => 'รองรับเฉพาะไฟล์รูปภาพและวิดีโอเท่านั้น'], 400);
            }
            $newPaths = array_column($this->fileUpload->store($files), 'path');
        }

        $finalPaths = $request->input('file_paths') ?? array_merge($existingPaths, $newPaths);

        try {
            $affected = $this->repairService->updateRepair($code, [
                'usId' => $request->input('us_id'),
                'repairTypeId' => $repairTypeId,
                'roomId' => $roomId,
                'assetCode' => $request->input('asset_code'),
                'problemDetail' => $problemDetail,
                'issueDescription' => $request->input('issue_description'),
                'phoneNumber' => $request->input('phone_number'),
                'urgency' => $request->input('urgency'),
                'filePaths' => $finalPaths,
            ]);

            if ($affected === 0) {
                return response()->json(['message' => 'ไม่พบรายการแจ้งซ่อมที่ต้องการแก้ไข กรุณาโหลดหน้าใหม่ และลองอีกครั้ง'], 404);
            }

            return response()->json(['message' => 'แก้ไขข้อมูลเรียบร้อยแล้ว', 'updated' => $affected]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'แก้ไขข้อมูลไม่สำเร็จ', 'error' => $e->getMessage()], 500);
        }
    }

    public function deleteRepair(Request $request, string $code)
    {
        try {
            $affected = $this->repairService->deleteRepair($code);
            if ($affected === 0) {
                return response()->json(['message' => 'ไม่พบรายการแจ้งซ่อมที่ต้องการลบ กรุณาโหลดหน้าใหม่ และลองอีกครั้ง'], 400);
            }

            return response()->json(['message' => 'ลบข้อมูลเรียบร้อยแล้ว']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'ลบข้อมูลไม่สำเร็จ', 'error' => $e->getMessage()], 500);
        }
    }

    public function getAdminRepairs()
    {
        try {
            return response()->json($this->repairService->getAdminRepairs());
        } catch (\Throwable $e) {
            return response()->json(['message' => 'ดึงข้อมูลไม่สำเร็จ'], 500);
        }
    }

    public function getUserRepairs(int $userId)
    {
        try {
            return response()->json($this->repairService->getUserRepairs($userId));
        } catch (\Throwable $e) {
            return response()->json(['message' => 'ดึงข้อมูลไม่สำเร็จ'], 500);
        }
    }

    public function getRepairDetail(string $code)
    {
        try {
            $result = $this->repairService->getRepairDetail($code);
            if (! $result) {
                return response()->json(['message' => 'ไม่พบใบแจ้งซ่อม'], 404);
            }

            return response()->json($result);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'เกิดข้อผิดพลาด', 'error' => $e->getMessage()], 500);
        }
    }

    public function assignIndividual(Request $request)
    {
        $rfCode = $request->input('rf_code');
        $technicianId = $request->input('technician_id');
        if (! $rfCode || ! $technicianId) {
            return response()->json(['message' => 'ข้อมูลไม่ครบ'], 400);
        }

        $isLead = in_array($request->input('is_lead'), [true, '1', 1], true);
        $authUser = $request->attributes->get('authUser');
        $assigner = $request->input('ra_assigned_by')
            ?? $request->input('assigned_by')
            ?? ($authUser['us_id'] ?? null);

        try {
            $result = $this->repairService->assignIndividual($rfCode, (int) $technicianId, $isLead, $assigner ? (int) $assigner : null);

            if ($result['status'] === 'ALREADY_ASSIGNED') {
                return response()->json(['message' => 'ช่างนี้มอบหมายแล้วอยู่ในทีม']);
            }

            return response()->json(['message' => 'มอบหมายช่างสำเร็จ', 'assigned_to' => $technicianId]);
        } catch (\RuntimeException $e) {
            return match ($e->getMessage()) {
                'LINE_RATE_LIMIT' => response()->json(['errorType' => 'RATE_LIMIT_EXCEEDED', 'message' => 'ถึงขีดจำกัดการแจ้งเตือน LINE กรุณาลองใหม่ในอีกสักครู่'], 429),
                'TECH_NOT_FOUND', 'NOT_A_TECHNICIAN' => response()->json(['message' => 'ผู้ใช้ไม่ใช่ช่าง'], 400),
                'REPAIR_NOT_FOUND' => response()->json(['message' => 'ไม่พบใบแจ้งซ่อม'], 404),
                default => response()->json(['message' => 'มอบหมายงานไม่สำเร็จ', 'error' => $e->getMessage()], 500),
            };
        }
    }

    public function assignTeam(Request $request)
    {
        $rfCode = $request->input('rf_code');
        $technicianIds = $request->input('technician_ids');
        if (! $rfCode || ! is_array($technicianIds)) {
            return response()->json(['message' => 'ข้อมูลไม่ครบ'], 400);
        }

        $techIds = array_values(array_filter(array_map('intval', $technicianIds)));
        $leadId = $request->input('lead_id') ? (int) $request->input('lead_id') : ($techIds[0] ?? null);

        if (empty($techIds)) {
            return response()->json(['message' => 'ต้องระบุช่างอย่างน้อย 1 คน'], 400);
        }

        try {
            $result = $this->repairService->assignTeam($rfCode, $techIds, $leadId);

            return response()->json([
                'message' => 'มอบหมายเป็นทีมสำเร็จ',
                'assigned_count' => $result['assignedCount'],
                'lead_id' => $leadId,
            ]);
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'LINE_RATE_LIMIT') {
                return response()->json(['errorType' => 'RATE_LIMIT_EXCEEDED', 'message' => 'ถึงขีดจำกัดการแจ้งเตือน LINE กรุณาลองใหม่ในอีกสักครู่'], 429);
            }

            return response()->json(['message' => 'มอบหมายทีมไม่สำเร็จ', 'error' => $e->getMessage()], 500);
        }
    }

    public function acceptJob(Request $request, string $code)
    {
        $authUser = $request->attributes->get('authUser');
        $techId = (int) ($authUser['us_id'] ?? 0);

        try {
            $affected = $this->repairService->acceptJob($code, $techId);
            if ($affected === 0) {
                return response()->json(['message' => 'รับงานไม่ได้ (สถานะอาจเปลี่ยนไปแล้ว)'], 400);
            }

            return response()->json(['message' => 'รับงานเรียบร้อยแล้ว', 'rf_code' => $code]);
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'LINE_RATE_LIMIT') {
                return response()->json(['errorType' => 'RATE_LIMIT_EXCEEDED', 'message' => 'ถึงขีดจำกัดการแจ้งเตือน LINE กรุณาลองใหม่ในอีกสักครู่'], 429);
            }

            return response()->json(['message' => 'เกิดข้อผิดพลาด', 'error' => $e->getMessage()], 500);
        }
    }

    public function getStats(int $userId)
    {
        try {
            return response()->json($this->repairService->getStats($userId));
        } catch (\Throwable $e) {
            return response()->json(['message' => 'ดึงสถิติไม่สำเร็จ'], 500);
        }
    }
}
