<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * พอร์ตจาก fixdesk-backend/src/services/user-service.js
 */
class UserService
{
    public function generateDefaultPassword(string $firstNameEn, string $lastNameEn, string $phone): string
    {
        $firstNameEn = trim($firstNameEn);
        $lastNameEn = trim($lastNameEn);
        $phone = trim($phone);

        if (! $firstNameEn || ! $lastNameEn || strlen($phone) < 4) {
            throw new \RuntimeException('INVALID_DATA_FOR_PASSWORD_GENERATION');
        }

        $last4Phone = substr($phone, -4);
        $lastInitial = strtoupper($lastNameEn[0]);

        return "{$firstNameEn}@{$last4Phone}{$lastInitial}";
    }

    public function getAllUsers(): array
    {
        return DB::table('user as user')
            ->leftJoin('role as role', 'user.us_role_id', '=', 'role.role_id')
            ->leftJoin('technician_type as tech', 'user.us_tt_id', '=', 'tech.tt_id')
            ->leftJoin('title_name as title', 'user.us_ttn_id', '=', 'title.ttn_id')
            ->where(function ($q) {
                $q->where('role.role_name', '<>', 'Superadmin')->orWhereNull('role.role_name');
            })
            ->orderBy('user.us_id')
            ->selectRaw("user.us_id, user.us_user_name, user.us_ttn_id,
                title.ttn_title_th as title_name,
                user.us_first_name_th, user.us_last_name_th,
                user.us_first_name_en, user.us_last_name_en,
                user.us_phone, user.us_department,
                user.us_role_id, role.role_name,
                user.us_tt_id, user.us_job_title,
                user.us_active,
                tech.tt_name as technician_type,
                CONCAT(title.ttn_title_th, '', user.us_first_name_th, ' ', user.us_last_name_th) as full_name,
                (SELECT COUNT(*) FROM repair_form WHERE rf_us_id = user.us_id) as repair_count,
                (SELECT COUNT(*) FROM repair_assignment WHERE ra_us_id = user.us_id) as assignment_count,
                CASE WHEN
                    (SELECT COUNT(*) FROM repair_form WHERE rf_us_id = user.us_id) +
                    (SELECT COUNT(*) FROM repair_assignment WHERE ra_us_id = user.us_id) > 0
                THEN 1 ELSE 0 END as has_repairs")
            ->get()
            ->all();
    }

    public function getUserById(int $userId): ?object
    {
        return DB::table('user as user')
            ->leftJoin('role as role', 'user.us_role_id', '=', 'role.role_id')
            ->leftJoin('technician_type as tech', 'user.us_tt_id', '=', 'tech.tt_id')
            ->leftJoin('title_name as title', 'user.us_ttn_id', '=', 'title.ttn_id')
            ->where('user.us_id', $userId)
            ->where(function ($q) {
                $q->where('role.role_name', '<>', 'Superadmin')->orWhereNull('role.role_name');
            })
            ->selectRaw("user.us_id, user.us_user_name, user.us_user_pass, user.us_ttn_id,
                user.us_first_name_th, user.us_last_name_th,
                user.us_first_name_en, user.us_last_name_en,
                user.us_phone, user.us_department,
                user.us_role_id, user.us_tt_id, user.us_job_title,
                user.us_active,
                role.role_name, tech.tt_name as technician_type,
                title.ttn_title_th as title_name")
            ->first();
    }

    public function getAllTitles(): array
    {
        return DB::table('title_name')
            ->orderBy('ttn_id')
            ->selectRaw('ttn_id, ttn_title_th as ttn_name_th')
            ->get()
            ->all();
    }

    public function getAllRoles(): array
    {
        return DB::table('role')
            ->where('role_name', '<>', 'Superadmin')
            ->orderBy('role_id')
            ->selectRaw('role_id, role_name, role_name as role_label_th')
            ->get()
            ->all();
    }

    /**
     * @throws \RuntimeException DUPLICATE_USERNAME
     */
    public function createUser(array $userData): int
    {
        $defaultPassword = $this->generateDefaultPassword(
            $userData['firstNameEn'] ?? '',
            $userData['lastNameEn'] ?? '',
            $userData['phone'] ?? ''
        );
        $hashedPassword = password_hash($defaultPassword, PASSWORD_BCRYPT);

        if (DB::table('user')->where('us_user_name', $userData['userName'])->exists()) {
            throw new \RuntimeException('DUPLICATE_USERNAME');
        }

        return DB::table('user')->insertGetId([
            'us_user_name' => $userData['userName'],
            'us_user_pass' => $hashedPassword,
            'us_ttn_id' => $userData['titleId'] ?? null,
            'us_first_name_th' => $userData['firstNameTh'],
            'us_last_name_th' => $userData['lastNameTh'],
            'us_first_name_en' => $userData['firstNameEn'] ?? null,
            'us_last_name_en' => $userData['lastNameEn'] ?? null,
            'us_phone' => $userData['phone'] ?? null,
            'us_department' => $userData['department'] ?? null,
            'us_role_id' => $userData['roleId'],
            'us_tt_id' => $userData['technicianTypeId'] ?? null,
            'us_job_title' => $userData['jobTitle'] ?? null,
        ], 'us_id');
    }

    /**
     * @throws \RuntimeException USER_NOT_FOUND|CANNOT_RESET_SUPERADMIN_PASSWORD|INVALID_DATA_FOR_PASSWORD_GENERATION
     */
    public function resetPassword(int $userId): bool
    {
        $target = $this->getUserById($userId);
        if ($target && $target->role_name === 'Superadmin') {
            throw new \RuntimeException('CANNOT_RESET_SUPERADMIN_PASSWORD');
        }

        $row = DB::table('user')->where('us_id', $userId)
            ->selectRaw('us_id, us_first_name_en, us_last_name_en, us_phone')
            ->first();
        if (! $row) {
            throw new \RuntimeException('USER_NOT_FOUND');
        }

        $defaultPassword = $this->generateDefaultPassword(
            $row->us_first_name_en ?? '',
            $row->us_last_name_en ?? '',
            $row->us_phone ?? ''
        );
        $hashedPassword = password_hash($defaultPassword, PASSWORD_BCRYPT);

        $affected = DB::table('user')->where('us_id', $userId)->update(['us_user_pass' => $hashedPassword]);
        if ($affected === 0) {
            throw new \RuntimeException('USER_NOT_FOUND');
        }

        return true;
    }

    /**
     * @throws \RuntimeException CANNOT_MODIFY_SUPERADMIN|DUPLICATE_USERNAME
     */
    public function updateUser(int $id, array $userData): int
    {
        $target = $this->getUserById($id);
        if ($target && $target->role_name === 'Superadmin') {
            throw new \RuntimeException('CANNOT_MODIFY_SUPERADMIN');
        }

        if (! empty($userData['userName'])) {
            $dup = DB::table('user')->where('us_user_name', $userData['userName'])->where('us_id', '<>', $id)->exists();
            if ($dup) {
                throw new \RuntimeException('DUPLICATE_USERNAME');
            }
        }

        $update = [
            'us_ttn_id' => $userData['titleId'] ?? null,
            'us_first_name_th' => $userData['firstNameTh'],
            'us_last_name_th' => $userData['lastNameTh'],
            'us_first_name_en' => $userData['firstNameEn'] ?? null,
            'us_last_name_en' => $userData['lastNameEn'] ?? null,
            'us_phone' => $userData['phone'] ?? null,
            'us_department' => $userData['department'] ?? null,
            'us_role_id' => $userData['roleId'],
            'us_tt_id' => $userData['technicianTypeId'] ?? null,
            'us_job_title' => $userData['jobTitle'] ?? null,
        ];

        if (! empty($userData['userName'])) {
            $update['us_user_name'] = $userData['userName'];
        }
        if (! empty($userData['password'])) {
            $update['us_user_pass'] = password_hash($userData['password'], PASSWORD_BCRYPT);
        }

        return DB::table('user')->where('us_id', $id)->update($update);
    }

    /**
     * @throws \RuntimeException USER_NOT_FOUND|INVALID_OLD_PASSWORD
     */
    public function updatePersonalProfile(int $id, array $userData, string $oldPassword, ?string $newPassword, bool $isFirstLogin = false): int
    {
        $current = $this->getUserById($id);
        if (! $current) {
            throw new \RuntimeException('USER_NOT_FOUND');
        }

        if (! $isFirstLogin) {
            if (! password_verify($oldPassword, $current->us_user_pass)) {
                throw new \RuntimeException('INVALID_OLD_PASSWORD');
            }
        }

        $finalPassword = $current->us_user_pass;
        $usActive = array_key_exists('usActive', $userData) && $userData['usActive'] !== null
            ? $userData['usActive']
            : $current->us_active;

        if ($newPassword) {
            $finalPassword = password_hash($newPassword, PASSWORD_BCRYPT);
            if ((int) $current->us_active === 0) {
                $usActive = 1;
            }
        }

        $update = ['us_user_pass' => $finalPassword];

        foreach ([
            'titleId' => 'us_ttn_id',
            'department' => 'us_department',
            'phone' => 'us_phone',
            'firstNameTh' => 'us_first_name_th',
            'lastNameTh' => 'us_last_name_th',
            'firstNameEn' => 'us_first_name_en',
            'lastNameEn' => 'us_last_name_en',
            'userName' => 'us_user_name',
        ] as $key => $column) {
            if (array_key_exists($key, $userData) && $userData[$key] !== null) {
                $update[$column] = $userData[$key];
            }
        }

        $update['us_active'] = $usActive;

        return DB::table('user')->where('us_id', $id)->update($update);
    }

    /**
     * @throws \RuntimeException CANNOT_DELETE_SUPERADMIN|DEPENDENCY_EXISTS|USER_NOT_FOUND
     */
    public function deleteUser(int $id): bool
    {
        $target = $this->getUserById($id);
        if ($target && $target->role_name === 'Superadmin') {
            throw new \RuntimeException('CANNOT_DELETE_SUPERADMIN');
        }

        $repairCount = DB::table('repair_form')->where('rf_us_id', $id)->count();
        $assignmentCount = DB::table('repair_assignment')->where('ra_us_id', $id)->count();
        if (($repairCount + $assignmentCount) > 0) {
            throw new \RuntimeException('DEPENDENCY_EXISTS');
        }

        $affected = DB::table('user')->where('us_id', $id)->delete();
        if ($affected === 0) {
            throw new \RuntimeException('USER_NOT_FOUND');
        }

        return true;
    }

    /**
     * @return array{success: int, failed: int, errors: array}
     */
    public function importUsers(array $userList): array
    {
        $results = [];
        $errors = [];

        foreach ($userList as $index => $user) {
            try {
                if (($user['role_name'] ?? null) === 'Superadmin') {
                    throw new \RuntimeException('CANNOT_IMPORT_SUPERADMIN');
                }

                if (empty($user['username']) || empty($user['first_name_th']) || empty($user['first_name_en'])
                    || empty($user['last_name_en']) || empty($user['phone']) || empty($user['role_name'])) {
                    throw new \RuntimeException('ข้อมูลไม่ครบถ้วน');
                }

                $defaultPassword = $this->generateDefaultPassword($user['first_name_en'], $user['last_name_en'], $user['phone']);
                $hashedPassword = password_hash($defaultPassword, PASSWORD_BCRYPT);

                $role = DB::table('role')->where('role_name', $user['role_name'])->first();
                if (! $role) {
                    throw new \RuntimeException('ไม่พบบทบาทที่ระบุ');
                }

                $title = DB::table('title_name')->where('ttn_title_th', $user['title_name'] ?? null)->first();
                if (! $title) {
                    throw new \RuntimeException('ไม่พบคำนำหน้าชื่อ');
                }

                $techTypeId = null;
                if ($user['role_name'] === 'Technician') {
                    if (empty($user['technician_type'])) {
                        throw new \RuntimeException('ต้องระบุประเภทช่าง');
                    }
                    $techType = DB::table('technician_type')->where('tt_name', $user['technician_type'])->first();
                    if (! $techType) {
                        throw new \RuntimeException('ไม่พบประเภทช่าง');
                    }
                    $techTypeId = $techType->tt_id;
                }

                if (DB::table('user')->where('us_user_name', $user['username'])->exists()) {
                    throw new \RuntimeException('Username ซ้ำในระบบ');
                }

                DB::table('user')->insert([
                    'us_user_name' => $user['username'],
                    'us_user_pass' => $hashedPassword,
                    'us_ttn_id' => $title->ttn_id,
                    'us_department' => $user['department'] ?? null,
                    'us_phone' => $user['phone'],
                    'us_first_name_th' => $user['first_name_th'],
                    'us_last_name_th' => $user['last_name_th'] ?? null,
                    'us_first_name_en' => $user['first_name_en'],
                    'us_last_name_en' => $user['last_name_en'],
                    'us_role_id' => $role->role_id,
                    'us_tt_id' => $techTypeId,
                    'us_job_title' => $user['position'] ?? null,
                ]);

                $results[] = ['index' => $index, 'username' => $user['username']];
            } catch (\Throwable $e) {
                $errors[] = ['index' => $index, 'username' => $user['username'] ?? null, 'message' => $e->getMessage()];
            }
        }

        return ['success' => count($results), 'failed' => count($errors), 'errors' => $errors];
    }
}
