const express = require("express");
const { authMiddleware } = require("../auth.middleware");

module.exports = function TechnicianRoutes(db) {
  const router = express.Router();

  // เรียกข้อมูลช่าง
  router.get("/technicians", authMiddleware, (req, res) => {
    const query = `
        SELECT
            u.us_id,
            u.us_user_name,
            tn.ttn_title_th AS prefix_name,
            u.us_first_name_th AS us_first_name,
            u.us_last_name_th AS us_last_name,
            u.us_phone,
            u.us_department,
            u.us_tt_id,
            tt.tt_name
        FROM user u
        LEFT JOIN technician_type tt ON u.us_tt_id = tt.tt_id
        LEFT JOIN title_name tn ON u.us_ttn_id = tn.ttn_id
        WHERE u.us_role_id = 2
        ORDER BY u.us_first_name_th ASC
        `;

    db.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching technicians:", err);
        return res
          .status(500)
          .json({ message: "ดึงข้อมูลช่างไม่สำเร็จ", error: err.message });
      }
      res.json(results);
    });
  });

  // เรียกประเภทของช่าง
  router.get("/technician-types", (req, res) => {
    const query = "SELECT tt_id, tt_name FROM technician_type ORDER BY tt_name";
    db.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching technician types:", err);
        return res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลประเภทงาน" });
      }
      res.json(results);
    });
  });

  // สร้างประเภทของช่าง
  router.post("/technician-types", (req, res) => {
    const { tt_name } = req.body;
    if (!tt_name || !tt_name.trim()) {
      return res.status(400).json({ message: "กรุณากรอกชื่อประเภทงาน" });
    }
    // ตรวจสอบชื่อซ้ำ
    const checkQuery =
      "SELECT COUNT(*) as count FROM technician_type WHERE LOWER(tt_name) = LOWER(?)";
    db.query(checkQuery, [tt_name.trim()], (err, results) => {
      if (err) {
        console.error("Error checking duplicate technician type:", err);
        return res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
      }
      if (results[0].count > 0) {
        return res
          .status(400)
          .json({ message: "ชื่อประเภทงานนี้มีอยู่ในระบบแล้ว" });
      }

      const insertQuery = "INSERT INTO technician_type (tt_name) VALUES (?)";
      db.query(insertQuery, [tt_name.trim()], (err, result) => {
        if (err) {
          console.error("Error creating technician type:", err);
          return res
            .status(500)
            .json({ message: "เกิดข้อผิดพลาดในการเพิ่มประเภทงาน" });
        }
        res.status(201).json({
          message: "เพิ่มประเภทงานสำเร็จ",
          tt_id: result.insertId,
          tt_name: tt_name.trim(),
        });
      });
    });
  });

  // แก้ไขข้อมูลประเภทช่าง
  router.put("/technician-types/:id", (req, res) => {
    const { id } = req.params;
    const { tt_name } = req.body;
    if (!tt_name || !tt_name.trim()) {
      return res.status(400).json({ message: "กรุณากรอกชื่อประเภทงาน" });
    }
    // ตรวจสอบชื่อซ้ำ (ยกเว้น record ปัจจุบัน)
    const checkQuery =
      "SELECT COUNT(*) as count FROM technician_type WHERE LOWER(tt_name) = LOWER(?) AND tt_id != ?";
    db.query(checkQuery, [tt_name.trim(), id], (err, results) => {
      if (err) {
        console.error("Error checking duplicate technician type:", err);
        return res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
      }
      if (results[0].count > 0) {
        return res
          .status(400)
          .json({ message: "ชื่อประเภทงานนี้มีอยู่ในระบบแล้ว" });
      }

      const updateQuery =
        "UPDATE technician_type SET tt_name = ? WHERE tt_id = ?";
      db.query(updateQuery, [tt_name.trim(), id], (err, result) => {
        if (err) {
          console.error("Error updating technician type:", err);
          return res
            .status(500)
            .json({ message: "เกิดข้อผิดพลาดในการแก้ไขประเภทงาน" });
        }
        if (result.affectedRows === 0) {
          return res
            .status(404)
            .json({ message: "ไม่พบประเภทงานที่ต้องการแก้ไข" });
        }
        res.json({ message: "แก้ไขประเภทงานสำเร็จ" });
      });
    });
  });

  // ลบข้อมูลประเภทช่าง
  router.delete("/technician-types/:id", (req, res) => {
    const { id } = req.params;
    // ตรวจสอบว่ามีการใช้งานประเภทงานนี้อยู่หรือไม่
    const checkQuery = "SELECT COUNT(*) as count FROM user WHERE us_tt_id = ?";
    db.query(checkQuery, [id], (err, results) => {
      if (err) {
        console.error("Error checking technician type usage:", err);
        return res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
      }
      if (results[0].count > 0) {
        return res.status(400).json({
          message:
            "ไม่สามารถลบประเภทงานนี้ได้ เนื่องจากมีช่างที่ใช้ประเภทงานนี้อยู่",
        });
      }

      const deleteQuery = "DELETE FROM technician_type WHERE tt_id = ?";
      db.query(deleteQuery, [id], (err, result) => {
        if (err) {
          console.error("Error deleting technician type:", err);
          return res
            .status(500)
            .json({ message: "เกิดข้อผิดพลาดในการลบประเภทงาน" });
        }
        if (result.affectedRows === 0) {
          return res
            .status(404)
            .json({ message: "ไม่พบประเภทงานที่ต้องการลบ" });
        }
        res.json({ message: "ลบประเภทงานสำเร็จ" });
      });
    });
  });

  // ดึงรายการแจ้งซ่อมที่มอบหมายให้ช่างที่ล็อกอิน
  router.get("/technician/repairs", authMiddleware, (req, res) => {
    const techId = req.user && req.user.us_id;
    console.debug("GET /technician/repairs - requested by user id=", techId);
    if (!techId)
      return res.status(401).json({ message: "ต้องแนบโทเคนที่ถูกต้อง" });

    const query = `
    SELECT
      rf.rf_id,
      rf.rf_code,
      rf.rf_prop_number,
      rf.rf_problem,
      rf.rf_create_at,
      rf.rf_user_status,
      COALESCE(rf.rf_urgency, 'medium') AS rf_urgency,
      u.us_first_name_th AS us_first_name,
      u.us_last_name_th AS us_last_name,
      u.us_department AS department_name,
      tt.tt_name,
      b.bd_name AS building_name,
      f.fl_name AS floor_name,
      r.room_name AS room_name
    FROM repair_form rf
    JOIN repair_assignment ra ON rf.rf_id = ra.ra_rf_id  -- เพิ่มบรรทัดนี้: เชื่อมตารางมอบหมายงาน
    LEFT JOIN user u ON rf.rf_us_id = u.us_id
    LEFT JOIN technician_type tt ON rf.rf_tt_id = tt.tt_id
    LEFT JOIN room r ON rf.rf_room_id = r.room_id
    LEFT JOIN floor f ON r.room_fl_id = f.fl_id
    LEFT JOIN building b ON f.fl_bd_id = b.bd_id
    WHERE ra.ra_us_id = ?  -- แก้ไขบรรทัดนี้: เช็ค ID ช่างจากตาราง assignment แทน
    ORDER BY rf.rf_create_at DESC
    `;

    db.query(query, [techId], (err, results) => {
      if (err) {
        console.error("Error fetching technician repairs:", err);
        return res.status(500).json({
          message: "ดึงข้อมูลรายการแจ้งซ่อมของช่างไม่สำเร็จ",
          error: err.message,
        });
      }
      res.json(results);
    });
  });

  // ดึงประวัติใบงานที่เสร็จสิ้น
  router.get("/technician/history", authMiddleware, (req, res) => {
    const techId = req.user && req.user.us_id;
    console.debug("GET /technician/history - requested by user id=", techId);
    if (!techId)
      return res.status(401).json({ message: "ต้องแนบโทเคนที่ถูกต้อง" });

    const query = `
      SELECT
        rf.rf_id,
        rf.rf_code,
        rf.rf_prop_number,
        rf.rf_problem,
        rf.rf_create_at,
        rf.rf_user_status,
        COALESCE(rf.rf_urgency, 'medium') AS rf_urgency,
        u.us_first_name_th AS us_first_name,
        u.us_last_name_th AS us_last_name,
        u.us_department AS department_name,
        tt.tt_name,
        tech.us_first_name_th AS tech_first_name,
        tech.us_last_name_th AS tech_last_name,
        ra.ra_us_id AS assigned_tech_id,
        b.bd_name AS building_name,
        f.fl_name AS floor_name,
        r.room_name AS room_name
      FROM repair_form rf
      JOIN repair_assignment ra ON rf.rf_id = ra.ra_rf_id
      LEFT JOIN user u ON rf.rf_us_id = u.us_id
      LEFT JOIN technician_type tt ON rf.rf_tt_id = tt.tt_id
      LEFT JOIN user tech ON ra.ra_us_id = tech.us_id
      LEFT JOIN room r ON rf.rf_room_id = r.room_id
      LEFT JOIN floor f ON r.room_fl_id = f.fl_id
      LEFT JOIN building b ON f.fl_bd_id = b.bd_id
      WHERE ra.ra_us_id = ?
        AND (rf.rf_user_status = 'done')
      ORDER BY rf.rf_create_at DESC
    `;

    db.query(query, [techId], (err, results) => {
      if (err) {
        console.error("Error fetching technician completed history:", err);
        return res
          .status(500)
          .json({ message: "ดึงประวัติใบงานไม่สำเร็จ", error: err.message });
      }
      res.json(results);
    });
  });

  // ดึงรายการใบเบิกของผู้ใช้งานที่ล็อกอิน)
  router.get("/technician/my-stock-forms", authMiddleware, (req, res) => {
    const techId = req.user && req.user.us_id;
    console.debug(
      "GET /technician/my-stock-forms - requested by user id=",
      techId
    );
    if (!techId)
      return res.status(401).json({ message: "ต้องแนบโทเคนที่ถูกต้อง" });

    const query = `
    SELECT
      sf.sf_id,
      sf.sf_code,
      sf.sf_create_at,
      sf.sf_update_at,
      sf.sf_urgency,
      sf.sf_status,
      sf.sf_us_id,
      sf.sf_rf_id,
      rf.rf_code AS related_rf_code,
      b.bd_name AS building_name,
      f.fl_name AS floor_name,
      r.room_name AS room_name
    FROM stock_form sf
    LEFT JOIN repair_form rf ON sf.sf_rf_id = rf.rf_id
    LEFT JOIN room r ON rf.rf_room_id = r.room_id
    LEFT JOIN floor f ON r.room_fl_id = f.fl_id
    LEFT JOIN building b ON f.fl_bd_id = b.bd_id
    WHERE sf.sf_us_id = ?
    ORDER BY sf.sf_create_at DESC
    `;

    db.query(query, [techId], (err, results) => {
      if (err) {
        console.error("Error fetching my stock forms:", err);
        return res.status(500).json({
          message: "ดึงข้อมูลใบเบิกของผู้ใช้ไม่สำเร็จ",
          error: err.message,
        });
      }
      res.json(results);
    });
  });

  // อัปเดตสถานะงาน (done, outsource)
  router.put("/technician/close-job/:rf_code", authMiddleware, (req, res) => {
    const techId = req.user?.us_id;
    const { rf_code } = req.params;
    const { status, tech_summary, tech_image_after } = req.body;

    if (!techId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // ตรวจสอบว่าเป็นสถานะที่อนุญาต (default เป็น done ถ้าไม่ส่งมา)
    const targetStatus = status || 'done';
    const allowedStatuses = ['done', 'outsource'];
    if (!allowedStatuses.includes(targetStatus)) {
      return res.status(400).json({ message: "สถานะไม่ถูกต้อง" });
    }

    let updateFields = '';
    let queryParams = [];

    if (targetStatus === 'done') {
      updateFields = `
        rf.rf_user_status = 'done',
        rf.rf_done_at = NOW(),
        rf.rf_tech_summary = ?,
        rf.rf_tech_image_after = ?`;
      queryParams = [tech_summary || null, tech_image_after || null, rf_code, techId];
    } else if (targetStatus === 'outsource') {
      updateFields = `rf.rf_user_status = 'outsource'`;
      queryParams = [rf_code, techId];
    }

    const query = `
      UPDATE repair_form rf
      JOIN repair_assignment ra ON rf.rf_id = ra.ra_rf_id
      SET ${updateFields}
      WHERE
        rf.rf_code = ?
        AND ra.ra_us_id = ?
        AND rf.rf_user_status IN ('in_progress', 'outsource')
    `;

    db.query(query, queryParams, (err, result) => {
      if (err) {
        console.error("❌ Update job status error:", err);
        return res.status(500).json({ message: "อัปเดตสถานะไม่สำเร็จ" });
      }

      if (result.affectedRows === 0) {
        return res.status(400).json({
          message: "ไม่พบงาน หรือสถานะไม่อยู่ในขั้นกำลังดำเนินการ",
        });
      }

      const successMessages = {
        done: "ปิดงานสำเร็จ",
        outsource: "ส่งงานให้ช่างภายนอกสำเร็จ"
      };

      res.json({ message: successMessages[targetStatus] });
    });
  });

  /**
   * POST /withdraw
   * Payload: { repair_code?: string, note?: string, items: [{ id: number, qty: number }] }
   * Creates a stock withdrawal form and decrements product quantities
   */
  router.post("/withdraw", authMiddleware, async (req, res) => {
    const { repair_code, note, items } = req.body || {};

    // Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "ไม่มีรายการสินค้าในตะกร้า" });
    }

    // Validate each item
    for (const item of items) {
      if (!item.id || !item.qty || Number(item.qty) <= 0) {
        return res
          .status(400)
          .json({ message: "รูปแบบข้อมูลรายการสินค้าไม่ถูกต้อง" });
      }
    }

    // Helper: Promisify database query
    const query = (sql, params) => {
      return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };

    // Helper: Begin transaction
    const beginTransaction = () => {
      return new Promise((resolve, reject) => {
        db.beginTransaction((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    };

    // Helper: Commit transaction
    const commit = () => {
      return new Promise((resolve, reject) => {
        db.commit((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    };

    // Helper: Rollback transaction
    const rollback = () => {
      return new Promise((resolve) => {
        db.rollback(() => resolve());
      });
    };

    try {
      await beginTransaction();

      const userId = req.user?.us_id || null;
      let repairFormId = null;

      // Lookup repair form ID if repair_code provided
      if (repair_code) {
        const repairRows = await query(
          "SELECT rf_id FROM repair_form WHERE rf_code = ? LIMIT 1",
          [repair_code]
        );
        if (repairRows.length > 0) {
          repairFormId = repairRows[0].rf_id;
        } else {
          console.warn(`Repair code not found: ${repair_code}`);
        }
      }
      // เตรียมตัวแปรวันปัจจุบัน
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      // นับจำนวนใบเบิกของวันนี้ เพื่อรันรหัส
      const countRows = await query(
        "SELECT COUNT(*) AS count FROM stock_form WHERE DATE(sf_create_at) = ?",
        [today]
      );

      const todayCount = countRows[0].count + 1;
      const datePart = today.replace(/-/g, ""); // YYYYMMDD
      const runningNumber = String(todayCount).padStart(3, "0");

      // Generate unique stock form code
      const sfCode = `SF${datePart}${runningNumber}`;
      const sfStatus = "waiting";

      console.log("Creating stock form:", {
        sfCode,
        sfStatus,
        userId,
        repairFormId,
      });

      // Create stock form header
      const headerResult = await query(
        `INSERT INTO stock_form
       (sf_code, sf_create_at, sf_status, sf_us_id, sf_rf_id, sf_update_at)
       VALUES (?, NOW(), ?, ?, ?, NULL)`,
        [sfCode, sfStatus, userId, repairFormId]
      );

      const sfId = headerResult.insertId;
      console.log("Stock form created:", { sfId, sfCode });

      // Process each item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const requestedQty = Number(item.qty);

        console.log(`Processing item ${i + 1}/${items.length}:`, {
          pd_id: item.id,
          qty: requestedQty,
        });

        // Check product stock (with row lock)
        const productRows = await query(
          "SELECT pd_id, pd_name, pd_quantity FROM products WHERE pd_id = ? FOR UPDATE",
          [item.id]
        );

        if (productRows.length === 0) {
          throw new Error(`ไม่พบสินค้า id=${item.id}`);
        }

        const product = productRows[0];
        const currentQty = Number(product.pd_quantity || 0);

        console.log("Stock check:", {
          pd_id: product.pd_id,
          pd_name: product.pd_name,
          currentQty,
          requestedQty,
        });

        // Validate sufficient stock
        if (currentQty < requestedQty) {
          throw new Error(
            `จำนวนสินค้าไม่เพียงพอสำหรับ ${product.pd_name} (มี ${currentQty} ต้องการ ${requestedQty})`
          );
        }

        // Decrement product quantity
        await query(
          "UPDATE products SET pd_quantity = pd_quantity - ? WHERE pd_id = ?",
          [requestedQty, item.id]
        );
        console.log(`Stock decremented: pd_id=${item.id}, qty=${requestedQty}`);

        // Insert stock form detail
        await query(
          "INSERT INTO stock_form_detail (sfd_sf_id, sfd_pd_id, sfd_qty) VALUES (?, ?, ?)",
          [sfId, item.id, requestedQty]
        );
        console.log(
          `Form detail inserted: sfd_sf_id=${sfId}, sfd_pd_id=${item.id}`
        );

        // Record stock transaction
        await query(
          `INSERT INTO stock_transactions
         (stt_product_id, stt_user_id, stt_type, stt_quantity, stt_created_at, stt_ref_sf_id)
         VALUES (?, ?, 'OUT', ?, NOW(), ?)`,
          [item.id, userId, requestedQty, sfId]
        );
        console.log(`Stock transaction recorded: pd_id=${item.id}, type=OUT`);
      }

      // Commit transaction
      await commit();
      console.log("Withdraw committed successfully:", {
        sfId,
        sfCode,
        userId,
        itemCount: items.length,
      });

      return res.status(201).json({
        message: "เบิกสินค้าเรียบร้อย",
        sf_id: sfId,
        sf_code: sfCode,
      });
    } catch (error) {
      await rollback();
      console.error("WITHDRAW ERROR:", error);

      // Determine appropriate error response
      const errorMessage = error.message || "เกิดข้อผิดพลาดในการเบิกสินค้า";
      let statusCode = 500;

      if (errorMessage.includes("ไม่พบสินค้า")) {
        statusCode = 404;
      } else if (errorMessage.includes("ไม่เพียงพอ")) {
        statusCode = 400;
      }

      return res.status(statusCode).json({
        message: errorMessage,
        error: error.message,
      });
    }
  });

  return router;
};
