const express = require("express");
const { authMiddleware } = require("../auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

module.exports = function RepairFormRoutes(db) {
  const router = express.Router();

  // Module อัพโหลดไฟล์Multer File Upload Configuration
  // สร้างโฟลเดอร์ uploads
  const repairUploadPath = path.join(__dirname, "..", "uploads", "repair");
  if (!fs.existsSync(repairUploadPath)) {
    fs.mkdirSync(repairUploadPath, { recursive: true });
  }

  // กำหนด storage สำหรับ multer
  const storage = multer.diskStorage({
    destination: (req, file, callback) => {
      callback(null, repairUploadPath);
    },
    filename: (req, file, callback) => {
      // สร้างชื่อไฟล์: RF_YYYYMMDD_HHMMSS_random.ext
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

  // กำหนด file filter
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

  // สร้าง multer instance
  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
      files: 5, // ไม่เกิน 5 ไฟล์
    },
    fileFilter: fileFilter,
  });

  // อัพโหลดไฟล์สำหรับใบแจ้งซ่อม
  router.post("/upload-repair-files", upload.array("files", 5), (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "กรุณาเลือกไฟล์สำหรับอัพโหลด" });
      }
      // สร้าง array ของ file paths
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
        filePaths: filePaths, // สำหรับเก็บใน database
      });
    } catch (error) {
      console.error("Error uploading files:", error);
      res
        .status(500)
        .json({ message: "อัพโหลดไฟล์ไม่สำเร็จ", error: error.message });
    }
  });

  // ลบไฟล์
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
      // สร้างรหัสใบแจ้งซ่อม
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
            rf_user_status, rf_tech_status, rf_create_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'working', NOW())
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
        existing_files, // ไฟล์เดิมที่ต้องการเก็บไว้
      } = req.body;
      if (!repair_type_id || !room_id || !problem_detail) {
        return res
          .status(400)
          .json({ message: "ข้อมูลไม่ครบ กรุณากรอกให้ครบทุกช่อง" });
      }
      // รวมไฟล์เดิมกับไฟล์ใหม่
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

  // สร้างแบบฟอร์มแจ้งซ่อม
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
    // สร้างรหัสตามวันที่ เช่น RF20251024-001
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
      const runningNumber = String(todayCount).padStart(3, "0"); // เช่น 001
      const rfCode = `RF${datePart}${runningNumber}`;
      // แปลง file_paths เป็น JSON string สำหรับเก็บใน database
      const imageData = file_paths ? JSON.stringify(file_paths) : null;

      const insertQuery = `
        INSERT INTO repair_form
        (rf_code, rf_us_id, rf_tt_id, rf_room_id, rf_prop_number,
        rf_problem, rf_detail, rf_phone, rf_urgency, rf_image,
        rf_user_status, rf_tech_status, rf_create_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'working', NOW())
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
          imageData, // เก็บ file paths เป็น JSON
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

  // ดึงรายการแจ้งซ่อมทั้งหมด
  router.get("/admin/repairs", authMiddleware, (req, res) => {
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
        tech.us_last_name_th AS tech_last_name
      FROM repair_form rf
      LEFT JOIN user u ON rf.rf_us_id = u.us_id
      LEFT JOIN technician_type tt ON rf.rf_tt_id = tt.tt_id
      LEFT JOIN user tech ON rf.rf_assigned_tech_id = tech.us_id
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

  // ดึงรายการแจ้งซ่อมตาม id
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

  // ลบรายการแจ้งซ่อมตาม id
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
        console.warn(
          "ไม่สามารถลบใบแจ้งซ่อมนี้ได้ (ไม่อยู่ในสถานะรอดำเนินการ):",
          code
        );
        return res.status(400).json({
          message:
            "ไม่สามารถลบใบแจ้งซ่อมนี้ได้ เนื่องจากรายการอยู่ระหว่างดำเนินการหรือเสร็จสิ้นแล้ว",
        });
      }
      console.log(`ลบสำเร็จ: ${code}`);
      res.json({ message: "ลบข้อมูลเรียบร้อยแล้ว" });
    });
  });

  // ดึงรายละเอียดใบแจ้งซ่อมตาม code/รหัสใบแจ้งซ่อม
  router.get("/repair-requests/:code", (req, res) => {
    const { code } = req.params;

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
        rf.rf_tech_status,
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
  
        -- ผู้รับผิดชอบงานหลัก (ช่าง)
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
  
      -- ผู้รับผิดชอบงานหลัก (ช่างที่ถูก assign)
      LEFT JOIN user tech ON rf.rf_assigned_tech_id = tech.us_id
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
        rf_tech_status: r.rf_tech_status || "-",
        rf_phone: r.rf_phone || "-",
        rf_create_at: r.rf_create_at || "-",
        rf_in_process_at: r.rf_in_process_at || null,
        rf_done_at: r.rf_done_at || null,
        rf_prop_number: r.rf_prop_number || "-",
        rf_image: r.rf_image ? JSON.parse(r.rf_image) : null, // Parse JSON เป็น array
        // id + name สถานที่/ประเภท
        repair_type_id: r.repair_type_id || null,
        repair_type_name: r.repair_type_name || "-",
        building_id: r.building_id || null,
        building_name: r.building_name || "-",
        floor_id: r.floor_id || null,
        floor_name: r.floor_name || "-",
        room_id: r.room_id || null,
        room_name: r.room_name || "-",
        // ผู้แจ้ง
        reporter: {
          name: r.reporter_name || "-",
          phone: r.reporter_phone || "-",
          department: r.reporter_department || "-",
        },
        // ผู้รับผิดชอบงานหลัก (สำหรับหน้า detail)
        main_technician: r.main_technician_name || "-",
        tech_position: r.main_technician_position || "-",
      });
    });
  });

  // แก้ไขรายละเอียดใบแจ้งซ่อมตาม code/รหัสใบแจ้งซ่อม
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
      file_paths, // เพิ่มรองรับการอัพเดตไฟล์
    } = req.body;
    if (!repair_type_id || !room_id || !problem_detail) {
      return res
        .status(400)
        .json({ message: "ข้อมูลไม่ครบ กรุณากรอกให้ครบทุกช่อง" });
    }
    // จัดการไฟล์ที่อัพเดต
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

  // มอบหมายงานให้ช่าง
  router.post("/assign-repair", authMiddleware, (req, res) => {
    const { rf_code, technician_id } = req.body;
    if (!rf_code || !technician_id) {
      return res.status(400).json({ message: "ข้อมูลไม่ครบถ้วน" });
    }
    // ตรวจสอบว่าช่างมีอยู่จริงและเป็น role 'Technician'
    const techQuery = `
    SELECT u.us_tt_id, u.us_role_id, r.role_name
    FROM user u
    LEFT JOIN role r ON u.us_role_id = r.role_id
    WHERE u.us_id = ?
    `;
    db.query(techQuery, [technician_id], (err, results) => {
      if (err) {
        console.error("Error checking tech:", err);
        return res.status(500).json({ message: "ตรวจสอบข้อมูลช่างล้มเหลว" });
      }
      if (!results.length) {
        return res.status(404).json({ message: "ไม่พบช่างที่เลือก" });
      }
      const tech = results[0];
      if (tech.us_role_id !== 2) {
        return res.status(400).json({ message: "ผู้ใช้นี้ไม่ใช่ช่าง" });
      }
      const techTypeId = tech.us_tt_id;
      // อัปเดตรายการแจ้งซ่อมโดยใช้ rf_code
      const updateQuery = `
    UPDATE repair_form
    SET 
      rf_tt_id = ?,
      rf_assigned_tech_id = ?,
      rf_user_status = 'in_progress',
      rf_in_process_at = IF(rf_in_process_at IS NULL, NOW(), rf_in_process_at),
      rf_update_at = NOW()
    WHERE rf_code = ?
      AND rf_user_status = 'pending'
      `;

      db.query(
        updateQuery,
        [techTypeId, technician_id, rf_code],
        (err2, result) => {
          if (err2) {
            console.error("Error updating repair_form:", err2);
            return res.status(500).json({ message: "มอบหมายงานไม่สำเร็จ" });
          }
          if (result.affectedRows === 0) {
            return res
              .status(404)
              .json({ message: "ไม่พบรายการหรือมอบหมายแล้ว" });
          }
          console.log(
            `มอบหมายใบแจ้งซ่อม ${rf_code} ให้ช่าง ID ${technician_id}`
          );
          res.json({ message: "มอบหมายงานสำเร็จ" });
        }
      );
    });
  });

  return router;
};
