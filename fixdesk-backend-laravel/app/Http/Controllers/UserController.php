<?php

namespace App\Http\Controllers;

use App\Services\UserService;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(private UserService $userService) {}

    public function getUsers()
    {
        try {
            return response()->json($this->userService->getAllUsers());
        } catch (\Throwable $e) {
            return response()->json(['message' => 'ดึงข้อมูลผู้ใช้ไม่สำเร็จ', 'error' => $e->getMessage()], 500);
        }
    }

    public function getUserById(int $id)
    {
        try {
            $user = $this->userService->getUserById($id);
            if (! $user) {
                return response()->json(['message' => 'ไม่พบข้อมูลผู้ใช้'], 404);
            }

            return response()->json($user);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'เกิดข้อผิดพลาด', 'error' => $e->getMessage()], 500);
        }
    }

    public function getTitles()
    {
        try {
            return response()->json($this->userService->getAllTitles());
        } catch (\Throwable $e) {
            return response()->json(['message' => 'ดึงข้อมูลคำนำหน้าไม่สำเร็จ'], 500);
        }
    }

    public function getRoles()
    {
        try {
            return response()->json($this->userService->getAllRoles());
        } catch (\Throwable $e) {
            return response()->json(['message' => 'ดึงข้อมูลบทบาทไม่สำเร็จ'], 500);
        }
    }

    public function createUser(Request $request)
    {
        $usUserName = $request->input('us_user_name');
        $usFirstNameTh = $request->input('us_first_name_th');
        $usLastNameTh = $request->input('us_last_name_th');
        $usRoleId = $request->input('us_role_id');
        $usJobTitle = $request->input('us_job_title');
        $usPhone = $request->input('us_phone');

        if (! $usUserName || ! $usFirstNameTh || ! $usLastNameTh || ! $usRoleId || ! $usJobTitle) {
            return response()->json(['message' => 'กรุณากรอกข้อมูลให้ครบถ้วน'], 400);
        }

        if (! preg_match('/^[\x{0E01}-\x{0E59}\s]+$/u', $usFirstNameTh) || ! preg_match('/^[\x{0E01}-\x{0E59}\s]+$/u', $usLastNameTh)) {
            return response()->json(['message' => 'ชื่อ-นามสกุล (ไทย) ต้องเป็นภาษาไทยเท่านั้น'], 400);
        }

        if ($usPhone && ! preg_match('/^[0-9]{9,10}$/', $usPhone)) {
            return response()->json(['message' => 'เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก'], 400);
        }

        try {
            $newId = $this->userService->createUser([
                'userName' => $usUserName,
                'titleId' => $request->input('us_ttn_id'),
                'firstNameTh' => $usFirstNameTh,
                'lastNameTh' => $usLastNameTh,
                'firstNameEn' => $request->input('us_first_name_en'),
                'lastNameEn' => $request->input('us_last_name_en'),
                'phone' => $usPhone,
                'department' => $request->input('us_department'),
                'roleId' => $usRoleId,
                'technicianTypeId' => $request->input('us_tt_id'),
                'jobTitle' => $usJobTitle,
            ]);

            return response()->json(['created' => 1, 'us_id' => $newId], 201);
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'DUPLICATE_USERNAME') {
                return response()->json(['message' => "พบชื่อผู้ใช้ซ้ำ กรุณากรอกข้อมูล\nผู้ใช้งานใหม่อีกครั้ง"], 409);
            }

            return response()->json(['message' => 'เพิ่มผู้ใช้ไม่สำเร็จ', 'error' => $e->getMessage()], 500);
        }
    }

    public function resetPassword(int $id)
    {
        try {
            $this->userService->resetPassword($id);

            return response()->json(['message' => 'รีเซ็ตรหัสผ่านสำเร็จ']);
        } catch (\RuntimeException $e) {
            return match ($e->getMessage()) {
                'USER_NOT_FOUND' => response()->json(['message' => 'ไม่พบผู้ใช้งาน'], 404),
                'INVALID_DATA_FOR_PASSWORD_GENERATION' => response()->json(['message' => 'ข้อมูลผู้ใช้ไม่เพียงพอสำหรับสร้างรหัสผ่าน'], 400),
                default => response()->json(['message' => 'รีเซ็ตรหัสผ่านไม่สำเร็จ', 'error' => $e->getMessage()], 500),
            };
        }
    }

    public function updateUser(Request $request, int $id)
    {
        try {
            $this->userService->updateUser($id, [
                'titleId' => $request->input('us_ttn_id'),
                'firstNameTh' => $request->input('us_first_name_th'),
                'lastNameTh' => $request->input('us_last_name_th'),
                'firstNameEn' => $request->input('us_first_name_en'),
                'lastNameEn' => $request->input('us_last_name_en'),
                'phone' => $request->input('us_phone'),
                'department' => $request->input('us_department'),
                'roleId' => $request->input('us_role_id'),
                'technicianTypeId' => $request->input('us_tt_id'),
                'jobTitle' => $request->input('us_job_title'),
                'userName' => $request->input('us_user_name'),
                'password' => $request->input('us_user_pass'),
            ]);

            return response()->json(['message' => 'อัปเดตข้อมูลสำเร็จ']);
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'DUPLICATE_USERNAME') {
                return response()->json(['message' => "พบชื่อผู้ใช้ซ้ำ กรุณากรอกข้อมูล\nผู้ใช้งานใหม่อีกครั้ง"], 409);
            }

            return response()->json(['message' => 'อัปเดตไม่สำเร็จ', 'error' => $e->getMessage()], 500);
        }
    }

    public function deleteUser(int $id)
    {
        try {
            $this->userService->deleteUser($id);

            return response()->json(['message' => 'ลบผู้ใช้สำเร็จ']);
        } catch (\RuntimeException $e) {
            return match ($e->getMessage()) {
                'DEPENDENCY_EXISTS' => response()->json(['message' => 'ไม่สามารถลบได้ เนื่องจากมีใบแจ้งซ่อมหรือการมอบหมายงานค้างอยู่'], 400),
                'USER_NOT_FOUND' => response()->json(['message' => 'ไม่พบผู้ใช้'], 404),
                default => response()->json(['message' => 'ลบไม่สำเร็จ', 'error' => $e->getMessage()], 500),
            };
        }
    }

    public function updatePersonalProfile(Request $request, int $id)
    {
        $oldPassword = $request->input('oldPassword');
        $password = $request->input('password');
        $usActive = $request->input('usActive');
        $isFirstLogin = $request->boolean('isFirstLogin');

        if (! $isFirstLogin && ! $oldPassword) {
            return response()->json(['message' => 'กรุณากรอกรหัสผ่านเดิม'], 400);
        }

        if (! $isFirstLogin && ! $password) {
            if ($request->has('us_phone') && $request->input('us_phone') === '') {
                return response()->json(['message' => 'กรุณากรอกข้อมูลให้ครบ'], 400);
            }
        }

        try {
            $this->userService->updatePersonalProfile(
                $id,
                [
                    'titleId' => $request->input('us_ttn_id'),
                    'department' => $request->input('us_department'),
                    'phone' => $request->input('us_phone'),
                    'firstNameTh' => $request->input('us_first_name_th'),
                    'lastNameTh' => $request->input('us_last_name_th'),
                    'firstNameEn' => $request->input('us_first_name_en'),
                    'lastNameEn' => $request->input('us_last_name_en'),
                    'userName' => $request->input('us_user_name'),
                    'usActive' => $usActive,
                ],
                $oldPassword ?? '',
                $password,
                $isFirstLogin
            );

            return response()->json(['message' => 'อัปเดตข้อมูลส่วนตัวสำเร็จ']);
        } catch (\RuntimeException $e) {
            return match ($e->getMessage()) {
                'USER_NOT_FOUND' => response()->json(['message' => 'ไม่พบผู้ใช้'], 404),
                'INVALID_OLD_PASSWORD' => response()->json(['message' => 'รหัสผ่านเดิมไม่ถูกต้อง'], 400),
                default => response()->json(['message' => 'อัปเดตข้อมูลไม่สำเร็จ', 'error' => $e->getMessage()], 500),
            };
        }
    }

    public function importUsers(Request $request)
    {
        $users = $request->input('users');
        if (! is_array($users) || empty($users)) {
            return response()->json(['message' => 'ไม่พบข้อมูลสำหรับ Import'], 400);
        }

        try {
            return response()->json($this->userService->importUsers($users));
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Import ล้มเหลว', 'error' => $e->getMessage()], 500);
        }
    }
}
