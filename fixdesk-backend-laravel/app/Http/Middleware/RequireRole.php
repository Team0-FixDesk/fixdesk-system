<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * จำกัดสิทธิ์ตามบทบาท (role_name ใน JWT) ใช้ต่อจาก auth.jwt เสมอ เช่น ->middleware(['auth.jwt', 'role:Admin,Stock'])
 * Superadmin ถูกแปลงเป็น Admin ตั้งแต่ตอนล็อกอินแล้ว (AuthService)
 */
class RequireRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $authUser = $request->attributes->get('authUser');
        $role = is_array($authUser) ? ($authUser['role_name'] ?? null) : null;

        if (! $role || ! in_array($role, $roles, true)) {
            return response()->json(['message' => 'คุณไม่มีสิทธิ์ใช้งานส่วนนี้'], 403);
        }

        return $next($request);
    }
}
