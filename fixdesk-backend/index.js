require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const { authMiddleware, signToken } = require("./auth");

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   Database Connection
   ========================= */
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "fixdesk_db",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  charset: "utf8mb4",
});

db.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection failed:", err);
    process.exit(1);
  }
  console.log("✅ Connected to MySQL");
});

/* =========================
   LOGIN (with bcrypt)
   ========================= */
app.post("/auth/login", (req, res) => {
  const { user_name, password } = req.body;
  if (!user_name || !password)
    return res
      .status(400)
      .json({ message: "กรุณากรอก user_name และ password" });

  const query = `
    SELECT u.us_id, u.us_user_name, u.us_user_pass,
           t.ttn_title_th, u.us_first_name_th, u.us_last_name_th,
           u.us_phone, u.us_department,
           r.role_name
    FROM user u
    LEFT JOIN title_name t ON u.us_ttn_id = t.ttn_id
    LEFT JOIN role r ON u.us_role_id = r.role_id
    WHERE u.us_user_name=? LIMIT 1
  `;

  db.query(query, [user_name], async (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ message: "เกิดข้อผิดพลาด", error: err.message });
    if (!results.length)
      return res.status(401).json({ message: "ชื่อผู้ใช้ไม่ถูกต้อง" });

    const user = results[0];
    const match = await bcrypt.compare(password, user.us_user_pass);
    if (!match) return res.status(401).json({ message: "รหัสผ่านไม่ถูกต้อง" });

    // ✅ ใส่ข้อมูลทั้งหมดใน token
    const payload = {
      us_id: user.us_id,
      us_user_name: user.us_user_name,
      us_prefix_th: user.ttn_title_th || "",
      us_first_name_th: user.us_first_name_th || "",
      us_last_name_th: user.us_last_name_th || "",
      us_tel: user.us_phone || "",
      us_department: user.us_department || "",
      role_name: user.role_name || "",
    };

    const token = signToken(payload);
    res.json({ token });
  });
});

/* =========================
   POST /users (add user)
   ========================= */
app.post("/users", async (req, res) => {
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
    res
      .status(500)
      .json({
        message: "เกิดข้อผิดพลาดในการเข้ารหัสรหัสผ่าน",
        error: err.message,
      });
  }
});

/* =========================
   GET /users (list all)
   ========================= */
app.get("/users", authMiddleware, (req, res) => {
  const query = `
    SELECT
      u.us_id,
      u.us_user_name,
      CONCAT(tn.ttn_title_th, '', u.us_first_name_th, ' ', u.us_last_name_th) AS full_name,
      u.us_phone,
      u.us_department,
      u.us_role_id,
      r.role_name,
      u.us_tt_id,
      t.tt_name AS technician_type,
      tn.ttn_title_th AS title_name,
      tn.ttn_title_th AS us_prefix_th,
      u.us_first_name_th,
      u.us_last_name_th
    FROM user u
    LEFT JOIN role r ON u.us_role_id = r.role_id
    LEFT JOIN technician_type t ON u.us_tt_id = t.tt_id
    LEFT JOIN title_name tn ON u.us_ttn_id = tn.ttn_id
    ORDER BY u.us_id ASC
  `;
  db.query(query, (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ message: "ดึงข้อมูลผู้ใช้ไม่สำเร็จ", error: err.message });
    res.json(results);
  });
});

/* =========================
   GET /users/:id (single user)
   ========================= */
app.get("/users/:id", authMiddleware, (req, res) => {
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

/* =========================
   PUT /users/:id (update)
   ========================= */
app.put("/users/:id", authMiddleware, (req, res) => {
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
    WHERE us_id=?
  `;
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

/* =========================
   DELETE /users/:id
   ========================= */
app.delete("/users/:id", authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ message: "id ไม่ถูกต้อง" });

  db.query("DELETE FROM user WHERE us_id=?", [id], (err, result) => {
    if (err)
      return res
        .status(500)
        .json({ message: "ลบไม่สำเร็จ", error: err.message });
    res.json({ deleted: result.affectedRows });
  });
});

/* ================
   GET /technicians (ดึงรายชื่อช่างทั้งหมด)
=================== */
app.get("/technicians", authMiddleware, (req, res) => {
  const query = `
    SELECT 
      u.us_id,
      u.us_user_name,
      u.us_first_name_th,
      u.us_last_name_th,
      u.us_phone,
      u.us_tt_id,
      tt.tt_name,
      tn.ttn_title_th
    FROM user u
    LEFT JOIN technician_type tt ON u.us_tt_id = tt.tt_id
    LEFT JOIN title_name tn ON u.us_ttn_id = tn.ttn_id
    WHERE u.us_role_id = 2
    ORDER BY u.us_first_name_th ASC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error("❌ Error fetching technicians:", err);
      return res.status(500).json({ message: "ดึงข้อมูลช่างไม่สำเร็จ", error: err.message });
    }
    res.json(results);
  });
});

