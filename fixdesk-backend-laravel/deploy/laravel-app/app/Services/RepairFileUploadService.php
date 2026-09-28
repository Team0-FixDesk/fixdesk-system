<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

/**
 * พอร์ต logic การอัปโหลดไฟล์แนบใบแจ้งซ่อมจาก multer config ใน repair-routes.js
 * เก็บไฟล์ไว้ที่ public/uploads/repair ตรงๆ (ไม่ใช้ storage/ + symlink)
 * เพื่อให้ serve ผ่าน web root ได้เลยแบบเดียวกับที่ Node ทำ (express.static)
 */
class RepairFileUploadService
{
    private const ALLOWED_EXTENSIONS = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'mp4', 'avi', 'mov', 'wmv'];

    private const IMAGE_ONLY_EXTENSIONS = ['jpeg', 'jpg', 'png', 'gif', 'webp'];

    public function uploadDir(): string
    {
        $dir = public_path('uploads/repair');
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        return $dir;
    }

    public function validationRule(): string
    {
        return 'file|mimes:'.implode(',', self::ALLOWED_EXTENSIONS).'|max:51200'; // 50MB
    }

    /**
     * ใช้กับ technician/close-job (tech_image_after) — รับเฉพาะรูปภาพ ไม่รับวิดีโอ (ตรงกับ closeJobFileFilter เดิม)
     */
    public function imageOnlyValidationRule(): string
    {
        return 'file|mimes:'.implode(',', self::IMAGE_ONLY_EXTENSIONS).'|max:51200'; // 50MB
    }

    /**
     * $request->file('files') ให้ UploadedFile เดี่ยวๆ (ไม่ใช่ array) เมื่ออัปโหลดไฟล์เดียว
     * ต่างจาก multer .array() ของเดิมที่ห่อเป็น array เสมอ ฟังก์ชันนี้ normalize ให้เหมือนกัน
     *
     * @return UploadedFile[]
     */
    public function filesFromRequest(Request $request, string $key = 'files'): array
    {
        $files = $request->file($key, []);
        if ($files instanceof UploadedFile) {
            return [$files];
        }

        return array_values(array_filter($files ?? []));
    }

    /**
     * @param  UploadedFile[]  $files
     * @return array<int, array{filename: string, originalname: string, path: string, size: int, mimetype: string}>
     */
    public function store(array $files, string $prefix = 'RF'): array
    {
        $dir = $this->uploadDir();
        $stored = [];

        foreach ($files as $file) {
            $filename = $this->generateFilename($file->getClientOriginalExtension(), $prefix);
            // เก็บ metadata ก่อน move() เพราะหลัง move() ไฟล์ temp เดิมจะถูกย้ายไปแล้ว
            // เรียก getSize()/getClientMimeType() ทีหลังจะ stat ไฟล์เดิมไม่เจอ
            $size = $file->getSize();
            $mimetype = $file->getClientMimeType();
            $originalName = $file->getClientOriginalName();

            $file->move($dir, $filename);

            $stored[] = [
                'filename' => $filename,
                'originalname' => $originalName,
                'path' => "/uploads/repair/{$filename}",
                'size' => $size,
                'mimetype' => $mimetype,
            ];
        }

        return $stored;
    }

    public function delete(string $filename): bool
    {
        $path = $this->uploadDir().DIRECTORY_SEPARATOR.$filename;
        if (! is_file($path)) {
            return false;
        }

        return unlink($path);
    }

    private function generateFilename(string $ext, string $prefix = 'RF'): string
    {
        $dateTimeStamp = substr(preg_replace('/[:.\-]/', '', now()->toIso8601String()), 0, 15);
        $random = str_pad((string) random_int(0, 999), 3, '0', STR_PAD_LEFT);

        return "{$prefix}_{$dateTimeStamp}_{$random}.{$ext}";
    }
}
