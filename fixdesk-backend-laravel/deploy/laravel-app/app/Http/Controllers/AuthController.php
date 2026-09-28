<?php

namespace App\Http\Controllers;

use App\Services\AuthService;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private AuthService $authService) {}

    public function login(Request $request)
    {
        $userName = $request->input('userName');
        $password = $request->input('password');

        if (! $userName || ! $password) {
            return response()->json(['message' => 'ข้อมูลที่ส่งมาไม่ถูกต้อง'], 400);
        }

        try {
            $token = $this->authService->authenticateUser($userName, $password);

            return response()->json(['token' => $token]);
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'USER_NOT_FOUND') {
                return response()->json(['message' => 'ชื่อผู้ใช้ไม่ถูกต้อง'], 401);
            }
            if ($e->getMessage() === 'INVALID_PASSWORD') {
                return response()->json(['message' => 'รหัสผ่านไม่ถูกต้อง'], 401);
            }

            report($e);

            return response()->json(['message' => 'Internal Server Error'], 500);
        }
    }
}