/* ================
TECHNICIAN TYPE CRUD
=================== */

// GET all technician types
app.get("/technician-types", (req, res) => {
  const query = "SELECT tt_id, tt_name FROM technician_type ORDER BY tt_name";
  
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching technician types:", err);
      return res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลประเภทงาน" });
    }
    res.json(results);
  });
});

// POST create new technician type
app.post("/technician-types", (req, res) => {
  const { tt_name } = req.body;
  
  if (!tt_name || !tt_name.trim()) {
    return res.status(400).json({ message: "กรุณากรอกชื่อประเภทงาน" });
  }

  // ตรวจสอบชื่อซ้ำ
  const checkQuery = "SELECT COUNT(*) as count FROM technician_type WHERE LOWER(tt_name) = LOWER(?)";
  
  db.query(checkQuery, [tt_name.trim()], (err, results) => {
    if (err) {
      console.error("Error checking duplicate technician type:", err);
      return res.status(500).json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
    }
    
    if (results[0].count > 0) {
      return res.status(400).json({ message: "ชื่อประเภทงานนี้มีอยู่ในระบบแล้ว" });
    }

    const insertQuery = "INSERT INTO technician_type (tt_name) VALUES (?)";
    
    db.query(insertQuery, [tt_name.trim()], (err, result) => {
      if (err) {
        console.error("Error creating technician type:", err);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการเพิ่มประเภทงาน" });
      }
      res.status(201).json({ 
        message: "เพิ่มประเภทงานสำเร็จ",
        tt_id: result.insertId,
        tt_name: tt_name.trim()
      });
    });
  });
});

// PUT update technician type
app.put("/technician-types/:id", (req, res) => {
  const { id } = req.params;
  const { tt_name } = req.body;
  
  if (!tt_name || !tt_name.trim()) {
    return res.status(400).json({ message: "กรุณากรอกชื่อประเภทงาน" });
  }

  // ตรวจสอบชื่อซ้ำ (ยกเว้น record ปัจจุบัน)
  const checkQuery = "SELECT COUNT(*) as count FROM technician_type WHERE LOWER(tt_name) = LOWER(?) AND tt_id != ?";
  
  db.query(checkQuery, [tt_name.trim(), id], (err, results) => {
    if (err) {
      console.error("Error checking duplicate technician type:", err);
      return res.status(500).json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
    }
    
    if (results[0].count > 0) {
      return res.status(400).json({ message: "ชื่อประเภทงานนี้มีอยู่ในระบบแล้ว" });
    }

    const updateQuery = "UPDATE technician_type SET tt_name = ? WHERE tt_id = ?";
    
    db.query(updateQuery, [tt_name.trim(), id], (err, result) => {
      if (err) {
        console.error("Error updating technician type:", err);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการแก้ไขประเภทงาน" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "ไม่พบประเภทงานที่ต้องการแก้ไข" });
      }
      res.json({ message: "แก้ไขประเภทงานสำเร็จ" });
    });
  });
});

