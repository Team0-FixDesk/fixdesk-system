<?php

namespace App\Http\Middleware;

use App\Services\JwtService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyJwtToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $authHeader = $request->header('Authorization');

        if (! $authHeader || ! str_starts_with($authHeader, 'Bearer ')) {
            return response()->json([
                'message' => 'เกิดข้อผิดพลาด ข้อมูลยืนยันตัวตนไม่ถูกต้อง กรุณาลงชื่อเข้าสู่ระบบใหม่อีกครั้ง',
            ], 401);
        }

        $token = substr($authHeader, 7);

        try {
            $decoded = JwtService::decode($token);
            $request->attributes->set('authUser', $decoded);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'คุณไม่ได้ใช้งานเป็นระยะเวลาหนึ่ง กรุณาลงชื่อเข้าสู่ระบบใหม่',
            ], 401);
        }

        return $next($request);
    }
}
