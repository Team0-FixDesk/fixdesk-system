module.exports = (db) => {
  return {
    /* ================== TECHNICIAN MANAGEMENT ================== */

    // ดึงรายชื่อช่างทั้งหมด
    async getAllTechnicians() {
      const sql = `
        SELECT
            u.us_id, u.us_user_name,
            tn.ttn_title_th AS prefix_name,
            u.us_first_name_th AS us_first_name, u.us_last_name_th AS us_last_name,
            u.us_phone, u.us_department, u.us_tt_id,
            tt.tt_name
        FROM user u
        LEFT JOIN technician_type tt ON u.us_tt_id = tt.tt_id
        LEFT JOIN title_name tn ON u.us_ttn_id = tn.ttn_id
        WHERE u.us_role_id = 2
        ORDER BY u.us_first_name_th ASC
      `;
      return new Promise((resolve, reject) => {
        db.query(sql, (err, res) => (err ? reject(err) : resolve(res)));
      });
    },

    // ดึงประเภทงานช่าง
    async getAllTechnicianTypes() {
      const sql = "SELECT tt_id, tt_name FROM technician_type ORDER BY tt_name";
      return new Promise((resolve, reject) => {
        db.query(sql, (err, res) => (err ? reject(err) : resolve(res)));
      });
    },

    // เพิ่มประเภทงานช่าง
    async createTechnicianType(name) {
      // เช็คซ้ำ
      const [check] = await db
        .promise()
        .query(
          "SELECT COUNT(*) as count FROM technician_type WHERE LOWER(tt_name) = LOWER(?)",
          [name],
        );
      if (check[0].count > 0) throw new Error("DUPLICATE_NAME");

      const [res] = await db
        .promise()
        .query("INSERT INTO technician_type (tt_name) VALUES (?)", [name]);
      return res.insertId;
    },

    // แก้ไขประเภทงานช่าง
    async updateTechnicianType(id, name) {
      // เช็คว่ามี repair ใช้อยู่ไหม
      const [repairCheck] = await db
        .promise()
        .query("SELECT COUNT(*) as count FROM repair_form WHERE rf_tt_id = ?", [
          id,
        ]);

      if (repairCheck[0].count > 0) throw new Error("DEPENDENCY_EXISTS");

      // เช็คชื่อซ้ำ
      const [check] = await db.promise().query(
        `SELECT COUNT(*) as count 
     FROM technician_type 
     WHERE LOWER(tt_name) = LOWER(?) AND tt_id != ?`,
        [name, id],
      );

      if (check[0].count > 0) throw new Error("DUPLICATE_NAME");

      const [res] = await db
        .promise()
        .query("UPDATE technician_type SET tt_name = ? WHERE tt_id = ?", [
          name,
          id,
        ]);

      if (res.affectedRows === 0) throw new Error("NOT_FOUND");

      return true;
    },
    // ลบประเภทงานช่าง
    async deleteTechnicianType(id) {
      // 1. เช็ค user ใช้อยู่ไหม
      const [userCheck] = await db
        .promise()
        .query("SELECT COUNT(*) as count FROM user WHERE us_tt_id = ?", [id]);

      if (userCheck[0].count > 0) throw new Error("DEPENDENCY_EXISTS");

      // 2. เช็ค repair_form ใช้อยู่ไหม  ⭐ จุดที่หายไป
      const [repairCheck] = await db
        .promise()
        .query("SELECT COUNT(*) as count FROM repair_form WHERE rf_tt_id = ?", [
          id,
        ]);

      if (repairCheck[0].count > 0) throw new Error("DEPENDENCY_EXISTS");

      // 3. ลบจริง
      const [res] = await db
        .promise()
        .query("DELETE FROM technician_type WHERE tt_id = ?", [id]);

      if (res.affectedRows === 0) throw new Error("NOT_FOUND");

      return true;
    },

    /* ================== JOB MANAGEMENT (Task List) ================== */

    // ดึงงานซ่อมของช่าง (ที่ได้รับมอบหมาย)
    async getTechnicianRepairs(techId) {
      const sql = `
            SELECT
                rf.rf_id, rf.rf_code, rf.rf_prop_number, rf.rf_problem,
                rf.rf_create_at, rf.rf_user_status,
                COALESCE(rf.rf_urgency, 'medium') AS rf_urgency,
                u.us_first_name_th AS us_first_name, u.us_last_name_th AS us_last_name,
                u.us_department AS department_name,
                tt.tt_name,
                b.bd_name AS building_name, f.fl_name AS floor_name, r.room_name AS room_name
            FROM repair_form rf
            JOIN repair_assignment ra ON rf.rf_id = ra.ra_rf_id
            LEFT JOIN user u ON rf.rf_us_id = u.us_id
            LEFT JOIN technician_type tt ON rf.rf_tt_id = tt.tt_id
            LEFT JOIN room r ON rf.rf_room_id = r.room_id
            LEFT JOIN floor f ON r.room_fl_id = f.fl_id
            LEFT JOIN building b ON f.fl_bd_id = b.bd_id
            WHERE ra.ra_us_id = ?
            ORDER BY rf.rf_create_at DESC
        `;
      const [rows] = await db.promise().query(sql, [techId]);
      return rows;
    },

    // ดึงประวัติงานที่เสร็จแล้ว
    async getTechnicianHistory(techId) {
      const sql = `
            SELECT
                rf.rf_id, rf.rf_code, rf.rf_prop_number, rf.rf_problem,
                rf.rf_create_at, rf.rf_user_status,
                COALESCE(rf.rf_urgency, 'medium') AS rf_urgency,
                u.us_first_name_th AS us_first_name, u.us_last_name_th AS us_last_name,
                u.us_department AS department_name,
                tt.tt_name,
                b.bd_name AS building_name, f.fl_name AS floor_name, r.room_name AS room_name
            FROM repair_form rf
            JOIN repair_assignment ra ON rf.rf_id = ra.ra_rf_id
            LEFT JOIN user u ON rf.rf_us_id = u.us_id
            LEFT JOIN technician_type tt ON rf.rf_tt_id = tt.tt_id
            LEFT JOIN room r ON rf.rf_room_id = r.room_id
            LEFT JOIN floor f ON r.room_fl_id = f.fl_id
            LEFT JOIN building b ON f.fl_bd_id = b.bd_id
            WHERE ra.ra_us_id = ? AND rf.rf_user_status = 'done'
            ORDER BY rf.rf_create_at DESC
        `;
      const [rows] = await db.promise().query(sql, [techId]);
      return rows;
    },

    // ดึงรายการใบเบิกของฉัน
    async getMyStockForms(techId) {
      const sql = `
            SELECT
                sf.sf_id, sf.sf_code, sf.sf_create_at, sf.sf_update_at,
                sf.sf_status, sf.sf_rf_id, rf.rf_code AS related_rf_code,
                b.bd_name AS building_name, f.fl_name AS floor_name, r.room_name AS room_name
            FROM stock_form sf
            LEFT JOIN repair_form rf ON sf.sf_rf_id = rf.rf_id
            LEFT JOIN room r ON rf.rf_room_id = r.room_id
            LEFT JOIN floor f ON r.room_fl_id = f.fl_id
            LEFT JOIN building b ON f.fl_bd_id = b.bd_id
            WHERE sf.sf_us_id = ?
            ORDER BY sf.sf_create_at DESC
        `;
      const [rows] = await db.promise().query(sql, [techId]);
      return rows;
    },

    // ปิดงาน / ส่ง Outsource
    async closeJob(techId, rfCode, status, summary, imageAfter) {
      // ⭐ ตรวจว่ามีใบเบิกค้างอยู่ไหม
      const [pendingStock] = await db.promise().query(
        `
    SELECT 1
    FROM stock_form sf
    JOIN stock_form_detail sfd ON sfd.sfd_sf_id = sf.sf_id
    JOIN repair_form rf ON rf.rf_id = sf.sf_rf_id
    WHERE rf.rf_code = ?
    AND sfd.sfd_status = 'waiting'
    LIMIT 1
    `,
        [rfCode],
      );

      if (pendingStock.length > 0) {
        throw new Error("PENDING_STOCK_APPROVAL");
      }

      // =========================
      // Logic เดิมของคุณ
      // =========================

      let updateFields = "";
      let params = [];

      if (status === "done") {
        updateFields = `
      rf.rf_user_status = 'done',
      rf.rf_done_at = NOW(),
      rf.rf_tech_summary = ?,
      rf.rf_tech_image_after = ?
    `;
        params = [summary, imageAfter, rfCode, techId];
      } else if (status === "outsource") {
        updateFields = `
      rf.rf_user_status = 'outsource',
      rf.rf_is_outsourced = 1
    `;
        params = [rfCode, techId];
      } else {
        throw new Error("INVALID_STATUS");
      }

      const sql = `
    UPDATE repair_form rf
    JOIN repair_assignment ra ON rf.rf_id = ra.ra_rf_id
    SET ${updateFields}
    WHERE rf.rf_code = ?
    AND ra.ra_us_id = ?
    AND rf.rf_user_status IN ('in_progress', 'outsource')
  `;

      const [result] = await db.promise().query(sql, params);

      if (result.affectedRows === 0)
        throw new Error("JOB_NOT_FOUND_OR_INVALID_STATUS");

      return true;
    },

    // เบิกของ (ใช้ Logic ร่วมกับ Stock Service หรือเขียนใหม่ที่นี่เฉพาะ Tech)
    // *Refactor: ย้าย Logic การตัดสต๊อกไปไว้ที่นี่เพื่อให้ Technician Service จบในตัวเรื่องงานช่าง*
    async withdrawStock(techId, repairCode, items) {
      const connection = await db.promise().getConnection();
      try {
        await connection.beginTransaction();

        // 1. หา Repair ID
        let rfId = null;
        if (repairCode) {
          const [rf] = await connection.query(
            "SELECT rf_id FROM repair_form WHERE rf_code = ?",
            [repairCode],
          );
          if (rf.length > 0) rfId = rf[0].rf_id;
        }

        // 2. สร้าง Stock Form Header
        // *Logic สร้างรหัส SF แบบรันนิ่ง*
        const datePart = new Date()
          .toISOString()
          .slice(0, 10)
          .replace(/-/g, "");
        const [countRes] = await connection.query(
          "SELECT COUNT(*) AS count FROM stock_form WHERE DATE(sf_create_at) = CURDATE()",
        );
        const runningNumber = String(countRes[0].count + 1).padStart(3, "0");
        const sfCode = `SF${datePart}${runningNumber}`;

        const [sfRes] = await connection.query(
          "INSERT INTO stock_form (sf_code, sf_status, sf_create_at, sf_us_id, sf_rf_id) VALUES (?, 'waiting', NOW(), ?, ?)",
          [sfCode, techId, rfId],
        );
        const sfId = sfRes.insertId;

        // 3. Loop ตัดสต๊อก
        for (const item of items) {
          // Check Stock & Lock Row
          const [pd] = await connection.query(
            "SELECT pd_quantity, pd_name FROM products WHERE pd_id = ? FOR UPDATE",
            [item.id],
          );
          if (pd.length === 0) throw new Error(`PRODUCT_NOT_FOUND:${item.id}`);

          if (pd[0].pd_quantity < item.qty) {
            throw new Error(`INSUFFICIENT_STOCK:${pd[0].pd_name}`);
          }

          // Decrement
          await connection.query(
            "UPDATE products SET pd_quantity = pd_quantity - ? WHERE pd_id = ?",
            [item.qty, item.id],
          );

          // Insert Detail
          await connection.query(
            "INSERT INTO stock_form_detail (sfd_sf_id, sfd_pd_id, sfd_qty, sfd_status) VALUES (?, ?, ?, 'waiting')",
            [sfId, item.id, item.qty],
          );
        }

        await connection.commit();
        return { sfId, sfCode };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
  };
};