// DELETE technician type
app.delete("/technician-types/:id", (req, res) => {
  const { id } = req.params;
  
  // ตรวจสอบว่ามีการใช้งานประเภทงานนี้อยู่หรือไม่
  const checkQuery = "SELECT COUNT(*) as count FROM user WHERE us_tt_id = ?";
  
  db.query(checkQuery, [id], (err, results) => {
    if (err) {
      console.error("Error checking technician type usage:", err);
      return res.status(500).json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
    }
    
    if (results[0].count > 0) {
      return res.status(400).json({ 
        message: "ไม่สามารถลบประเภทงานนี้ได้ เนื่องจากมีช่างที่ใช้ประเภทงานนี้อยู่" 
      });
    }
    
    const deleteQuery = "DELETE FROM technician_type WHERE tt_id = ?";
    
    db.query(deleteQuery, [id], (err, result) => {
      if (err) {
        console.error("Error deleting technician type:", err);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบประเภทงาน" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "ไม่พบประเภทงานที่ต้องการลบ" });
      }
      res.json({ message: "ลบประเภทงานสำเร็จ" });
    });
  });
});

// 🏢 ดึงข้อมูลตึกทั้งหมด
app.get("/buildings", (req, res) => {
  const query =
    "SELECT bd_id AS building_id, bd_name AS building_name FROM building ORDER BY bd_id ASC";
  db.query(query, (err, results) => {
    if (err)
      return res.status(500).json({ message: "โหลดข้อมูลอาคารไม่สำเร็จ" });
    res.json(results);
  });
});

// 🧱 ดึงข้อมูลชั้นตาม building
app.get("/floors/:buildingId", (req, res) => {
  const { buildingId } = req.params;
  const query = `
    SELECT fl_id AS floor_id, fl_name AS floor_name
    FROM floor
    WHERE fl_bd_id = ?
    ORDER BY fl_id ASC
  `;
  db.query(query, [buildingId], (err, results) => {
    if (err) {
      console.error("❌ MySQL error (floors):", err);
      return res.status(500).json({ message: "โหลดข้อมูลชั้นไม่สำเร็จ" });
    }
    res.json(results);
  });
});

// 🚪 ดึงข้อมูลห้องตาม floor
app.get("/rooms/:floorId", (req, res) => {
  const { floorId } = req.params;
  const query = `
    SELECT room_id AS room_id, room_name AS room_name
    FROM room
    WHERE room_fl_id = ?
    ORDER BY room_id ASC
  `;
  db.query(query, [floorId], (err, results) => {
    if (err) {
      console.error("❌ MySQL error (rooms):", err);
      return res.status(500).json({ message: "โหลดข้อมูลห้องไม่สำเร็จ" });
    }
    res.json(results);
  });
});

app.post('/repair-requests', express.json(), (req, res) => {
  const {
    us_id,
    repair_type_id,
    room_id,
    asset_code,
    problem_detail,
    issue_description,
    urgency,
    phone_number, // ✅ เพิ่มเบอร์โทรมาจากฟอร์ม
  } = req.body

  if (!us_id || !repair_type_id || !room_id || !problem_detail) {
    return res.status(400).json({ message: 'ข้อมูลไม่ครบ กรุณากรอกให้ครบทุกช่อง' })
  }

  // ✅ สร้างรหัสตามวันที่ เช่น RF20251024-001
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')

  const countQuery = `
    SELECT COUNT(*) AS count
    FROM repair_form
    WHERE DATE(rf_create_at) = CURDATE()
  `

  db.query(countQuery, (err, results) => {
    if (err) {
      console.error('❌ Error counting repairs:', err)
      return res.status(500).json({ message: 'ไม่สามารถสร้างรหัสฟอร์มได้' })
    }

    const todayCount = results[0].count + 1
    const runningNumber = String(todayCount).padStart(3, '0') // เช่น 001
    const rfCode = `RF${datePart}${runningNumber}`

    const insertQuery = `
      INSERT INTO repair_form
      (rf_code, rf_us_id, rf_tt_id, rf_room_id, rf_prop_number,
       rf_problem, rf_detail, rf_phone, rf_urgency,
       rf_user_status, rf_tech_status, rf_create_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'working', NOW())
    `

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
        phone_number, // ✅ ใส่เบอร์โทรตรงนี้
        urgency,
      ],
      (err2, results2) => {
        if (err2) {
          console.error('❌ Error saving repair form:', err2)
          return res.status(500).json({ message: 'บันทึกข้อมูลไม่สำเร็จ' })
        }

        res.json({
          message: '✅ บันทึกฟอร์มแจ้งซ่อมสำเร็จ',
          id: results2.insertId,
          rf_code: rfCode,
        })
      }
    )
  })
})

