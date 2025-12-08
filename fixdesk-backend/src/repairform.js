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
    // แก้ SQL: Join repair_assignment เพื่อหาหัวหน้า (is_lead=1)
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

  router.post("/assign-repair", authMiddleware, (req, res) => {
    const { rf_code, technician_id } = req.body;
    if (!rf_code || !technician_id) {
      return res.status(400).json({ message: "ข้อมูลไม่ครบถ้วน" });
    }

    // 1. ตรวจสอบช่าง
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

      // 2. หา rf_id จาก rf_code ก่อน (เพราะ assignment ต้องใช้ id)
      db.query(
        "SELECT rf_id FROM repair_form WHERE rf_code = ?",
        [rf_code],
        (errRf, resRf) => {
          if (errRf || resRf.length === 0) {
            return res.status(404).json({ message: "ไม่พบใบแจ้งซ่อม" });
          }
          const rfId = resRf[0].rf_id;

          // 3. เริ่ม Transaction หรือทำงานเป็นลำดับ
          // A. อัปเดตประเภทงานใน repair_form (ตามประเภทของช่าง)
          const updateFormQuery = `
            UPDATE repair_form
            SET rf_tt_id = ?, rf_update_at = NOW()
            WHERE rf_id = ?
          `;
          db.query(updateFormQuery, [techTypeId, rfId], (errUp) => {
            if (errUp) {
              console.error("Error updating rf_tt_id:", errUp);
            }

            // B. ล้างคนเก่าออกก่อน (เพื่อให้ Assign ใหม่ได้สะดวก หรือจะใช้ Logic อื่นก็ได้)
            // ในที่นี้สมมติว่าถ้า Assign ใหม่ ให้ลบ Assignments เก่าออกให้หมด เพื่อ Set ทีมใหม่
            db.query(
              "DELETE FROM repair_assignment WHERE ra_rf_id = ?",
              [rfId],
              (errDel) => {
                if (errDel) {
                  console.error("Error clearing old assignments:", errDel);
                }

                // C. Insert ลง repair_assignment (ตั้งเป็น Lead)
                const insertAssign = `
                  INSERT INTO repair_assignment (ra_rf_id, ra_us_id, ra_is_lead, ra_assigned_at)
                  VALUES (?, ?, 1, NOW())
                `;
                db.query(insertAssign, [rfId, technician_id], (errIns) => {
                  if (errIns) {
                    console.error("Error inserting assignment:", errIns);
                    return res
                      .status(500)
                      .json({ message: "มอบหมายงานไม่สำเร็จ" });
                  }

                  console.log(
                    `มอบหมายใบแจ้งซ่อม ${rf_code} (ID: ${rfId}) ให้ช่าง ID ${technician_id}`
                  );
                  res.json({ message: "มอบหมายงานสำเร็จ" });
                });
              }
            );
          });
        }
      );
    });
  });

  return router;
};
