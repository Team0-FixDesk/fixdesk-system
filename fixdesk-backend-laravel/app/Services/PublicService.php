<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class PublicService
{
    /**
     * ค้นหาใบแจ้งซ่อมแบบ public (ไม่ต้อง login) รองรับ partial match หลาย field + pagination
     * พอร์ตมาจาก public-service.js (fixdesk-backend เดิม) ให้ตรงกับพฤติกรรมเดิมทุกประการ
     */
    public function searchRepairForms(string $keyword, int $limit, int $offset): array
    {
        $searchKeyword = "%{$keyword}%";

        $total = DB::table('repair_form as repairForm')
            ->leftJoin('user as user', 'repairForm.rf_us_id', '=', 'user.us_id')
            ->where(function ($query) use ($searchKeyword) {
                $query->where('repairForm.rf_code', 'like', $searchKeyword)
                    ->orWhere('user.us_first_name_th', 'like', $searchKeyword)
                    ->orWhere('user.us_last_name_th', 'like', $searchKeyword)
                    ->orWhere('user.us_department', 'like', $searchKeyword)
                    ->orWhereRaw("CONCAT(user.us_first_name_th, ' ', user.us_last_name_th) LIKE ?", [$searchKeyword])
                    ->orWhereRaw("CONCAT(COALESCE(user.us_first_name_th, ''), COALESCE(user.us_last_name_th, '')) LIKE ?", [$searchKeyword]);
            })
            ->count();

        $data = DB::table('repair_form as repairForm')
            ->leftJoin('user as user', 'repairForm.rf_us_id', '=', 'user.us_id')
            ->leftJoin('room as room', 'repairForm.rf_room_id', '=', 'room.room_id')
            ->leftJoin('floor as floor', 'room.room_fl_id', '=', 'floor.fl_id')
            ->leftJoin('building as building', 'floor.fl_bd_id', '=', 'building.bd_id')
            ->where(function ($query) use ($searchKeyword) {
                $query->where('repairForm.rf_code', 'like', $searchKeyword)
                    ->orWhere('user.us_first_name_th', 'like', $searchKeyword)
                    ->orWhere('user.us_last_name_th', 'like', $searchKeyword)
                    ->orWhere('user.us_department', 'like', $searchKeyword)
                    ->orWhereRaw("CONCAT(user.us_first_name_th, ' ', user.us_last_name_th) LIKE ?", [$searchKeyword])
                    ->orWhereRaw("CONCAT(COALESCE(user.us_first_name_th, ''), COALESCE(user.us_last_name_th, '')) LIKE ?", [$searchKeyword]);
            })
            ->orderByDesc('repairForm.rf_create_at')
            ->limit($limit)
            ->offset($offset)
            ->selectRaw('repairForm.rf_code, repairForm.rf_problem, repairForm.rf_user_status, repairForm.rf_create_at,
                user.us_first_name_th as reporter_firstname, user.us_last_name_th as reporter_lastname,
                user.us_department as reporter_department,
                building.bd_name as building_name, floor.fl_name as floor_name, room.room_name as room_name')
            ->get()
            ->all();

        return ['total' => $total, 'data' => $data];
    }
}
