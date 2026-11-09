<?php

namespace App\Http\Controllers;

use App\Services\PublicService;
use Illuminate\Http\Request;

class PublicController extends Controller
{
    public function __construct(private PublicService $publicService) {}

    public function search(Request $request)
    {
        $keyword = (string) $request->query('keyword', '');
        $page = (int) $request->query('page', 1);
        $limit = (int) $request->query('limit', 10);
        $offset = ($page - 1) * $limit;

        if (trim($keyword) === '') {
            return response()->json(['data' => [], 'total' => 0]);
        }

        $result = $this->publicService->searchRepairForms($keyword, $limit, $offset);

        return response()->json(['data' => $result['data'], 'total' => $result['total']]);
    }

    public function uploadedFile(string $path)
    {
        $root = realpath(public_path('uploads'));
        $file = $root ? realpath($root.DIRECTORY_SEPARATOR.$path) : false;

        // กัน path traversal (../) และไม่ให้อ่านไฟล์นอกโฟลเดอร์ uploads
        if (! $file || ! str_starts_with($file, $root.DIRECTORY_SEPARATOR) || ! is_file($file)) {
            abort(404);
        }

        return response()->file($file);
    }
}
