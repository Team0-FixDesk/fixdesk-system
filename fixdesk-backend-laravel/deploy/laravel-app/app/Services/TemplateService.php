<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\RichText\RichText;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

/**
 * พอร์ตจาก fixdesk-backend/src/services/template-service.js (ExcelJS -> PhpSpreadsheet)
 */
class TemplateService
{
    private const BLUE = 'FF0048EF';

    private const GRAY_LIGHT = 'FFF9F9F9';

    private const GRAY_TEXT = 'FF888888';

    private const RED = 'FFFF0000';

    public function generateUserTemplate(): Spreadsheet
    {
        $roles = DB::table('role')->where('role_name', '<>', 'Superadmin')->pluck('role_name')->all();
        if (empty($roles)) {
            $roles = ['Admin', 'Technician', 'User', 'Stock', 'Manager'];
        }

        $titles = DB::table('title_name')->pluck('ttn_title_th')->all();
        if (empty($titles)) {
            $titles = ['นาย', 'นาง', 'นางสาว'];
        }

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Users');

        $headers = [
            'A' => ['ชื่อผู้ใช้ *', 18], 'B' => ['คำนำหน้าชื่อ *', 15], 'C' => ['ตำแหน่งบุคลากร *', 22],
            'D' => ['ชื่อ (ภาษาไทย) *', 22], 'E' => ['นามสกุล (ภาษาไทย) *', 22], 'F' => ['ชื่อ (English) *', 22],
            'G' => ['นามสกุล (English) *', 22], 'H' => ['เบอร์โทรศัพท์ *', 18], 'I' => ['ชื่อหน่วยงาน *', 25],
            'J' => ['บทบาท *', 18], 'K' => ['ตำแหน่งช่าง', 22],
        ];
        $this->writeHeaderRow($sheet, $headers, plainText: true);

        $example = ['user01' => 'somchai.j', $titles[0] ?? 'นาย', 'เจ้าหน้าที่ปฏิบัติการ', 'สมชาย', 'ใจดี', 'Somchai', 'Jaidee', '0812345678', 'แผนกไอที', in_array('User', $roles, true) ? 'User' : ($roles[0] ?? 'User'), '-'];
        $this->writeExampleRow($sheet, array_values($example));

        // ช่องเบอร์โทรเป็นข้อความ (@) กัน Excel แปลงเป็นตัวเลขแล้วตัดเลข 0 นำหน้าทิ้ง
        $sheet->getStyle('H2:H1000')->getNumberFormat()->setFormatCode(NumberFormat::FORMAT_TEXT);

        $sheet->setCellValue('M1', 'หมายเหตุ: ช่องที่มีเครื่องหมาย * เป็นข้อมูลบังคับที่จำเป็นต้องระบุ');
        $sheet->getStyle('M1')->getFont()->setBold(true)->getColor()->setARGB(self::RED);
        $sheet->setCellValue('M2', '(แถวนี้คือข้อมูลตัวอย่าง สามารถลบทิ้งหรือพิมพ์ทับได้เลย)');
        $sheet->getStyle('M2')->getFont()->setItalic(true)->getColor()->setARGB(self::GRAY_TEXT);

        $this->addDropdown($sheet, 'B', $titles);
        $this->addDropdown($sheet, 'J', $roles);

        return $spreadsheet;
    }

    public function generateLocationTemplate(): Spreadsheet
    {
        $buildings = DB::table('building')->orderBy('bd_id')->pluck('bd_name')->all();
        if (empty($buildings)) {
            $buildings = ['ตึกคอมพิวเตอร์', 'อาคารอำนวยการ'];
        }

        $floors = DB::table('floor')->distinct()->orderBy('fl_name')->pluck('fl_name')->all();
        if (empty($floors)) {
            $floors = ['1', '2', '3', '4', '5'];
        }

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Locations');

        $headers = [
            'A' => ['ชื่อสถานที่/ห้อง *', 35], 'B' => ['ชื่อตึก *', 30], 'C' => ['ชั้น *', 20],
        ];
        $this->writeHeaderRow($sheet, $headers);

        $this->writeExampleRow($sheet, ['ห้อง LAB 101', $buildings[0] ?? 'ตึกคอมพิวเตอร์', $floors[0] ?? '1']);

        $sheet->setCellValue('E1', 'หมายเหตุ: ช่องที่มีเครื่องหมาย * เป็นข้อมูลบังคับที่จำเป็นต้องระบุ');
        $sheet->getStyle('E1')->getFont()->setBold(true)->getColor()->setARGB(self::RED);
        $sheet->setCellValue('E2', '(แถวนี้คือข้อมูลตัวอย่าง สามารถลบทิ้งหรือพิมพ์ทับได้เลย)');
        $sheet->getStyle('E2')->getFont()->setItalic(true)->getColor()->setARGB(self::GRAY_TEXT);

        $this->addDropdown($sheet, 'B', $buildings);
        $this->addDropdown($sheet, 'C', $floors);

        return $spreadsheet;
    }

