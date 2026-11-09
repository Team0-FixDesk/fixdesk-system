<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * ให้ดู/แก้ข้อมูลของ {id} ได้เฉพาะเจ้าของบัญชีเองหรือ Admin ใช้ต่อจาก auth.jwt
 */
class EnsureSelfOrAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $authUser = $request->attributes->get('authUser');
        $authId = is_array($authUser) ? (int) ($authUser['us_id'] ?? 0) : 0;
        $role = is_array($authUser) ? ($authUser['role_name'] ?? null) : null;

        if ($role !== 'Admin' && (! $authId || $authId !== (int) $request->route('id'))) {
            return response()->json(['message' => 'คุณไม่มีสิทธิ์ใช้งานส่วนนี้'], 403);
        }

        return $next($request);
    }
}
