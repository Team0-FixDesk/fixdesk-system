module.exports = (db) => {
  return {
    // ฟังก์ชันค้นหาข้อมูลใบแจ้งซ่อม (Repair Form)
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
        ORDER BY repairForm.rf_create_at DESC
        LIMIT ? OFFSET ?
      `;

      // ใช้ Promise.all เพื่อรัน 2 Query พร้อมกัน (ให้งานเสร็จไวขึ้น)
      const [countResult, repairFormList] = await Promise.all([
        // Query ที่ 1: นับจำนวน
        new Promise((resolve, reject) => {
          db.query(
            countSqlStatement,
            [searchKeyword, searchKeyword, searchKeyword, searchKeyword],
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
