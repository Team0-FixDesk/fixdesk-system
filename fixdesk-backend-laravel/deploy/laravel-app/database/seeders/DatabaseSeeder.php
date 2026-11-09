<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * ข้อมูลจำลองสำหรับทดสอบ/เดโมบนเครื่อง local เท่านั้น (ครอบคลุม Phase 1-3)
 * ของจริงตอน deploy ให้ import ข้อมูลจากฐานข้อมูล production แทน ไม่ต้องรัน seeder นี้
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // --- Titles ---
        $titleNai = DB::table('title_name')->insertGetId(['ttn_title_th' => 'นาย']);
        $titleNang = DB::table('title_name')->insertGetId(['ttn_title_th' => 'นาง']);
        $titleNangsao = DB::table('title_name')->insertGetId(['ttn_title_th' => 'นางสาว']);

        // --- Roles ---
        $adminRoleId = DB::table('role')->insertGetId(['role_name' => 'Admin']);
        $techRoleId = DB::table('role')->insertGetId(['role_name' => 'Technician']);
        $userRoleId = DB::table('role')->insertGetId(['role_name' => 'User']);

        // --- Technician Types ---
        $ttElectric = DB::table('technician_type')->insertGetId(['tt_name' => 'ช่างไฟฟ้า']);
        $ttPlumbing = DB::table('technician_type')->insertGetId(['tt_name' => 'ช่างประปา']);
        $ttAircon = DB::table('technician_type')->insertGetId(['tt_name' => 'ช่างแอร์']);
        $ttComputer = DB::table('technician_type')->insertGetId(['tt_name' => 'ช่างคอมพิวเตอร์']);

        // --- Buildings / Floors / Rooms ---
        $bd1 = DB::table('building')->insertGetId(['bd_name' => 'อาคารสำนักงานใหญ่']);
        $bd2 = DB::table('building')->insertGetId(['bd_name' => 'อาคารคลังสินค้า']);

        $fl1_1 = DB::table('floor')->insertGetId(['fl_name' => 'ชั้น 1', 'fl_bd_id' => $bd1]);
        $fl1_2 = DB::table('floor')->insertGetId(['fl_name' => 'ชั้น 2', 'fl_bd_id' => $bd1]);
        $fl1_3 = DB::table('floor')->insertGetId(['fl_name' => 'ชั้น 3', 'fl_bd_id' => $bd1]);
        $fl2_1 = DB::table('floor')->insertGetId(['fl_name' => 'ชั้น 1', 'fl_bd_id' => $bd2]);

        $room101 = DB::table('room')->insertGetId(['room_name' => 'ห้องต้อนรับ', 'room_fl_id' => $fl1_1]);
        DB::table('room')->insert(['room_name' => 'ห้องประชุมใหญ่', 'room_fl_id' => $fl1_1]);
        DB::table('room')->insert(['room_name' => 'ห้องน้ำชาย ชั้น 1', 'room_fl_id' => $fl1_1]);

        $room201 = DB::table('room')->insertGetId(['room_name' => 'ห้องฝ่ายบัญชี', 'room_fl_id' => $fl1_2]);
        DB::table('room')->insert(['room_name' => 'ห้องฝ่ายบุคคล', 'room_fl_id' => $fl1_2]);
        DB::table('room')->insert(['room_name' => 'ห้อง IT', 'room_fl_id' => $fl1_2]);

        DB::table('room')->insert(['room_name' => 'ห้องผู้บริหาร', 'room_fl_id' => $fl1_3]);
        DB::table('room')->insert(['room_name' => 'ห้องประชุมผู้บริหาร', 'room_fl_id' => $fl1_3]);

        $roomStock = DB::table('room')->insertGetId(['room_name' => 'พื้นที่จัดเก็บสินค้า A', 'room_fl_id' => $fl2_1]);
        DB::table('room')->insert(['room_name' => 'พื้นที่จัดเก็บสินค้า B', 'room_fl_id' => $fl2_1]);

        // --- Users ---
        $mkUser = fn (array $overrides) => array_merge([
            'us_active' => 1,
        ], $overrides);

        $adminId = DB::table('user')->insertGetId($mkUser([
            'us_user_name' => 'admin',
            'us_user_pass' => password_hash('admin1234', PASSWORD_BCRYPT),
            'us_ttn_id' => $titleNang,
            'us_first_name_th' => 'ผู้ดูแล', 'us_last_name_th' => 'ระบบ',
            'us_first_name_en' => 'Admin', 'us_last_name_en' => 'System',
            'us_phone' => '0800000000', 'us_department' => 'ฝ่าย IT',
            'us_role_id' => $adminRoleId, 'us_job_title' => 'ผู้ดูแลระบบ',
        ]), 'us_id');

        $tech1Id = DB::table('user')->insertGetId($mkUser([
            'us_user_name' => 'tech01',
            'us_user_pass' => password_hash('tech1234', PASSWORD_BCRYPT),
            'us_ttn_id' => $titleNai,
            'us_first_name_th' => 'สมศักดิ์', 'us_last_name_th' => 'ช่างดี',
            'us_first_name_en' => 'Somsak', 'us_last_name_en' => 'Changdee',
            'us_phone' => '0811111111', 'us_department' => 'ฝ่ายซ่อมบำรุง',
            'us_role_id' => $techRoleId, 'us_tt_id' => $ttElectric, 'us_job_title' => 'ช่างเทคนิค',
        ]), 'us_id');

        $tech2Id = DB::table('user')->insertGetId($mkUser([
            'us_user_name' => 'tech02',
            'us_user_pass' => password_hash('tech1234', PASSWORD_BCRYPT),
            'us_ttn_id' => $titleNai,
            'us_first_name_th' => 'วิชัย', 'us_last_name_th' => 'ซ่อมเก่ง',
            'us_first_name_en' => 'Wichai', 'us_last_name_en' => 'Somkeng',
            'us_phone' => '0822222222', 'us_department' => 'ฝ่ายซ่อมบำรุง',
            'us_role_id' => $techRoleId, 'us_tt_id' => $ttAircon, 'us_job_title' => 'ช่างเทคนิค',
        ]), 'us_id');

        DB::table('user')->insert($mkUser([
            'us_user_name' => 'tech03',
            'us_user_pass' => password_hash('tech1234', PASSWORD_BCRYPT),
            'us_ttn_id' => $titleNangsao,
            'us_first_name_th' => 'มาลี', 'us_last_name_th' => 'คอมพิวเตอร์',
            'us_first_name_en' => 'Malee', 'us_last_name_en' => 'Computer',
            'us_phone' => '0833333333', 'us_department' => 'ฝ่ายซ่อมบำรุง',
            'us_role_id' => $techRoleId, 'us_tt_id' => $ttComputer, 'us_job_title' => 'ช่างเทคนิค IT',
        ]));

        $user1Id = DB::table('user')->insertGetId($mkUser([
            'us_user_name' => 'user01',
            'us_user_pass' => password_hash('user1234', PASSWORD_BCRYPT),
            'us_ttn_id' => $titleNangsao,
            'us_first_name_th' => 'สุดา', 'us_last_name_th' => 'ใจงาม',
            'us_first_name_en' => 'Suda', 'us_last_name_en' => 'Jaingam',
            'us_phone' => '0844444444', 'us_department' => 'ฝ่ายบัญชี',
            'us_role_id' => $userRoleId, 'us_job_title' => 'เจ้าหน้าที่บัญชี',
        ]), 'us_id');

        DB::table('user')->insert($mkUser([
            'us_user_name' => 'user02',
            'us_user_pass' => password_hash('user1234', PASSWORD_BCRYPT),
            'us_ttn_id' => $titleNai,
            'us_first_name_th' => 'ประเสริฐ', 'us_last_name_th' => 'มั่นคง',
            'us_first_name_en' => 'Prasert', 'us_last_name_en' => 'Mankong',
            'us_phone' => '0855555555', 'us_department' => 'ฝ่ายบุคคล',
            'us_role_id' => $userRoleId, 'us_job_title' => 'เจ้าหน้าที่บุคคล',
        ]));

        // --- Stock: Categories / Units / Products ---
        $ctElectric = DB::table('categories')->insertGetId(['ct_name' => 'วัสดุไฟฟ้า']);
        $ctComputer = DB::table('categories')->insertGetId(['ct_name' => 'อุปกรณ์คอมพิวเตอร์']);
        $ctOffice = DB::table('categories')->insertGetId(['ct_name' => 'เครื่องใช้สำนักงาน']);

        $unitChin = DB::table('units')->insertGetId(['units_name' => 'ชิ้น']);
        $unitLord = DB::table('units')->insertGetId(['units_name' => 'หลอด']);
        $unitAn = DB::table('units')->insertGetId(['units_name' => 'อัน']);

        DB::table('products')->insert([
            ['pd_asset_code' => 'EL-001', 'pd_name' => 'หลอดไฟ LED 9W', 'pd_category_id' => $ctElectric, 'pd_quantity' => 50, 'pd_unit_id' => $unitLord, 'pd_status' => 'active', 'pd_updated_at' => now()],
            ['pd_asset_code' => 'EL-002', 'pd_name' => 'ปลั๊กไฟ 3 ตา', 'pd_category_id' => $ctElectric, 'pd_quantity' => 20, 'pd_unit_id' => $unitAn, 'pd_status' => 'active', 'pd_updated_at' => now()],
            ['pd_asset_code' => 'IT-001', 'pd_name' => 'เมาส์ไร้สาย Logitech', 'pd_category_id' => $ctComputer, 'pd_quantity' => 15, 'pd_unit_id' => $unitChin, 'pd_status' => 'active', 'pd_updated_at' => now()],
            ['pd_asset_code' => 'IT-002', 'pd_name' => 'คีย์บอร์ด USB', 'pd_category_id' => $ctComputer, 'pd_quantity' => 10, 'pd_unit_id' => $unitChin, 'pd_status' => 'active', 'pd_updated_at' => now()],
            ['pd_asset_code' => 'OF-001', 'pd_name' => 'กระดาษ A4', 'pd_category_id' => $ctOffice, 'pd_quantity' => 100, 'pd_unit_id' => $unitChin, 'pd_status' => 'active', 'pd_updated_at' => now()],
        ]);

        // --- Sample Repair Requests (เพื่อให้ dashboard/รายงานมีข้อมูลให้ดู) ---
        $rf1 = DB::table('repair_form')->insertGetId([
            'rf_code' => 'RF20260901001',
            'rf_us_id' => $user1Id,
            'rf_tt_id' => $ttComputer,
            'rf_room_id' => $room201,
            'rf_problem' => 'คอมพิวเตอร์เปิดไม่ติด',
            'rf_detail' => 'กดปุ่มเปิดเครื่องแล้วไม่มีไฟขึ้นเลย ลองเช็คปลั๊กแล้วปกติ',
            'rf_phone' => '0844444444',
            'rf_urgency' => 'high',
            'rf_building_snapshot' => 'อาคารสำนักงานใหญ่', 'rf_floor_snapshot' => 'ชั้น 2', 'rf_room_snapshot' => 'ห้องฝ่ายบัญชี',
            'rf_user_status' => 'done',
            'rf_create_at' => now()->subDays(5),
            'rf_in_process_at' => now()->subDays(5)->addHours(2),
            'rf_done_at' => now()->subDays(4),
            'rf_repair_method' => 'in_house', 'rf_result_status' => 'completed',
            'rf_tech_summary' => 'เปลี่ยน Power Supply ใหม่ เครื่องกลับมาใช้งานได้ปกติ',
        ], 'rf_id');
        DB::table('repair_assignment')->insert([
            'ra_rf_id' => $rf1, 'ra_us_id' => $tech2Id, 'ra_is_lead' => 1,
            'ra_assigned_at' => now()->subDays(5), 'ra_assigned_by' => $adminId, 'ra_accepted_at' => now()->subDays(5)->addHours(1),
        ]);

        $rf2 = DB::table('repair_form')->insertGetId([
            'rf_code' => 'RF20260910001',
            'rf_us_id' => $user1Id,
            'rf_tt_id' => $ttElectric,
            'rf_room_id' => $room101,
            'rf_problem' => 'ไฟดวงโคมเสีย',
            'rf_detail' => 'หลอดไฟกระพริบแล้วดับ บริเวณโต๊ะต้อนรับ',
            'rf_phone' => '0844444444',
            'rf_urgency' => 'medium',
            'rf_building_snapshot' => 'อาคารสำนักงานใหญ่', 'rf_floor_snapshot' => 'ชั้น 1', 'rf_room_snapshot' => 'ห้องต้อนรับ',
            'rf_user_status' => 'in_progress',
            'rf_create_at' => now()->subDays(2),
            'rf_in_process_at' => now()->subDays(1),
        ], 'rf_id');
        DB::table('repair_assignment')->insert([
            'ra_rf_id' => $rf2, 'ra_us_id' => $tech1Id, 'ra_is_lead' => 1,
            'ra_assigned_at' => now()->subDays(2), 'ra_assigned_by' => $adminId, 'ra_accepted_at' => now()->subDays(1),
        ]);

        DB::table('repair_form')->insert([
            'rf_code' => 'RF20260927001',
            'rf_us_id' => $user1Id,
            'rf_tt_id' => $ttAircon,
            'rf_room_id' => $roomStock,
            'rf_problem' => 'แอร์ไม่เย็น',
            'rf_detail' => 'เปิดแอร์แล้วลมไม่เย็น น่าจะต้องล้างแอร์หรือเติมน้ำยา',
            'rf_phone' => '0844444444',
            'rf_urgency' => 'low',
            'rf_building_snapshot' => 'อาคารคลังสินค้า', 'rf_floor_snapshot' => 'ชั้น 1', 'rf_room_snapshot' => 'พื้นที่จัดเก็บสินค้า A',
            'rf_user_status' => 'pending',
            'rf_create_at' => now()->subHours(6),
        ]);
    }
}