/* ================
   GET /admin/repairs (ดึงรายการแจ้งซ่อมทั้งหมด)
=================== */
app.get("/admin/repairs", authMiddleware, (req, res) => {
  const query = `
    SELECT 
      rf.rf_id,
      rf.rf_code,
      rf.rf_create_at,
      rf.rf_user_status,
      COALESCE(rf.rf_urgency, 'medium') AS rf_urgency,
      u.us_first_name_th AS us_first_name,
      u.us_last_name_th AS us_last_name,
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
      console.error("❌ Error fetching repairs:", err);
      return res.status(500).json({ message: "ดึงข้อมูลรายการแจ้งซ่อมไม่สำเร็จ", error: err.message });
    }
    res.json(results);
  });
});

/* ================
   POST /assign-repair (มอบหมายงานให้ช่าง)
=================== */
app.post("/assign-repair", authMiddleware, (req, res) => {
  const { rf_id, technician_id } = req.body;
  
  if (!rf_id || !technician_id) {
    return res.status(400).json({ message: "ข้อมูลไม่ครบถ้วน" });
  }

  // Verify technician exists and has correct role
  const techQuery = `
    SELECT u.us_tt_id, r.role_name
    FROM user u
    LEFT JOIN role r ON u.us_role_id = r.role_id
    WHERE u.us_id = ?
  `;

  db.query(techQuery, [technician_id], (err, results) => {
    if (err) {
      console.error("❌ Error checking technician:", err);
      return res.status(500).json({ message: "เกิดข้อผิดพลาดในการค้นหาช่าง", error: err.message });
    }

    if (!results.length) {
      return res.status(404).json({ message: "ไม่พบข้อมูลช่าง" });
    }

    if (results[0].role_name !== 'Technician') {
      return res.status(400).json({ message: "ผู้ใช้นี้ไม่ใช่ช่าง" });
    }

    const techTypeId = results[0].us_tt_id;

    // Update repair_form with assigned technician
    const updateQuery = `
      UPDATE repair_form
      SET rf_tt_id = ?, rf_assigned_tech_id = ?, rf_user_status = 'in_progress'
      WHERE rf_id = ? AND rf_user_status = 'pending'
    `;

    db.query(updateQuery, [techTypeId, technician_id, rf_id], (err2, result) => {
      if (err2) {
        console.error("❌ Error assigning repair:", err2);
        return res.status(500).json({ message: "มอบหมายงานไม่สำเร็จ", error: err2.message });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "ไม่พบรายการแจ้งซ่อมหรือถูกมอบหมายแล้ว" });
      }

      res.json({ message: "มอบหมายงานสำเร็จ", updated: result.affectedRows });
    });
  });
});


// ✅ ดึงข้อมูลรายการแจ้งซ่อมของผู้ใช้
app.get('/my-repairs/:userId', (req, res) => {
  const { userId } = req.params

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
  `

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('❌ Error fetching user repairs:', err)
      return res.status(500).json({ message: 'ไม่สามารถโหลดข้อมูลรายการแจ้งซ่อมได้' })
    }
    res.json(results)
  })
})

// 🗑️ ลบใบแจ้งซ่อมตามรหัสใบแจ้ง (rf_code)
app.delete('/my-repairs/:code', (req, res) => {
  const { code } = req.params
  console.log('🧭 ลบฟอร์ม code =', code)

  db.query('DELETE FROM repair_form WHERE rf_code = ?', [code], (err, result) => {
    if (err) {
      console.error('❌ ลบข้อมูลไม่สำเร็จ:', err)
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' })
    }

    if (result.affectedRows === 0) {
      console.warn('⚠️ ไม่พบใบแจ้งซ่อม:', code)
      return res.status(404).json({ message: 'ไม่พบใบแจ้งซ่อมนี้' })
    }

    console.log(`🗑️ ลบสำเร็จ: ${code}`)
    res.json({ message: 'ลบข้อมูลเรียบร้อยแล้ว' })
  })
})




