<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * ข้อมูลอ้างอิงขั้นต่ำสำหรับทดสอบ Phase 1 (auth + repair flow) บนเครื่อง local เท่านั้น
 * ของจริงตอน deploy ให้ import ข้อมูลจากฐานข้อมูล production แทน ไม่ต้องรัน seeder นี้
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $titleId = DB::table('title_name')->insertGetId(['ttn_title_th' => 'นาย']);
        DB::table('title_name')->insert(['ttn_title_th' => 'นาง']);
        DB::table('title_name')->insert(['ttn_title_th' => 'นางสาว']);

        $adminRoleId = DB::table('role')->insertGetId(['role_name' => 'Admin']);
        $techRoleId = DB::table('role')->insertGetId(['role_name' => 'Technician']);
        DB::table('role')->insert(['role_name' => 'User']);

        $techTypeId = DB::table('technician_type')->insertGetId(['tt_name' => 'ช่างไฟฟ้า']);
        DB::table('technician_type')->insert(['tt_name' => 'ช่างประปา']);

        $buildingId = DB::table('building')->insertGetId(['bd_name' => 'อาคาร 1']);
        $floorId = DB::table('floor')->insertGetId(['fl_name' => 'ชั้น 1', 'fl_bd_id' => $buildingId]);
        DB::table('room')->insertGetId(['room_name' => 'ห้อง 101', 'room_fl_id' => $floorId]);

        DB::table('user')->insert([
            'us_user_name' => 'admin',
            'us_user_pass' => password_hash('admin1234', PASSWORD_BCRYPT),
            'us_ttn_id' => $titleId,
            'us_first_name_th' => 'ผู้ดูแล',
            'us_last_name_th' => 'ระบบ',
            'us_first_name_en' => 'Admin',
            'us_last_name_en' => 'System',
            'us_phone' => '0800000000',
            'us_department' => 'IT',
            'us_role_id' => $adminRoleId,
            'us_job_title' => 'Administrator',
            'us_active' => 1,
        ]);

        DB::table('user')->insert([
            'us_user_name' => 'tech01',
            'us_user_pass' => password_hash('tech1234', PASSWORD_BCRYPT),
            'us_ttn_id' => $titleId,
            'us_first_name_th' => 'ช่าง',
            'us_last_name_th' => 'ทดสอบ',
            'us_first_name_en' => 'Tech',
            'us_last_name_en' => 'Test',
            'us_phone' => '0811111111',
            'us_department' => 'Maintenance',
            'us_role_id' => $techRoleId,
            'us_tt_id' => $techTypeId,
            'us_job_title' => 'Technician',
            'us_active' => 1,
        ]);
    }
}
