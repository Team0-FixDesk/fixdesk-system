const express = require("express");
const { authMiddleware } = require("../auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

module.exports = function RepairFormRoutes(db) {
  const router = express.Router();

  // --- ส่วน Upload File (เหมือนเดิม ไม่ต้องแก้) ---
  const repairUploadPath = path.join(__dirname, "..", "uploads", "repair");
  if (!fs.existsSync(repairUploadPath)) {
    fs.mkdirSync(repairUploadPath, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, callback) => {
      callback(null, repairUploadPath);
    },
    filename: (req, file, callback) => {
      const dateTimeStamp = new Date()
        .toISOString()
        .replace(/[:.-]/g, "")
        .slice(0, 15);
      const randomSuffix = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");
      const fileExtension = path.extname(file.originalname);
      const filename = `RF_${dateTimeStamp}_${randomSuffix}${fileExtension}`;
      callback(null, filename);
    },
  });

  const fileFilter = (req, file, callback) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|avi|mov|wmv/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return callback(null, true);
    } else {
      callback(
        new Error(
          "กรุณาอัพโหลดไฟล์รูปภาพหรือวิดีโอเท่านั้น (jpg, png, gif, webp, mp4, avi, mov, wmv)"
        )
      );
    }
  };

  const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024, files: 5 },
    fileFilter: fileFilter,
  });

  router.post("/upload-repair-files", upload.array("files", 5), (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "กรุณาเลือกไฟล์สำหรับอัพโหลด" });
      }
      const filePaths = req.files.map(
        (file) => `/uploads/repair/${file.filename}`
      );
      res.json({
        message: "อัพโหลดไฟล์สำเร็จ",
        files: req.files.map((file) => ({
          filename: file.filename,
          originalname: file.originalname,
          path: `/uploads/repair/${file.filename}`,
          size: file.size,
          mimetype: file.mimetype,
        })),
        filePaths: filePaths,
      });
    } catch (error) {
      console.error("Error uploading files:", error);
      res
        .status(500)
        .json({ message: "อัพโหลดไฟล์ไม่สำเร็จ", error: error.message });
    }
  });

  router.delete("/delete-file/:filename", (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(repairUploadPath, filename);
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting file:", err);
        return res.status(500).json({ message: "ลบไฟล์ไม่สำเร็จ" });
      }
      res.json({ message: "ลบไฟล์สำเร็จ" });
    });
  });

  // --- จบส่วน Upload ---

  // สร้างใบแจ้งซ่อมพร้อมอัพโหลดไฟล์
  router.post(
    "/repair-requests-with-files",
    upload.array("files", 5),
    (req, res) => {
      const {
        us_id,
        repair_type_id,
        room_id,
        asset_code,
        problem_detail,
        issue_description,
        urgency,
        phone_number,
      } = req.body;
      if (!us_id || !repair_type_id || !room_id || !problem_detail) {
        return res
          .status(400)
          .json({ message: "ข้อมูลไม่ครบ กรุณากรอกให้ครบทุกช่อง" });
      }

      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const countQuery = `
        SELECT COUNT(*) AS count FROM repair_form
        WHERE DATE(rf_create_at) = CURDATE()`;
      db.query(countQuery, (err, results) => {
        if (err) {
          console.error("Error counting repairs:", err);
          return res
            .status(500)
            .json({ message: "ไม่สามารถสร้างรหัสฟอร์มได้" });
        }

        const todayCount = results[0].count + 1;
        const runningNumber = String(todayCount).padStart(3, "0");
        const rfCode = `RF${datePart}${runningNumber}`;
        const filePaths = req.files
          ? req.files.map((file) => `/uploads/repair/${file.filename}`)
          : [];
        const imageData =
          filePaths.length > 0 ? JSON.stringify(filePaths) : null;

        const insertQuery = `
          INSERT INTO repair_form
            (rf_code, rf_us_id, rf_tt_id, rf_room_id, rf_prop_number,
            rf_problem, rf_detail, rf_phone, rf_urgency, rf_image,
            rf_user_status, rf_create_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
          `;

        db.query(
          insertQuery,
          [
            rfCode,
            us_id,
            repair_type_id,
            room_id,
            asset_code,
            problem_detail,
            issue_description,
            phone_number,
            urgency,
            imageData,
          ],
          (err2, results2) => {
            if (err2) {
              console.error("Error saving repair form:", err2);
              return res.status(500).json({ message: "บันทึกข้อมูลไม่สำเร็จ" });
            }
            res.json({
              message: "บันทึกฟอร์มแจ้งซ่อมสำเร็จ",
              id: results2.insertId,
              rf_code: rfCode,
              uploaded_files: req.files
                ? req.files.map((file) => ({
                    filename: file.filename,
                    originalname: file.originalname,
                    path: `/uploads/repair/${file.filename}`,
                    size: file.size,
                  }))
                : [],
            });
          }
        );
      });
    }
  );

  // อัพเดตใบแจ้งซ่อมพร้อมไฟล์
  router.put(
    "/repair-requests-with-files/:code",
    upload.array("files", 5),
    (req, res) => {
      const { code } = req.params;
      const {
        us_id,
        repair_type_id,
        room_id,
        asset_code,
        problem_detail,
        issue_description,
        urgency,
        phone_number,
        existing_files,
      } = req.body;
      if (!repair_type_id || !room_id || !problem_detail) {
        return res
          .status(400)
          .json({ message: "ข้อมูลไม่ครบ กรุณากรอกให้ครบทุกช่อง" });
      }

      const existingFilePaths = existing_files
        ? JSON.parse(existing_files)
        : [];
      const newFilePaths = req.files
        ? req.files.map((file) => `/uploads/repair/${file.filename}`)
        : [];
      const allFilePaths = [...existingFilePaths, ...newFilePaths];
      const imageData =
        allFilePaths.length > 0 ? JSON.stringify(allFilePaths) : null;

      const sql = `UPDATE repair_form SET
        rf_us_id = ?,
        rf_tt_id = ?,
        rf_room_id = ?,
        rf_prop_number = ?,
        rf_problem = ?,
        rf_detail = ?,
        rf_phone = ?,
        rf_urgency = ?,
        rf_image = ?,
        rf_update_at = NOW()
      WHERE rf_code = ?
      `;

      const params = [
        us_id || null,
        repair_type_id,
        room_id,
        asset_code || null,
        problem_detail,
        issue_description || "-",
        phone_number || null,
        urgency || "medium",
        imageData,
        code,
      ];

      db.query(sql, params, (err, result) => {
        if (err) {
          console.error("Database error (update repair with files):", err);
          return res
            .status(500)
            .json({ message: "อัปเดตข้อมูลไม่สำเร็จ", error: err.message });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "ไม่พบใบแจ้งซ่อมนี้" });
        }
        res.json({
          message: "อัปเดตข้อมูลใบแจ้งซ่อมสำเร็จ",
          updated: result.affectedRows,
          new_files: req.files
            ? req.files.map((file) => ({
                filename: file.filename,
                originalname: file.originalname,
                path: `/uploads/repair/${file.filename}`,
                size: file.size,
              }))
            : [],
        });
      });
    }
  );

  // สร้างแบบฟอร์มแจ้งซ่อม (JSON only)
  router.post("/repair-requests", express.json(), (req, res) => {
    const {
      us_id,
      repair_type_id,
      room_id,
      asset_code,
      problem_detail,
      issue_description,
      urgency,
      phone_number,
      file_paths,
    } = req.body;
    if (!us_id || !repair_type_id || !room_id || !problem_detail) {
      return res
        .status(400)
        .json({ message: "ข้อมูลไม่ครบ กรุณากรอกให้ครบทุกช่อง" });
    }

    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const countQuery = `
      SELECT COUNT(*) AS count FROM repair_form
      WHERE DATE(rf_create_at) = CURDATE()
      `;

    db.query(countQuery, (err, results) => {
      if (err) {
        console.error("Error counting repairs:", err);
        return res.status(500).json({ message: "ไม่สามารถสร้างรหัสฟอร์มได้" });
      }

      const todayCount = results[0].count + 1;
      const runningNumber = String(todayCount).padStart(3, "0");
      const rfCode = `RF${datePart}${runningNumber}`;
      const imageData = file_paths ? JSON.stringify(file_paths) : null;

      const insertQuery = `
        INSERT INTO repair_form
        (rf_code, rf_us_id, rf_tt_id, rf_room_id, rf_prop_number,
        rf_problem, rf_detail, rf_phone, rf_urgency, rf_image,
        rf_user_status, rf_create_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
        `;

      db.query(
        insertQuery,
        [
          rfCode,
          us_id,
          repair_type_id,
          room_id,
          asset_code,
          problem_detail,
          issue_description,
          phone_number,
          urgency,
          imageData,
        ],
        (err2, results2) => {
          if (err2) {
            console.error("Error saving repair form:", err2);
            return res.status(500).json({ message: "บันทึกข้อมูลไม่สำเร็จ" });
          }
          res.json({
            message: "บันทึกฟอร์มแจ้งซ่อมสำเร็จ",
            id: results2.insertId,
            rf_code: rfCode,
          });
        }
      );
    });
  });

  router.get("/admin/repairs", authMiddleware, (req, res) => {
    // แก้ SQL: เพิ่ม ra.ra_us_id AS rf_assigned_tech_id เพื่อส่ง ID ช่างกลับไป
    const query = `
      SELECT
        rf.rf_id,
        rf.rf_code,
        rf.rf_create_at,
        rf.rf_user_status,
        COALESCE(rf.rf_urgency, 'medium') AS rf_urgency,
        u.us_first_name_th AS us_first_name,
        u.us_last_name_th AS us_last_name,
        u.us_department AS department_name,
        tt.tt_name,
        tech.us_first_name_th AS tech_first_name,
        tech.us_last_name_th AS tech_last_name,
        ra.ra_us_id AS rf_assigned_tech_id   -- <--- เพิ่มบรรทัดนี้ครับ
      FROM repair_form rf
      LEFT JOIN user u ON rf.rf_us_id = u.us_id
      LEFT JOIN technician_type tt ON rf.rf_tt_id = tt.tt_id
      -- เชื่อมตารางมอบหมายงาน (เอาเฉพาะหัวหน้าทีม)
      LEFT JOIN repair_assignment ra ON rf.rf_id = ra.ra_rf_id AND ra.ra_is_lead = 1
      LEFT JOIN user tech ON ra.ra_us_id = tech.us_id
      ORDER BY rf.rf_create_at DESC
    `;

    db.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching repairs:", err);
        return res.status(500).json({
          message: "ดึงข้อมูลรายการแจ้งซ่อมไม่สำเร็จ",
          error: err.message,
        });
      }
      res.json(results);
    });
  });

  // ดึงรายการแจ้งซ่อมตาม user id (My Repairs) - ไม่ต้องแก้ SQL เพราะดึงแค่ status ไม่ได้ดึงชื่อช่าง
  router.get("/my-repairs/:userId", (req, res) => {
    const { userId } = req.params;
    const query = `
      SELECT
        rf.rf_id,
        rf.rf_code,
        rf.rf_prop_number,
        rf.rf_problem,
        rf.rf_urgency,
        rf.rf_user_status,
        rf.rf_create_at,
        b.bd_name AS building_name,
        u.us_department AS department_name
      FROM repair_form rf
      LEFT JOIN room r ON rf.rf_room_id = r.room_id
      LEFT JOIN floor f ON r.room_fl_id = f.fl_id
      LEFT JOIN building b ON f.fl_bd_id = b.bd_id
      LEFT JOIN user u ON rf.rf_us_id = u.us_id
      WHERE rf.rf_us_id = ?
      ORDER BY rf.rf_create_at DESC
      `;
    db.query(query, [userId], (err, results) => {
      if (err) {
        console.error("Error fetching user repairs:", err);
        return res
          .status(500)
          .json({ message: "ไม่สามารถโหลดข้อมูลรายการแจ้งซ่อมได้" });
      }
      res.json(results);
    });
  });

  router.delete("/my-repairs/:code", authMiddleware, (req, res) => {
    const { code } = req.params;
    console.log("ลบฟอร์ม code =", code);

    const sql = `
      DELETE FROM repair_form
      WHERE rf_code = ?
        AND rf_user_status = 'pending'`;
    db.query(sql, [code], (err, result) => {
      if (err) {
        console.error("ลบข้อมูลไม่สำเร็จ:", err);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
      }
      if (result.affectedRows === 0) {
        return res.status(400).json({
          message:
            "ไม่สามารถลบใบแจ้งซ่อมนี้ได้ เนื่องจากรายการอยู่ระหว่างดำเนินการหรือเสร็จสิ้นแล้ว",
        });
      }
      console.log(`ลบสำเร็จ: ${code}`);
      res.json({ message: "ลบข้อมูลเรียบร้อยแล้ว" });
    });
  });

  router.get("/repair-requests/:code", (req, res) => {
    const { code } = req.params;

    // แก้ SQL: Join repair_assignment เพื่อหาหัวหน้า
    const sql = `
      SELECT
        rf.rf_code,
        rf.rf_problem,
        rf.rf_detail,
        rf.rf_urgency,
        rf.rf_phone,
        rf.rf_create_at,
        rf.rf_in_process_at,
        rf.rf_done_at,
        rf.rf_user_status,
        rf.rf_prop_number,
        rf.rf_image,
  
        -- ประเภทงาน / สถานที่
        t.tt_id AS repair_type_id,
        t.tt_name AS repair_type_name,
        b.bd_id AS building_id,
        b.bd_name AS building_name,
        f.fl_id AS floor_id,
        f.fl_name AS floor_name,
        r.room_id AS room_id,
        r.room_name AS room_name,
  
        -- ผู้แจ้ง
        CONCAT(tn.ttn_title_th, u.us_first_name_th, ' ', u.us_last_name_th) AS reporter_name,
        u.us_phone AS reporter_phone,
        u.us_department AS reporter_department,
  
        -- ผู้รับผิดชอบงานหลัก (หัวหน้าทีม)
        tech.us_id AS main_technician_id,
        CONCAT(tn_tech.ttn_title_th, tech.us_first_name_th, ' ', tech.us_last_name_th) AS main_technician_name,
        tt_tech.tt_name AS main_technician_position
  
      FROM repair_form rf
      LEFT JOIN room r ON rf.rf_room_id = r.room_id
      LEFT JOIN floor f ON r.room_fl_id = f.fl_id
      LEFT JOIN building b ON f.fl_bd_id = b.bd_id
      LEFT JOIN technician_type t ON rf.rf_tt_id = t.tt_id
  
      -- ผู้แจ้ง
      LEFT JOIN user u ON rf.rf_us_id = u.us_id
      LEFT JOIN title_name tn ON u.us_ttn_id = tn.ttn_id
  
      -- เชื่อมตารางมอบหมายงาน (เฉพาะหัวหน้า)
      LEFT JOIN repair_assignment ra ON rf.rf_id = ra.ra_rf_id AND ra.ra_is_lead = 1
      LEFT JOIN user tech ON ra.ra_us_id = tech.us_id
      LEFT JOIN title_name tn_tech ON tech.us_ttn_id = tn_tech.ttn_id
      LEFT JOIN technician_type tt_tech ON tech.us_tt_id = tt_tech.tt_id
  
      WHERE rf.rf_code = ?`;

    db.query(sql, [code], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์", error: err.message });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "ไม่พบใบแจ้งซ่อมนี้" });
      }

      const r = results[0];
      res.json({
        rf_code: r.rf_code,
        rf_detail: r.rf_detail || "-",
        rf_problem: r.rf_problem || "-",
        rf_urgency: r.rf_urgency || "medium",
        rf_user_status: r.rf_user_status || "-",
        rf_phone: r.rf_phone || "-",
        rf_create_at: r.rf_create_at || "-",
        rf_in_process_at: r.rf_in_process_at || null,
        rf_done_at: r.rf_done_at || null,
        rf_prop_number: r.rf_prop_number || "-",
        rf_image: r.rf_image ? JSON.parse(r.rf_image) : null,
        repair_type_id: r.repair_type_id || null,
        repair_type_name: r.repair_type_name || "-",
        building_id: r.building_id || null,
        building_name: r.building_name || "-",
        floor_id: r.floor_id || null,
        floor_name: r.floor_name || "-",
        room_id: r.room_id || null,
        room_name: r.room_name || "-",
        reporter: {
          name: r.reporter_name || "-",
          phone: r.reporter_phone || "-",
          department: r.reporter_department || "-",
        },
        main_technician: r.main_technician_name || "-",
        tech_position: r.main_technician_position || "-",
      });
    });
  });

  router.put("/repair-requests/:code", (req, res) => {
    const { code } = req.params;
    const {
      us_id,
      repair_type_id,
      room_id,
      asset_code,
      problem_detail,
      issue_description,
      urgency,
      phone_number,
      file_paths,
    } = req.body;
    if (!repair_type_id || !room_id || !problem_detail) {
      return res
        .status(400)
        .json({ message: "ข้อมูลไม่ครบ กรุณากรอกให้ครบทุกช่อง" });
    }
    const imageData = file_paths ? JSON.stringify(file_paths) : null;

    const sql = `
    UPDATE repair_form
    SET 
      rf_us_id = ?,
      rf_tt_id = ?,
      rf_room_id = ?,
      rf_prop_number = ?,
      rf_problem = ?,
      rf_detail = ?,
      rf_phone = ?,
      rf_urgency = ?,
      rf_image = ?,
      rf_update_at = NOW()
    WHERE rf_code = ?
      AND rf_user_status = 'pending'
    `;

    const params = [
      us_id || null,
      repair_type_id,
      room_id,
      asset_code || null,
      problem_detail,
      issue_description || "-",
      phone_number || null,
      urgency || "medium",
      imageData,
      code,
    ];

    db.query(sql, params, (err, result) => {
      if (err) {
        console.error("Database error (update repair):", err);
        return res
          .status(500)
          .json({ message: "อัปเดตข้อมูลไม่สำเร็จ", error: err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "ไม่พบใบแจ้งซ่อมนี้" });
      }
      res.json({
        message: "อัปเดตข้อมูลใบแจ้งซ่อมสำเร็จ",
        updated: result.affectedRows,
      });
    });
  });

  // --- ปรับ /assign-repair (มอบหมายช่างเดี่ยว) ---
  router.post("/assign-repair", authMiddleware, (req, res) => {
    const { rf_code, technician_id, is_lead } = req.body;
    if (!rf_code || !technician_id) {
      return res.status(400).json({
        message: "ข้อมูลไม่ครบถ้วน (rf_code และ technician_id จำเป็นต้องมี)",
      });
    }

    const techId = Number(technician_id);
    if (!Number.isFinite(techId)) {
      return res.status(400).json({ message: "technician_id ต้องเป็นตัวเลข" });
    }

    // 1) ตรวจสอบว่า user ที่ส่งมาเป็นช่างจริง (role = 2)
    db.query(
      "SELECT us_id, us_role_id FROM user WHERE us_id = ?",
      [techId],
      (uErr, uRes) => {
        if (uErr) {
          console.error("Error checking technician:", uErr);
          return res
            .status(500)
            .json({ message: "ตรวจสอบข้อมูลช่างล้มเหลว", error: uErr.message });
        }
        if (!uRes || uRes.length === 0) {
          return res.status(404).json({ message: "ไม่พบช่างที่เลือก" });
        }
        if (Number(uRes[0].us_role_id) !== 2) {
          return res.status(400).json({ message: "ผู้ใช้นี้ไม่ใช่ช่าง" });
        }

        // 2) หา rf_id จาก rf_code
        db.query(
          "SELECT rf_id FROM repair_form WHERE rf_code = ?",
          [rf_code],
          (rfErr, rfRes) => {
            if (rfErr) {
              console.error("Error finding repair:", rfErr);
              return res.status(500).json({
                message: "ค้นหาใบแจ้งซ่อมล้มเหลว",
                error: rfErr.message,
              });
            }
            if (!rfRes || rfRes.length === 0) {
              return res.status(404).json({ message: "ไม่พบใบแจ้งซ่อม" });
            }
            const rfId = rfRes[0].rf_id;

            // 3) ตรวจสอบว่าช่างนี้ถูกมอบหมายไปแล้วหรือยัง
            db.query(
              "SELECT ra_id FROM repair_assignment WHERE ra_rf_id = ? AND ra_us_id = ?",
              [rfId, techId],
              (existErr, existRes) => {
                if (existErr) {
                  console.error(
                    "Error checking existing assignment:",
                    existErr
                  );
                  return res.status(500).json({
                    message: "ตรวจสอบการมอบหมายล้มเหลว",
                    error: existErr.message,
                  });
                }

                if (existRes && existRes.length > 0) {
                  // ถ้ามีอยู่แล้ว — แต่ถ้า is_lead = true ให้เปลี่ยน flag เป็น lead
                  if (is_lead) {
                    // set all to 0, then set this to 1
                    db.query(
                      "UPDATE repair_assignment SET ra_is_lead = 0 WHERE ra_rf_id = ?",
                      [rfId],
                      (clearErr) => {
                        if (clearErr) {
                          console.error("Error clearing lead flags:", clearErr);
                          return res.status(500).json({
                            message: "ตั้งค่าสถานะหัวหน้าไม่สำเร็จ",
                            error: clearErr.message,
                          });
                        }
                        db.query(
                          "UPDATE repair_assignment SET ra_is_lead = 1 WHERE ra_rf_id = ? AND ra_us_id = ?",
                          [rfId, techId],
                          (setErr) => {
                            if (setErr) {
                              console.error("Error setting lead:", setErr);
                              return res.status(500).json({
                                message: "กำหนดหัวหน้าไม่สำเร็จ",
                                error: setErr.message,
                              });
                            }
                            return res.json({
                              message:
                                "ช่างถูกมอบหมายแล้ว (อัปเดตเป็นหัวหน้าเรียบร้อย)",
                            });
                          }
                        );
                      }
                    );
                  } else {
                    return res
                      .status(200)
                      .json({ message: "ช่างนี้มอบหมายแล้วอยู่ในทีม" });
                  }
                  return;
                }

                // 4) ถ้ายังไม่ถูกมอบหมาย ให้ insert แถวใหม่ (ra_is_lead ตาม is_lead)
                const now = new Date();
                const isLeadFlag = is_lead ? 1 : 0;
                db.query(
                  "INSERT INTO repair_assignment (ra_rf_id, ra_us_id, ra_is_lead, ra_assigned_at) VALUES (?, ?, ?, ?)",
                  [rfId, techId, isLeadFlag, now],
                  (insErr) => {
                    if (insErr) {
                      console.error("Error inserting assignment:", insErr);
                      return res.status(500).json({
                        message: "มอบหมายงานไม่สำเร็จ",
                        error: insErr.message,
                      });
                    }

                    // ถ้าเป็น lead ต้องเคลียร์ flag ของคนอื่นด้วย (เพื่อให้มีหัวหน้าเพียงคนเดียว)
                    if (isLeadFlag === 1) {
                      db.query(
                        "UPDATE repair_assignment SET ra_is_lead = 0 WHERE ra_rf_id = ? AND ra_us_id <> ?",
                        [rfId, techId],
                        (clearErr2) => {
                          if (clearErr2) {
                            console.error(
                              "Error clearing other lead flags:",
                              clearErr2
                            );
                            // ไม่ใช่ fatal — ส่ง success แต่ log ข้อผิดพลาด
                            return res.status(200).json({
                              message:
                                "มอบหมายช่างสำเร็จ แต่เกิดปัญหาในการยกเลิกสถานะหัวหน้าเก่า",
                              warning: clearErr2.message,
                            });
                          }
                          return res.json({
                            message: "มอบหมายช่างสำเร็จ",
                            assigned_to: techId,
                            is_lead: Boolean(isLeadFlag),
                          });
                        }
                      );
                    } else {
                      return res.json({
                        message: "มอบหมายช่างสำเร็จ",
                        assigned_to: techId,
                        is_lead: false,
                      });
                    }
                  }
                );
              }
            );
          }
        );
      }
    );
  });

  // --- ช่างกดรับงาน (Start Job) ---
  router.put("/technician/accept-job/:code", authMiddleware, (req, res) => {
  const { code } = req.params;
  const technicianId = req.user.us_id || req.user.id;

  if (!technicianId) {
    return res.status(401).json({ message: "ไม่พบข้อมูลผู้ใช้งาน" });
  }

  const sqlCheck = `
    SELECT ra.ra_id
    FROM repair_form rf
    JOIN repair_assignment ra ON rf.rf_id = ra.ra_rf_id
    WHERE rf.rf_code = ?
  `;

  db.query(sqlCheck, [code], (err, rows) => {
    if (err) return res.status(500).json({ message: "error check assignment" });

    const isSingle = rows.length === 1; // งานเดี่ยวหรือไม่

    // ---- UPDATE status ----
    const sql = `
      UPDATE repair_form rf
      JOIN repair_assignment ra ON rf.rf_id = ra.ra_rf_id
      SET 
        rf.rf_user_status = 'in_progress',
        rf.rf_in_process_at = NOW(),
        rf.rf_update_at = NOW(),
        ra.ra_is_lead = ${isSingle ? 1 : 0}
      WHERE rf.rf_code = ? 
        AND ra.ra_us_id = ?
        AND rf.rf_user_status = 'pending'
    `;

    db.query(sql, [code, technicianId], (err, result) => {
      if (err) {
        console.error("Error accepting job:", err);
        return res.status(500).json({ message: "เกิดข้อผิดพลาด ไม่สามารถรับงานได้" });
      }

      if (result.affectedRows === 0) {
        return res.status(400).json({
          message: "ไม่สามารถรับงานได้ (สถานะผิด หรือไม่ได้ถูกมอบหมาย)",
        });
      }

      res.json({ message: "รับงานแล้ว", isLead: isSingle ? 1 : 0 });
    });
  });
});


  // GET /technician/repairs  -> ดึงเฉพาะงานที่มอบหมายให้ช่างที่ล็อกอิน
  router.get("/technician/repairs", authMiddleware, (req, res) => {
    // ตรวจสอบว่าตัว authMiddleware เก็บ user id ไว้ที่ไหน (ตัวอย่างนี้ใช้ req.user.us_id)
    const technicianId = req.user && (req.user.us_id || req.user.id);
    if (!technicianId) {
      return res.status(401).json({ message: "ไม่พบข้อมูลผู้ใช้งาน" });
    }

    const query = `
    SELECT
  rf.rf_id,
  rf.rf_code,
  rf.rf_create_at,
  rf.rf_user_status,
  COALESCE(rf.rf_urgency, 'medium') AS rf_urgency,
  u.us_first_name_th AS us_first_name,
  u.us_last_name_th AS us_last_name,
  u.us_department AS department_name,
  tt.tt_name,
  r.room_name,
  f.fl_name,
  b.bd_name,
  ra.ra_id,
  ra.ra_is_lead,
  ra.ra_assigned_at,
  ra.ra_accepted_at
FROM repair_form rf
INNER JOIN repair_assignment ra ON rf.rf_id = ra.ra_rf_id
LEFT JOIN user u ON rf.rf_us_id = u.us_id
LEFT JOIN technician_type tt ON rf.rf_tt_id = tt.tt_id
LEFT JOIN room r ON rf.rf_room_id = r.room_id
LEFT JOIN floor f ON r.room_fl_id = f.fl_id
LEFT JOIN building b ON f.fl_bd_id = b.bd_id
WHERE ra.ra_us_id = ?
ORDER BY rf.rf_create_at DESC

  `;

    db.query(query, [technicianId], (err, results) => {
      if (err) {
        console.error("Error fetching technician repairs:", err);
        return res.status(500).json({
          message: "ดึงข้อมูลรายการแจ้งซ่อมที่มอบหมายไม่สำเร็จ",
          error: err.message,
        });
      }
      res.json(results);
    });
  });

  // POST /assign-repair-team
  // --- Replace the existing /assign-repair-team handler with this block ---
  router.post("/assign-repair-team", authMiddleware, (req, res) => {
    const { rf_code, technician_ids, lead_id } = req.body;

    if (
      !rf_code ||
      !Array.isArray(technician_ids) ||
      technician_ids.length === 0
    ) {
      return res.status(400).json({
        message:
          "ข้อมูลไม่ครบ: ต้องระบุ rf_code และ technician_ids อย่างน้อย 1 คน",
      });
    }

    // sanitize numeric ids
    const techIds = technician_ids
      .map((id) => Number(id))
      .filter((n) => Number.isFinite(n));
    if (techIds.length === 0) {
      return res
        .status(400)
        .json({ message: "technician_ids ต้องเป็น array ของตัวเลข" });
    }

    const leadId = lead_id ? Number(lead_id) : techIds[0];
    if (!techIds.includes(leadId)) {
      return res
        .status(400)
        .json({ message: "lead_id ต้องเป็นหนึ่งใน technician_ids" });
    }

    // helper: obtain a connection in a way that works for pool or single connection
    const isPool = typeof db.getConnection === "function";
    function obtainConnection(cb) {
      if (isPool) {
        db.getConnection((err, conn) => {
          if (err) return cb(err);
          cb(null, conn);
        });
      } else {
        // db is a single connection instance (use it directly)
        cb(null, db);
      }
    }
    function releaseIfPool(conn) {
      if (isPool && conn && typeof conn.release === "function") {
        try {
          conn.release();
        } catch (e) {
          /* ignore release errors */
        }
      }
    }

    obtainConnection((connErr, conn) => {
      if (connErr) {
        console.error("DB connection error (assign-repair-team):", connErr);
        return res.status(500).json({ message: "เชื่อมต่อฐานข้อมูลไม่สำเร็จ" });
      }

      // begin transaction
      conn.beginTransaction((txErr) => {
        if (txErr) {
          releaseIfPool(conn);
          console.error("Begin transaction error:", txErr);
          return res
            .status(500)
            .json({ message: "เริ่ม transaction ไม่สำเร็จ" });
        }

        // 1) lock/select rf_id
        const rfQuery =
          "SELECT rf_id FROM repair_form WHERE rf_code = ? FOR UPDATE";
        conn.query(rfQuery, [rf_code], (qrErr, qrRes) => {
          if (qrErr) {
            console.error("Query rf_id error:", qrErr);
            return conn.rollback(() => {
              releaseIfPool(conn);
              return res
                .status(500)
                .json({ message: "ค้นหาใบแจ้งซ่อมไม่สำเร็จ" });
            });
          }
          if (!qrRes || qrRes.length === 0) {
            return conn.rollback(() => {
              releaseIfPool(conn);
              return res.status(404).json({ message: "ไม่พบใบแจ้งซ่อมนี้" });
            });
          }

          const rfId = qrRes[0].rf_id;

          // 2) ตรวจสอบว่า technician ทุกคนมี role = 2 (ช่าง)
          const placeholders = techIds.map(() => "?").join(",");
          const techCheckSql = `SELECT us_id, us_role_id FROM user WHERE us_id IN (${placeholders})`;
          conn.query(techCheckSql, techIds, (tcErr, tcRes) => {
            if (tcErr) {
              console.error("Error checking technicians:", tcErr);
              return conn.rollback(() => {
                releaseIfPool(conn);
                return res.status(500).json({ message: "ตรวจสอบช่างล้มเหลว" });
              });
            }

            if (!tcRes || tcRes.length !== techIds.length) {
              const foundIds = (tcRes || []).map((r) => r.us_id);
              const missing = techIds.filter((id) => !foundIds.includes(id));
              return conn.rollback(() => {
                releaseIfPool(conn);
                return res
                  .status(404)
                  .json({ message: `ไม่พบช่างบางคน: ${missing.join(", ")}` });
              });
            }

            const nonTech = tcRes
              .filter((r) => Number(r.us_role_id) !== 2)
              .map((r) => r.us_id);
            if (nonTech.length > 0) {
              return conn.rollback(() => {
                releaseIfPool(conn);
                return res.status(400).json({
                  message: `ผู้ใช้งานต่อไปนี้ไม่ใช่ช่าง: ${nonTech.join(", ")}`,
                });
              });
            }

            // 3) Delete old assignments for this rf_id
            const deleteSql =
              "DELETE FROM repair_assignment WHERE ra_rf_id = ?";
            conn.query(deleteSql, [rfId], (delErr) => {
              if (delErr) {
                console.error("Error deleting old assignments:", delErr);
                return conn.rollback(() => {
                  releaseIfPool(conn);
                  return res
                    .status(500)
                    .json({ message: "ล้างรายการมอบหมายเก่าไม่สำเร็จ" });
                });
              }

              // 4) Insert new assignments
              const insertSql =
                "INSERT INTO repair_assignment (ra_rf_id, ra_us_id, ra_is_lead, ra_assigned_at) VALUES ?";
              const now = new Date();
              const values = techIds.map((tid) => [
                rfId,
                tid,
                tid === leadId ? 1 : 0,
                now,
              ]);

              conn.query(insertSql, [values], (insErr) => {
                if (insErr) {
                  console.error("Error inserting assignments:", insErr);
                  return conn.rollback(() => {
                    releaseIfPool(conn);
                    return res
                      .status(500)
                      .json({ message: "บันทึกการมอบหมายไม่สำเร็จ" });
                  });
                }

                // commit
                conn.commit((cmErr) => {
                  if (cmErr) {
                    console.error("Commit error:", cmErr);
                    return conn.rollback(() => {
                      releaseIfPool(conn);
                      return res
                        .status(500)
                        .json({ message: "บันทึกไม่สำเร็จ (commit)" });
                    });
                  }

                  releaseIfPool(conn);
                  return res.json({
                    message: "มอบหมายเป็นทีมสำเร็จ",
                    assigned_count: techIds.length,
                    lead_id: leadId,
                  });
                }); // end commit
              }); // end insert
            }); // end delete
          }); // end tech check
        }); // end rf query
      }); // end beginTransaction
    }); // end obtainConnection
  });

  return router;
};
