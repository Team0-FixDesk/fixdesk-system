/**
 * =====================================================================
 * @file            public.service.js
 * @layer           Service Layer (Business Logic Layer)
 * @version         1.1.0
 * @since           2026-02-10
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *   - นราธิป แสนทวีสุข
 *
 * @lastModified    2026-02-14
 * @lastModifiedBy  นราธิป แสนทวีสุข
 * ---------------------------------------------------------------------
 * @description
 *  Service สำหรับจัดการ Public Logic
 *  ใช้สำหรับการค้นหาข้อมูลใบแจ้งซ่อม (Repair Form)
 *  โดยไม่ต้องมีการยืนยันตัวตน (Public Access)
 *
 *  รองรับการทำงาน:
 *    - ค้นหาใบแจ้งซ่อมด้วย keyword
 *    - รองรับการค้นหาจากหลาย field เช่น
 *        - รหัสใบแจ้งซ่อม
 *        - ชื่อผู้แจ้ง
 *        - นามสกุลผู้แจ้ง
 *        - หน่วยงาน
 *        - ชื่อ-นามสกุลแบบรวม
 *    - รองรับ pagination (limit, offset)
 *    - คืนค่าจำนวนทั้งหมด และข้อมูลรายการ
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - Initial implementation Public Service ตาม Layered Architecture
 *     [2026-02-10, พชร ไพศรีสกุล] V 1.0.0
 *   - เพิ่มการค้นหาที่ยืดหยุ่นขึ้น รองรับหลาย field และชื่อแบบรวม
 *     [2026-02-14, นราธิป แสนทวีสุข] V 1.1.0
 *
 * =====================================================================
 */

/**
 * Public Service Module
 * จัดการ Business Logic สำหรับ Public API
 *
 * @param {Object} db - Database connection instance
 * @returns {Object} Public Service Functions
 */
module.exports = (db) => {
  return {
    /**
     * ค้นหาข้อมูลใบแจ้งซ่อม (Repair Form)
     * รองรับการค้นหาแบบ partial match และ pagination
     * @param {string} keyword - คำค้นหา
     * @param {number} limit - จำนวนข้อมูลต่อหน้า
     * @param {number} offset - จุดเริ่มต้นของข้อมูล
     *
     * @returns {Promise<Object>}
     * @returns {number} returns.total - จำนวนข้อมูลทั้งหมด
     * @returns {Array<Object>} returns.data - รายการข้อมูลใบแจ้งซ่อม
     */
    async searchRepairForms(keyword, limit, offset) {
      // เตรียมคำค้นหา (ใส่ % หน้าหลังเพื่อหาบางส่วนของคำได้)
      const searchKeyword = `%${keyword}%`;

      // 1. คำสั่ง SQL สำหรับนับจำนวนข้อมูลทั้งหมดที่เจอ (Count)
      // เปลี่ยนชื่อย่อ rf, u เป็นชื่อเต็ม repairForm, user
      const countSqlStatement = `
        SELECT COUNT(*) AS total
        FROM repair_form AS repairForm
        LEFT JOIN user AS user ON repairForm.rf_us_id = user.us_id
        WHERE 
          repairForm.rf_code LIKE ?
          OR user.us_first_name_th LIKE ?
          OR user.us_last_name_th LIKE ?
          OR user.us_department LIKE ?
          OR CONCAT(user.us_first_name_th, ' ', user.us_last_name_th) LIKE ?
          OR CONCAT(COALESCE(user.us_first_name_th, ''), COALESCE(user.us_last_name_th, '')) LIKE ?
      `;

      // 2. คำสั่ง SQL สำหรับดึงข้อมูลมาแสดง (Data)
      const dataSqlStatement = `
        SELECT 
          repairForm.rf_code,
          repairForm.rf_problem,
          repairForm.rf_user_status,
          repairForm.rf_create_at,
          user.us_first_name_th AS reporter_firstname,
          user.us_last_name_th AS reporter_lastname,
          user.us_department AS reporter_department,
          building.bd_name AS building_name,
          floor.fl_name AS floor_name,
          room.room_name AS room_name
        FROM repair_form AS repairForm
        LEFT JOIN user AS user ON repairForm.rf_us_id = user.us_id
        LEFT JOIN room AS room ON repairForm.rf_room_id = room.room_id
        LEFT JOIN floor AS floor ON room.room_fl_id = floor.fl_id
        LEFT JOIN building AS building ON floor.fl_bd_id = building.bd_id
        WHERE 
          repairForm.rf_code LIKE ?
          OR user.us_first_name_th LIKE ?
          OR user.us_last_name_th LIKE ?
          OR user.us_department LIKE ?
          OR CONCAT(user.us_first_name_th, ' ', user.us_last_name_th) LIKE ?
          OR CONCAT(COALESCE(user.us_first_name_th, ''), COALESCE(user.us_last_name_th, '')) LIKE ?
        ORDER BY repairForm.rf_create_at DESC
        LIMIT ? OFFSET ?
      `;

      // ใช้ Promise.all เพื่อรัน 2 Query พร้อมกัน (ให้งานเสร็จไวขึ้น)
      const [countResult, repairFormList] = await Promise.all([
        // Query ที่ 1: นับจำนวน
        new Promise((resolve, reject) => {
          db.query(
            countSqlStatement,
            [
              searchKeyword,
              searchKeyword,
              searchKeyword,
              searchKeyword,
              searchKeyword,
              searchKeyword,
            ],
            (err, res) => {
              if (err) reject(err);
              else resolve(res);
            },
          );
        }),
        // Query ที่ 2: ดึงข้อมูล
        new Promise((resolve, reject) => {
          db.query(
            dataSqlStatement,
            [
              searchKeyword,
              searchKeyword,
              searchKeyword,
              searchKeyword,
              searchKeyword,
              searchKeyword,
              limit,
              offset,
            ],
            (err, res) => {
              if (err) reject(err);
              else resolve(res);
            },
          );
        }),
      ]);

      // ส่งผลลัพธ์กลับออกไป
      return {
        total: countResult[0].total,
        data: repairFormList,
      };
    },
  };
};
