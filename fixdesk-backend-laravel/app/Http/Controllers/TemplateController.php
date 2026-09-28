<?php

namespace App\Http\Controllers;

use App\Services\TemplateService;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class TemplateController extends Controller
{
    public function __construct(private TemplateService $templateService) {}

    public function downloadTemplate(string $type)
    {
        $filename = match ($type) {
            'users' => 'TemplateExcelUsers.xlsx',
            'locations' => 'TemplateExcelLocation.xlsx',
            'stocks' => 'TemplateExcelStock.xlsx',
            default => null,
        };

        if (! $filename) {
            return response()->json(['message' => 'ไม่พบ Template ที่ต้องการ'], 404);
        }

        try {
            $spreadsheet = match ($type) {
                'users' => $this->templateService->generateUserTemplate(),
                'locations' => $this->templateService->generateLocationTemplate(),
                'stocks' => $this->templateService->generateStockTemplate(),
            };

            $writer = new Xlsx($spreadsheet);

            return response()->streamDownload(function () use ($writer) {
                $writer->save('php://output');
            }, $filename, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'เกิดข้อผิดพลาดในการสร้างไฟล์ Template'], 500);
        }
    }
}