    public function generateStockTemplate(): Spreadsheet
    {
        $categories = DB::table('categories')->orderBy('ct_name')->pluck('ct_name')->all();
        if (empty($categories)) {
            $categories = ['วัสดุไฟฟ้า', 'อุปกรณ์คอมพิวเตอร์', 'เครื่องใช้สำนักงาน'];
        }

        $units = DB::table('units')->orderBy('units_name')->pluck('units_name')->all();
        if (empty($units)) {
            $units = ['ชิ้น', 'อัน', 'ชุด', 'ตัว', 'กล่อง'];
        }

        $statuses = ['พร้อมใช้งาน', 'รอเติมสต็อก', 'ระงับการใช้งาน'];

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Stocks');

        $headers = [
            'A' => ['ชื่อรายการ *', 30], 'B' => ['หมายเลขครุภัณฑ์', 20], 'C' => ['หมวดหมู่ *', 20],
            'D' => ['จำนวน *', 15], 'E' => ['หน่วยนับ *', 15], 'F' => ['สถานะ *', 20],
        ];
        $this->writeHeaderRow($sheet, $headers);

        $this->writeExampleRow($sheet, ['เมาส์ไร้สาย Logitech', 'IT-67-001', $categories[0], 10, $units[0], $statuses[0]]);

        $sheet->setCellValue('H1', 'หมายเหตุ: ช่องที่มีเครื่องหมาย * เป็นข้อมูลบังคับที่จำเป็นต้องระบุ');
        $sheet->getStyle('H1')->getFont()->setBold(true)->getColor()->setARGB(self::RED);
        $sheet->setCellValue('H2', '👈 (สามารถลบแถวตัวอย่างนี้ทิ้งได้เลย)');
        $sheet->getStyle('H2')->getFont()->setItalic(true)->getColor()->setARGB(self::GRAY_TEXT);

        $this->addDropdown($sheet, 'C', $categories);
        $this->addDropdown($sheet, 'E', $units);
        $this->addDropdown($sheet, 'F', $statuses);

        return $spreadsheet;
    }

    /**
     * @param  array<string, array{0: string, 1: int}>  $headers  column letter => [header text, width]
     */
    private function writeHeaderRow(Spreadsheet|\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet, array $headers, bool $plainText = false): void
    {
        $sheet->getRowDimension(1)->setRowHeight(25);

        foreach ($headers as $col => [$text, $width]) {
            $sheet->getColumnDimension($col)->setWidth($width);
            $cell = $sheet->getCell("{$col}1");

            $hasAsterisk = str_contains($text, '*');
            $plainHeaderText = trim(str_replace('*', '', $text));

            if ($plainText || ! $hasAsterisk) {
                $cell->setValue($text);
                $cell->getStyle()->getFont()->setBold(true)->setSize(12)->getColor()->setARGB('FFFFFFFF');
            } else {
                $richText = new RichText;
                $run1 = $richText->createTextRun($plainHeaderText);
                $run1->getFont()->setBold(true)->setSize(12)->getColor()->setARGB('FFFFFFFF');
                $run2 = $richText->createTextRun(' *');
                $run2->getFont()->setBold(true)->setSize(12)->getColor()->setARGB(self::RED);
                $cell->setValue($richText);
            }

            $cell->getStyle()->getAlignment()->setVertical(\PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER);
            $cell->getStyle()->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
            $cell->getStyle()->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB(self::BLUE);
            $cell->getStyle()->getBorders()->getAllBorders()->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN);
        }
    }

    private function writeExampleRow(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet, array $values): void
    {
        $col = 'A';
        foreach ($values as $value) {
            $cell = $sheet->getCell("{$col}2");
            $cell->setValue($value);
            $cell->getStyle()->getFont()->setItalic(true)->getColor()->setARGB(self::GRAY_TEXT);
            $cell->getStyle()->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB(self::GRAY_LIGHT);
            $cell->getStyle()->getAlignment()->setVertical(\PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER);
            $col++;
        }
    }

    /**
     * @param  string[]  $options
     */
    private function addDropdown(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet, string $column, array $options): void
    {
        $formula = '"'.implode(',', $options).'"';

        for ($i = 2; $i <= 1000; $i++) {
            $validation = $sheet->getCell("{$column}{$i}")->getDataValidation();
            $validation->setType(DataValidation::TYPE_LIST);
            $validation->setErrorStyle(DataValidation::STYLE_STOP);
            $validation->setAllowBlank(true);
            $validation->setShowInputMessage(false);
            $validation->setShowErrorMessage(true);
            $validation->setShowDropDown(true);
            $validation->setErrorTitle('ข้อมูลไม่ถูกต้อง');
            $validation->setError('กรุณาเลือกจาก Dropdown ที่มีให้เท่านั้น');
            $validation->setFormula1($formula);
        }
    }
}
