const express = require("express");
const { authMiddleware } = require("../auth");

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
      tech.us_first_name_th AS tech_first_name,
      tech.us_last_name_th AS tech_last_name,
      rf.rf_assigned_tech_id AS assigned_tech_id,
      b.bd_name AS building_name,
      f.fl_name AS floor_name,
      r.room_name AS room_name
    FROM repair_form rf
    LEFT JOIN user u ON rf.rf_us_id = u.us_id
    LEFT JOIN technician_type tt ON rf.rf_tt_id = tt.tt_id
    LEFT JOIN user tech ON rf.rf_assigned_tech_id = tech.us_id
    LEFT JOIN room r ON rf.rf_room_id = r.room_id
    LEFT JOIN floor f ON r.room_fl_id = f.fl_id
    LEFT JOIN building b ON f.fl_bd_id = b.bd_id
    WHERE rf.rf_assigned_tech_id = ?
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

  return router;
};
