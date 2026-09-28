<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

/**
 * พอร์ตจาก multer config ใน stock-routes.js (อัปโหลดรูปสินค้า)
 * เก็บไฟล์ไว้ที่ public/uploads/ ตรงๆ (คนละโฟลเดอร์กับ public/uploads/repair)
 */
class ProductImageUploadService
{
    public function uploadDir(): string
    {
        $dir = public_path('uploads');
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        return $dir;
    }

    public function fileFromRequest(Request $request, string $key = 'pd_upload_image'): ?UploadedFile
    {
        $file = $request->file($key);

        return $file instanceof UploadedFile ? $file : null;
    }

    public function store(UploadedFile $file): string
    {
        $unique = (int) (microtime(true) * 1000).'-'.random_int(0, 999999999);
        $filename = 'pd_upload_image-'.$unique.'.'.$file->getClientOriginalExtension();

        $file->move($this->uploadDir(), $filename);

        return $filename;
    }
}