// =========================
// 📄 GET: ดึงรายละเอียดใบแจ้งซ่อม (เวอร์ชันแก้ไข)
// =========================
app.get('/repair-requests/:code', (req, res) => {
  const { code } = req.params

  const sql = `
    SELECT 
      rf.rf_code,
      rf.rf_problem,
      rf.rf_detail,
      rf.rf_urgency,
      rf.rf_phone,
      rf.rf_create_at,
      rf.rf_user_status,
      rf.rf_tech_status,
      rf.rf_prop_number,
      rf.rf_image,

      -- ✅ เพิ่ม id ทั้งหมด
      t.tt_id AS repair_type_id,
      t.tt_name AS repair_type_name,
      b.bd_id AS building_id,
      b.bd_name AS building_name,
      f.fl_id AS floor_id,
      f.fl_name AS floor_name,
      r.room_id AS room_id,
      r.room_name AS room_name,

      CONCAT(tn.ttn_title_th, u.us_first_name_th, ' ', u.us_last_name_th) AS reporter_name,
      u.us_phone AS reporter_phone,
      u.us_department AS reporter_department

    FROM repair_form rf
    LEFT JOIN room r ON rf.rf_room_id = r.room_id
    LEFT JOIN floor f ON r.room_fl_id = f.fl_id
    LEFT JOIN building b ON f.fl_bd_id = b.bd_id
    LEFT JOIN technician_type t ON rf.rf_tt_id = t.tt_id
    LEFT JOIN user u ON rf.rf_us_id = u.us_id
    LEFT JOIN title_name tn ON u.us_ttn_id = tn.ttn_id
    WHERE rf.rf_code = ?
  `

  db.query(sql, [code], (err, results) => {
    if (err) {
      console.error('❌ Database error:', err)
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', error: err.message })
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'ไม่พบใบแจ้งซ่อมนี้' })
    }

    const r = results[0]

    res.json({
      rf_code: r.rf_code,
      rf_detail: r.rf_detail || '-',
      rf_problem: r.rf_problem || '-',
      rf_urgency: r.rf_urgency || 'medium',
      rf_user_status: r.rf_user_status || '-',
      rf_tech_status: r.rf_tech_status || '-',
      rf_phone: r.rf_phone || '-',
      rf_create_at: r.rf_create_at || '-',
      rf_prop_number: r.rf_prop_number || '-',
      rf_image: r.rf_image || null,

      // ✅ เพิ่ม id และ name
      repair_type_id: r.repair_type_id || null,
      repair_type_name: r.repair_type_name || '-',
      building_id: r.building_id || null,
      building_name: r.building_name || '-',
      floor_id: r.floor_id || null,
      floor_name: r.floor_name || '-',
      room_id: r.room_id || null,
      room_name: r.room_name || '-',

      reporter: {
        name: r.reporter_name || '-',
        phone: r.reporter_phone || '-',
        department: r.reporter_department || '-'
      }
    })
  })
})

// =========================
// ✏️ PUT: อัปเดตข้อมูลใบแจ้งซ่อม
// =========================
app.put('/repair-requests/:code', (req, res) => {
  const { code } = req.params
  const {
    us_id,
    repair_type_id,
    room_id,
    asset_code,
    problem_detail,
    issue_description,
    urgency,
    phone_number
  } = req.body

  if (!repair_type_id || !room_id || !problem_detail) {
    return res.status(400).json({ message: 'ข้อมูลไม่ครบ กรุณากรอกให้ครบทุกช่อง' })
  }

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
      rf_update_at = NOW()
    WHERE rf_code = ?
  `

  const params = [
    us_id || null,
    repair_type_id,
    room_id,
    asset_code || null,
    problem_detail,
    issue_description || '-',
    phone_number || null,
    urgency || 'medium',
    code
  ]

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('❌ Database error (update repair):', err)
      return res.status(500).json({ message: 'อัปเดตข้อมูลไม่สำเร็จ', error: err.message })
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่พบใบแจ้งซ่อมนี้' })
    }

    res.json({ message: '✅ อัปเดตข้อมูลใบแจ้งซ่อมสำเร็จ', updated: result.affectedRows })
  })
})







/* =========================
   SERVER START
   ========================= */
const PORT = process.env.PORT || 3000;
if (!process.env.JWT_SECRET)
  console.warn("⚠️ WARNING: JWT_SECRET is not set in .env");

app.listen(PORT, () =>
  console.log(`🚀 FixDesk User API (v2.0.1) running on port ${PORT}`)
);
