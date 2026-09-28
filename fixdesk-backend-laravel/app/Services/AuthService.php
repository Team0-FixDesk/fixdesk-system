<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class AuthService
{
    /**
     * @throws \RuntimeException with message USER_NOT_FOUND or INVALID_PASSWORD
     */
    public function authenticateUser(string $userName, string $password): string
    {
        $currentUser = DB::table('user')
            ->leftJoin('title_name', 'user.us_ttn_id', '=', 'title_name.ttn_id')
            ->leftJoin('role', 'user.us_role_id', '=', 'role.role_id')
            ->where('user.us_user_name', $userName)
            ->select(
                'user.us_id', 'user.us_user_name', 'user.us_user_pass',
                'title_name.ttn_title_th', 'user.us_first_name_th', 'user.us_last_name_th',
                'user.us_first_name_en', 'user.us_last_name_en',
                'user.us_phone', 'user.us_department', 'user.us_job_title',
                'user.us_active', 'role.role_name'
            )
            ->first();

        if (! $currentUser) {
            throw new \RuntimeException('USER_NOT_FOUND');
        }

        if (! password_verify($password, $currentUser->us_user_pass)) {
            throw new \RuntimeException('INVALID_PASSWORD');
        }

        $roleName = $currentUser->role_name ?? '';
        if (strtolower($roleName) === 'superadmin') {
            $roleName = 'Admin';
        }

        $payload = [
            'us_id' => $currentUser->us_id,
            'us_user_name' => $currentUser->us_user_name,
            'us_prefix_th' => $currentUser->ttn_title_th ?? '',
            'us_first_name_th' => $currentUser->us_first_name_th ?? '',
            'us_last_name_th' => $currentUser->us_last_name_th ?? '',
            'us_first_name_en' => $currentUser->us_first_name_en ?? '',
            'us_last_name_en' => $currentUser->us_last_name_en ?? '',
            'us_tel' => $currentUser->us_phone ?? '',
            'us_department' => $currentUser->us_department ?? '',
            'us_job_title' => $currentUser->us_job_title ?? '',
            'us_active' => $currentUser->us_active ?? 0,
            'role_name' => $roleName,
        ];

        return JwtService::encode($payload, '+8 hours');
    }
}
