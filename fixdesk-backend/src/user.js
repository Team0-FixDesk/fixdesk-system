const express = require("express");
const { authMiddleware } = require("../auth.middleware");
const bcrypt = require("bcrypt");

module.exports = function UserRoutes(db) {
  const router = express.Router();

  // เรียกบัญชีผู้ใช้แบบทั้งหมด
  router.get("/users", authMiddleware, (req, res) => {
    const query = `
    SELECT
      u.us_id,
      u.us_user_name,
      u.us_ttn_id,
      tn.ttn_title_th AS title_name,
      u.us_first_name_th,
      u.us_last_name_th,
      u.us_first_name_en,
      u.us_last_name_en,
      u.us_phone,
      u.us_department,
      u.us_role_id,
      r.role_name,
      u.us_tt_id,
      t.tt_name AS technician_type,
      CONCAT(tn.ttn_title_th, '', u.us_first_name_th, ' ', u.us_last_name_th) AS full_name,
      -- จำนวนใบแจ้งซ่อมที่ผู้ใช้เป็นผู้แจ้ง
      (SELECT COUNT(*) FROM repair_form rf WHERE rf.rf_us_id = u.us_id) AS repair_count,
      -- จำนวน assignment ที่ผู้ใช้เป็นผู้รับ (ช่าง)
      (SELECT COUNT(*) FROM repair_assignment ra WHERE ra.ra_us_id = u.us_id) AS assignment_count,
      -- flag ว่ามีการใช้งานเกี่ยวข้องหรือไม่ (ใช้ใน frontend เพื่อ disable ปุ่มลบ)
      CASE WHEN
        (SELECT COUNT(*) FROM repair_form rf WHERE rf.rf_us_id = u.us_id) +
        (SELECT COUNT(*) FROM repair_assignment ra WHERE ra.ra_us_id = u.us_id) > 0
      THEN 1 ELSE 0 END AS has_repairs
    FROM user u
    LEFT JOIN role r ON u.us_role_id = r.role_id
    LEFT JOIN technician_type t ON u.us_tt_id = t.tt_id
    LEFT JOIN title_name tn ON u.us_ttn_id = tn.ttn_id
    ORDER BY u.us_id ASC
  `;

    db.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching users:", err);
        return res.status(500).json({
          message: "ดึงข้อมูลผู้ใช้ไม่สำเร็จ",
          error: err.message,
        });
      }
      res.json(results);
    });
  });

  // ดึงคำนำหน้าชื่อทั้งหมด
  router.get("/titles", authMiddleware, (req, res) => {
    const sql = `
    SELECT 
      ttn_id,
      ttn_title_th AS ttn_name_th  -- alias ให้ตรงกับที่ frontend ใช้
    FROM title_name
    ORDER BY ttn_id ASC
    `;

    db.query(sql, (err, results) => {
      if (err) {
        console.error("Error fetching titles:", err);
        return res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลคำนำหน้า" });
      }
      res.json(results);
    });
  });

  // ดึงบทบาทผู้ใช้ทั้งหมด
  router.get("/roles", authMiddleware, (req, res) => {
    const sql = `
    SELECT 
      role_id,
      role_name,
      role_name AS role_label_th
    FROM role
    ORDER BY role_id ASC
    `;

    db.query(sql, (err, results) => {
      if (err) {
        console.error("Error fetching roles:", err);
        return res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลบทบาท" });
      }
      res.json(results);
    });
  });

  // เรียกบัญชีผู้ใช้แบบตาม id หรือรายบุคคล
  router.get("/users/:id", authMiddleware, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ message: "id ไม่ถูกต้อง" });

    const query = `
      SELECT
        u.us_id,
        u.us_user_name,
        u.us_ttn_id,
        u.us_first_name_th,
        u.us_last_name_th,
        u.us_first_name_en,
        u.us_last_name_en,
        u.us_phone,
        u.us_department,
        u.us_role_id,
        u.us_tt_id,
        r.role_name,
        t.tt_name AS technician_type,
        tn.ttn_title_th AS title_name
      FROM user u
      LEFT JOIN role r ON u.us_role_id = r.role_id
      LEFT JOIN technician_type t ON u.us_tt_id = t.tt_id
      LEFT JOIN title_name tn ON u.us_ttn_id = tn.ttn_id
      WHERE u.us_id = ?
      LIMIT 1
      `;

    db.query(query, [id], (err, results) => {
      if (err)
        return res
          .status(500)
          .json({ message: "ดึงข้อมูลผู้ใช้ไม่สำเร็จ", error: err.message });
      if (!results.length)
        return res.status(404).json({ message: "ไม่พบข้อมูลผู้ใช้" });
      res.json(results[0]);
    });
  });

  // เพิ่มบัญชีผู้ใช้
  router.post("/users", async (req, res) => {
    const {
      us_user_name,
      us_user_pass,
      us_ttn_id,
      us_first_name_th,
      us_last_name_th,
      us_first_name_en,
      us_last_name_en,
      us_phone,
      us_department,
      us_role_id,
      us_tt_id,
    } = req.body;
    if (
      !us_user_name ||
      !us_user_pass ||
      !us_first_name_th ||
      !us_last_name_th ||
      !us_role_id
    )
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบ" });
    // ตรวจชื่อนามสกุลยต้องเป็นภาษาไทย
    if (!/^[ก-๙\s]+$/.test(us_first_name_th)) {
      return res
        .status(400)
        .json({ message: "ชื่อ (ไทย) ต้องเป็นภาษาไทยเท่านั้น" });
    }
    if (!/^[ก-๙\s]+$/.test(us_last_name_th)) {
      return res
        .status(400)
        .json({ message: "นามสกุล (ไทย) ต้องเป็นภาษาไทยเท่านั้น" });
    }
    // ตรวจชื่อนามสกุลยต้องเป็นภาษาอังกฤษ
    if (us_first_name_en && !/^[A-Za-z\s]+$/.test(us_first_name_en)) {
      return res
        .status(400)
        .json({ message: "ชื่อ (EN) ต้องเป็นภาษาอังกฤษเท่านั้น" });
    }
    if (us_last_name_en && !/^[A-Za-z\s]+$/.test(us_last_name_en)) {
      return res
        .status(400)
        .json({ message: "นามสกุล (EN) ต้องเป็นภาษาอังกฤษเท่านั้น" });
    }
    // เบอร์โทร: ต้องเป็นตัวเลข 9-10 หลัก
    if (us_phone && !/^[0-9]{9,10}$/.test(us_phone)) {
      return res
        .status(400)
        .json({ message: "เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก" });
    }
    try {
      const hashedPassword = await bcrypt.hash(us_user_pass, 10);
      const query = `
        INSERT INTO user (
          us_user_name, us_user_pass, us_ttn_id,
          us_first_name_th, us_last_name_th,
          us_first_name_en, us_last_name_en,
          us_phone, us_department,
          us_role_id, us_tt_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

      const params = [
        us_user_name,
        hashedPassword,
        us_ttn_id || null,
        us_first_name_th,
        us_last_name_th,
        us_first_name_en || null,
        us_last_name_en || null,
        us_phone || null,
        us_department || null,
        us_role_id,
        us_tt_id || null,
      ];

      db.query(query, params, (err, result) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY")
            return res.status(409).json({ message: "ชื่อผู้ใช้ซ้ำในระบบ" });
          return res
            .status(500)
            .json({ message: "เพิ่มผู้ใช้ไม่สำเร็จ", error: err.message });
        }
        res.status(201).json({ created: 1, us_id: result.insertId });
      });
    } catch (err) {
      res.status(500).json({
        message: "เกิดข้อผิดพลาดในการเข้ารหัสรหัสผ่าน",
        error: err.message,
      });
    }
  });

  // แก้ไขข้อมูลบัญชีผู้ใช้
  router.put("/users/:id", authMiddleware, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ message: "id ไม่ถูกต้อง" });

    const {
      us_ttn_id,
      us_first_name_th,
      us_last_name_th,
      us_first_name_en,
      us_last_name_en,
      us_phone,
      us_department,
      us_role_id,
      us_tt_id,
    } = req.body;

    const query = `
      UPDATE user
      SET
        us_ttn_id=?, us_first_name_th=?, us_last_name_th=?,
        us_first_name_en=?, us_last_name_en=?,
        us_phone=?, us_department=?, us_role_id=?, us_tt_id=?
      WHERE us_id=?`;

    const params = [
      us_ttn_id || null,
      us_first_name_th,
      us_last_name_th,
      us_first_name_en || null,
      us_last_name_en || null,
      us_phone || null,
      us_department || null,
      us_role_id,
      us_tt_id || null,
      id,
    ];
    db.query(query, params, (err, result) => {
      if (err)
        return res
          .status(500)
          .json({ message: "อัปเดตไม่สำเร็จ", error: err.message });
      res.json({ updated: result.affectedRows });
    });
  });

  // ----------------------------------------------------------------------
  // [จุดแก้ไข] ลบบัญชีผู้ใช้อิง id
  // ----------------------------------------------------------------------
  router.delete("/users/:id", authMiddleware, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ message: "id ไม่ถูกต้อง" });

    // แก้ SQL: เช็คว่าเป็น "ผู้แจ้ง" (rf_us_id) หรือ "ช่างที่รับงาน" (ra_us_id ใน repair_assignment)
    const checkSql = `
      SELECT 
        (SELECT COUNT(*) FROM repair_form WHERE rf_us_id = ?) + 
        (SELECT COUNT(*) FROM repair_assignment WHERE ra_us_id = ?) 
      AS count
    `;

    db.query(checkSql, [id, id], (err, results) => {
      if (err) {
        console.error("Error checking user usage:", err);
        return res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
      }

      const usedCount = results[0].count || 0;
      if (usedCount > 0) {
        // กันการลบถ้ามีฟอร์มอยู่ในระบบ
        return res.status(400).json({
          message:
            "ไม่สามารถลบบัญชีผู้ใช้นี้ได้ เนื่องจากมีใบแจ้งซ่อมหรือการมอบหมายงานที่เชื่อมโยงอยู่ในระบบ",
        });
      }

      // ถ้าไม่ถูกใช้งานที่ไหน ค่อยลบจริง
      db.query("DELETE FROM user WHERE us_id = ?", [id], (err2, result) => {
        if (err2) {
          console.error("Error deleting user:", err2);
          return res
            .status(500)
            .json({ message: "ลบไม่สำเร็จ", error: err2.message });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "ไม่พบผู้ใช้ที่ต้องการลบ" });
        }
        res.json({ deleted: result.affectedRows });
      });
    });
  });
  // ----------------------------------------------------------------------

  // แก้ไขข้อมูลผู้ใช้ (ส่วนตัว)
  router.put("/edit-personal/:id", async (req, res) => {
    const { id } = req.params;
    const {
      us_ttn_id,
      us_department,
      us_phone,
      us_first_name_th,
      us_last_name_th,
      us_first_name_en,
      us_last_name_en,
      us_user_name,
      oldPassword,
      password,
    } = req.body;
    // ตรวจฟิลด์สำคัญ
    if (!us_ttn_id || !us_first_name_th || !us_last_name_th || !us_phone) {
      return res.status(400).json({
        message: "ข้อมูลไม่ครบ กรุณากรอกให้ครบทุกช่อง",
      });
    }
    try {
      // 1) ดึงข้อมูลเดิมจาก DB
      const [user] = await db
        .promise()
        .query("SELECT us_user_pass FROM user WHERE us_id = ?", [id]);
      if (!user.length) {
        return res.status(404).json({ message: "ไม่พบผู้ใช้นี้" });
      }
      // 2) ตรวจสอบรหัสผ่านเดิม **บังคับทุกครั้ง**
      if (!oldPassword) {
        return res.status(400).json({
          message: "กรุณากรอกรหัสผ่านเดิมเพื่อบันทึกข้อมูล",
        });
      }
      const isMatch = await bcrypt.compare(oldPassword, user[0].us_user_pass);
      if (!isMatch) {
        return res.status(400).json({
          message: "รหัสผ่านเดิมไม่ถูกต้อง",
        });
      }
      // เก็บรหัสผ่านใหม่ หรือใช้รหัสเดิม
      let newPassword = user[0].us_user_pass;
      if (password) {
        newPassword = await bcrypt.hash(password, 10);
      }
      // 3) อัปเดตข้อมูล
      const sql = `
      UPDATE user SET 
        us_ttn_id = ?,
        us_department = ?,
        us_phone = ?,
        us_first_name_th = ?,
        us_last_name_th = ?,
        us_first_name_en = ?,
        us_last_name_en = ?,
        us_user_name = ?,
        us_user_pass = ?
      WHERE us_id = ?
      `;

      const params = [
        us_ttn_id,
        us_department || null,
        us_phone || null,
        us_first_name_th,
        us_last_name_th,
        us_first_name_en || null,
        us_last_name_en || null,
        us_user_name,
        newPassword,
        id,
      ];

      const [result] = await db.promise().query(sql, params);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "ไม่พบผู้ใช้" });
      }
      res.json({
        message: "อัปเดตข้อมูลส่วนตัวสำเร็จ",
        updated: result.affectedRows,
      });
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({
        message: "อัปเดตข้อมูลไม่สำเร็จ",
        error: err.message,
      });
    }
  });

  // ดึงข้อมูลที่แก้ไขไปแล้ว
  router.get("/user/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const [rows] = await db
        .promise()
        .query(
          "SELECT us_id, us_ttn_id, us_department, us_phone, us_first_name_th, us_last_name_th, us_first_name_en, us_last_name_en, us_user_name FROM user WHERE us_id = ?",
          [id]
        );
      if (!rows.length) {
        return res.status(404).json({ message: "ไม่พบผู้ใช้" });
      }
      res.json(rows[0]);
    } catch (err) {
      console.error("Error GET /user/:id :", err);
      res.status(500).json({
        message: "ดึงข้อมูลผู้ใช้ล้มเหลว",
        error: err.message,
      });
    }
  });

  return router;
};
