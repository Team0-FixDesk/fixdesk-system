require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authMiddleware, signToken } = require("./auth");

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   Multer File Upload Configuration
   ========================= */
// สร้างโฟลเดอร์ uploads ถ้ายังไม่มี
const uploadDir = path.join(__dirname, 'uploads', 'repair');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// กำหนด storage สำหรับ multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // สร้างชื่อไฟล์: RF_YYYYMMDD_HHMMSS_random.ext
    const timestamp = new Date().toISOString().replace(/[:.-]/g, '').slice(0, 15);
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const ext = path.extname(file.originalname);
    const filename = `RF_${timestamp}_${randomNum}${ext}`;
    cb(null, filename);
  }
});

// กำหนด file filter
const fileFilter = (req, file, cb) => {
  // อนุญาตเฉพาะ images และ video
  const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|avi|mov|wmv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('กรุณาอัพโหลดไฟล์รูปภาพหรือวิดีโอเท่านั้น (jpg, png, gif, webp, mp4, avi, mov, wmv)'));
  }
};

// สร้าง multer instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 5 // ไม่เกิน 5 ไฟล์
  },
  fileFilter: fileFilter
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* =========================
   Database Connection
   ========================= */
// Database Connection
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
    console.error("Database connection failed:", err);
    process.exit(1);
  }
  console.log("Connected to Database");
});

// LOGIN (with bcrypt)
app.post("/auth/login", (req, res) => {
  const { user_name, password } = req.body;
  if (!user_name || !password)
    return res
      .status(400)
      .json({ message: "กรุณากรอก user_name และ password" });

  const query = `
    SELECT u.us_id, u.us_user_name, u.us_user_pass,
           t.ttn_title_th, u.us_first_name_th, u.us_last_name_th, 
           u.us_first_name_en, u.us_last_name_en,
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

    // ใส่ข้อมูลทั้งหมดใน token
    const payload = {
      us_id: user.us_id,
      us_user_name: user.us_user_name,
      us_prefix_th: user.ttn_title_th || "",
      us_first_name_th: user.us_first_name_th || "",
      us_last_name_th: user.us_last_name_th || "",
      us_first_name_en: user.us_first_name_en || '',
      us_last_name_en: user.us_last_name_en || '',
      us_tel: user.us_phone || "",
      us_department: user.us_department || "",
      role_name: user.role_name || "",
    };

    const token = signToken(payload);
    res.json({ token });
  });
});

// Modules User
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

  // ตรวจชื่อไทยต้องเป็นภาษาไทย
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

  // ตรวจชื่ออังกฤษต้องเป็นภาษาอังกฤษ
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

app.get("/users", authMiddleware, (req, res) => {
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
      CONCAT(tn.ttn_title_th, '', u.us_first_name_th, ' ', u.us_last_name_th) AS full_name
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

app.delete("/users/:id", authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ message: "id ไม่ถูกต้อง" });

  // 1) เช็คก่อนว่า user คนนี้ถูกใช้ใน repair_form ไหม
  const checkSql = `
    SELECT COUNT(*) AS count
    FROM repair_form
    WHERE rf_us_id = ? OR rf_assigned_tech_id = ?
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
          "ไม่สามารถลบบัญชีผู้ใช้นี้ได้ เนื่องจากมีใบแจ้งซ่อมที่เชื่อมโยงอยู่ในระบบ",
      });
    }

    // 2) ถ้าไม่ถูกใช้งานที่ไหน ค่อยลบจริง
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


// Modules Technician
app.get("/technicians", authMiddleware, (req, res) => {
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

// GET all technician types
app.get("/technician-types", (req, res) => {
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

// POST create new technician type
app.post("/technician-types", (req, res) => {
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

// PUT update technician type
app.put("/technician-types/:id", (req, res) => {
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

// DELETE technician type
app.delete("/technician-types/:id", (req, res) => {
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
        return res.status(404).json({ message: "ไม่พบประเภทงานที่ต้องการลบ" });
      }
      res.json({ message: "ลบประเภทงานสำเร็จ" });
    });
  });
});

/* =========================
    Building, Floor, Room Endpoints
    ========================= */

// Modules Location
app.get("/buildings", (req, res) => {
  const query =
    "SELECT bd_id AS building_id, bd_name AS building_name FROM building ORDER BY bd_id ASC";
  db.query(query, (err, results) => {
    if (err)
      return res.status(500).json({ message: "โหลดข้อมูลอาคารไม่สำเร็จ" });
    res.json(results);
  });
});

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
      console.error("Database error (floors):", err);
      return res.status(500).json({ message: "โหลดข้อมูลชั้นไม่สำเร็จ" });
    }
    res.json(results);
  });
});

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
      console.error("database error (rooms):", err);
      return res.status(500).json({ message: "โหลดข้อมูลห้องไม่สำเร็จ" });
    }
    res.json(results);
  });
});

app.post("/buildings", authMiddleware, (req, res) => {
  const { bd_name } = req.body;

  if (!bd_name || !bd_name.trim()) {
    return res.status(400).json({ message: "กรุณากรอกชื่ออาคาร" });
  }

  // ตรวจสอบชื่อซ้ำ
  const checkQuery =
    "SELECT COUNT(*) as count FROM building WHERE LOWER(bd_name) = LOWER(?)";

  db.query(checkQuery, [bd_name.trim()], (err, results) => {
    if (err) {
      console.error("Error checking duplicate building:", err);
      return res
        .status(500)
        .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
    }

    if (results[0].count > 0) {
      return res.status(400).json({ message: "ชื่ออาคารนี้มีอยู่ในระบบแล้ว" });
    }

    const insertQuery = "INSERT INTO building (bd_name) VALUES (?)";

    db.query(insertQuery, [bd_name.trim()], (err, result) => {
      if (err) {
        console.error("Error creating building:", err);
        return res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาดในการเพิ่มอาคาร" });
      }
      res.status(201).json({
        message: "เพิ่มอาคารสำเร็จ",
        bd_id: result.insertId,
        bd_name: bd_name.trim(),
      });
    });
  });
});

app.post("/floors", authMiddleware, (req, res) => {
  const { fl_name, fl_bd_id } = req.body;

  if (!fl_name || !fl_name.trim() || !fl_bd_id) {
    return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
  }

  // ตรวจสอบว่าอาคารมีอยู่จริง
  const checkBuildingQuery =
    "SELECT COUNT(*) as count FROM building WHERE bd_id = ?";

  db.query(checkBuildingQuery, [fl_bd_id], (err, results) => {
    if (err) {
      console.error("Error checking building:", err);
      return res
        .status(500)
        .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
    }

    if (results[0].count === 0) {
      return res.status(400).json({ message: "ไม่พบอาคารที่ระบุ" });
    }

    // ตรวจสอบชื่อชั้นซ้ำในอาคารเดียวกัน
    const checkQuery =
      "SELECT COUNT(*) as count FROM floor WHERE LOWER(fl_name) = LOWER(?) AND fl_bd_id = ?";

    db.query(checkQuery, [fl_name.trim(), fl_bd_id], (err2, results2) => {
      if (err2) {
        console.error("Error checking duplicate floor:", err2);
        return res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
      }

      if (results2[0].count > 0) {
        return res
          .status(400)
          .json({ message: "ชื่อชั้นนี้มีอยู่ในอาคารนี้แล้ว" });
      }

      const insertQuery = "INSERT INTO floor (fl_name, fl_bd_id) VALUES (?, ?)";

      db.query(insertQuery, [fl_name.trim(), fl_bd_id], (err3, result) => {
        if (err3) {
          console.error("Error creating floor:", err3);
          return res
            .status(500)
            .json({ message: "เกิดข้อผิดพลาดในการเพิ่มชั้น" });
        }
        res.status(201).json({
          message: "เพิ่มชั้นสำเร็จ",
          fl_id: result.insertId,
          fl_name: fl_name.trim(),
          fl_bd_id: fl_bd_id,
        });
      });
    });
  });
});

app.post("/rooms", authMiddleware, (req, res) => {
  const { room_name, room_fl_id } = req.body;

  if (!room_name || !room_name.trim() || !room_fl_id) {
    return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
  }

  // ตรวจสอบว่าชั้นมีอยู่จริง
  const checkFloorQuery = "SELECT COUNT(*) as count FROM floor WHERE fl_id = ?";

  db.query(checkFloorQuery, [room_fl_id], (err, results) => {
    if (err) {
      console.error("Error checking floor:", err);
      return res
        .status(500)
        .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
    }

    if (results[0].count === 0) {
      return res.status(400).json({ message: "ไม่พบชั้นที่ระบุ" });
    }

    // ตรวจสอบชื่อห้องซ้ำในชั้นเดียวกัน
    const checkQuery =
      "SELECT COUNT(*) as count FROM room WHERE LOWER(room_name) = LOWER(?) AND room_fl_id = ?";

    db.query(checkQuery, [room_name.trim(), room_fl_id], (err2, results2) => {
      if (err2) {
        console.error("Error checking duplicate room:", err2);
        return res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
      }

      if (results2[0].count > 0) {
        return res
          .status(400)
          .json({ message: "ชื่อห้องนี้มีอยู่ในชั้นนี้แล้ว" });
      }

      const insertQuery =
        "INSERT INTO room (room_name, room_fl_id) VALUES (?, ?)";

      db.query(insertQuery, [room_name.trim(), room_fl_id], (err3, result) => {
        if (err3) {
          console.error("Error creating room:", err3);
          return res
            .status(500)
            .json({ message: "เกิดข้อผิดพลาดในการเพิ่มห้อง" });
        }
        res.status(201).json({
          message: "เพิ่มห้องสำเร็จ",
          room_id: result.insertId,
          room_name: room_name.trim(),
          room_fl_id: room_fl_id,
        });
      });
    });
  });
});

app.put("/buildings/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  const { bd_name } = req.body;

  if (!bd_name || !bd_name.trim()) {
    return res.status(400).json({ message: "กรุณากรอกชื่ออาคาร" });
  }

  // ตรวจสอบชื่อซ้ำ (ยกเว้น record ปัจจุบัน)
  const checkQuery =
    "SELECT COUNT(*) as count FROM building WHERE LOWER(bd_name) = LOWER(?) AND bd_id != ?";

  db.query(checkQuery, [bd_name.trim(), id], (err, results) => {
    if (err) {
      console.error("Error checking duplicate building:", err);
      return res
        .status(500)
        .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
    }

    if (results[0].count > 0) {
      return res.status(400).json({ message: "ชื่ออาคารนี้มีอยู่ในระบบแล้ว" });
    }

    const updateQuery = "UPDATE building SET bd_name = ? WHERE bd_id = ?";

    db.query(updateQuery, [bd_name.trim(), id], (err, result) => {
      if (err) {
        console.error("Error updating building:", err);
        return res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาดในการแก้ไขอาคาร" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "ไม่พบอาคารที่ต้องการแก้ไข" });
      }
      res.json({ message: "แก้ไขอาคารสำเร็จ" });
    });
  });
});


app.delete("/buildings/:id", authMiddleware, (req, res) => {
  const { id } = req.params;

  // ตรวจสอบว่ามีชั้นในอาคารนี้อยู่หรือไม่
  const checkQuery = "SELECT COUNT(*) as count FROM floor WHERE fl_bd_id = ?";

  db.query(checkQuery, [id], (err, results) => {
    if (err) {
      console.error("Error checking building usage:", err);
      return res
        .status(500)
        .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
    }

    if (results[0].count > 0) {
      return res.status(400).json({
        message: "ไม่สามารถลบอาคารนี้ได้ เนื่องจากมีชั้นที่เชื่อมโยงอยู่",
      });
    }

    const deleteQuery = "DELETE FROM building WHERE bd_id = ?";

    db.query(deleteQuery, [id], (err, result) => {
      if (err) {
        console.error("Error deleting building:", err);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบอาคาร" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "ไม่พบอาคารที่ต้องการลบ" });
      }
      res.json({ message: "ลบอาคารสำเร็จ" });
    });
  });
});

app.put("/floors/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  const { fl_name, fl_bd_id } = req.body;

  if (!fl_name || !fl_name.trim() || !fl_bd_id) {
    return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
  }

  // ตรวจสอบว่าอาคารมีอยู่จริง
  const checkBuildingQuery =
    "SELECT COUNT(*) as count FROM building WHERE bd_id = ?";

  db.query(checkBuildingQuery, [fl_bd_id], (err, results) => {
    if (err) {
      console.error("Error checking building:", err);
      return res
        .status(500)
        .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
    }

    if (results[0].count === 0) {
      return res.status(400).json({ message: "ไม่พบอาคารที่ระบุ" });
    }

    // ตรวจสอบชื่อซ้ำในอาคารเดียวกัน (ยกเว้น record ปัจจุบัน)
    const checkQuery =
      "SELECT COUNT(*) as count FROM floor WHERE LOWER(fl_name) = LOWER(?) AND fl_bd_id = ? AND fl_id != ?";

    db.query(checkQuery, [fl_name.trim(), fl_bd_id, id], (err2, results2) => {
      if (err2) {
        console.error("Error checking duplicate floor:", err2);
        return res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
      }

      if (results2[0].count > 0) {
        return res
          .status(400)
          .json({ message: "ชื่อชั้นนี้มีอยู่ในอาคารนี้แล้ว" });
      }

      const updateQuery =
        "UPDATE floor SET fl_name = ?, fl_bd_id = ? WHERE fl_id = ?";

      db.query(updateQuery, [fl_name.trim(), fl_bd_id, id], (err3, result) => {
        if (err3) {
          console.error("Error updating floor:", err3);
          return res
            .status(500)
            .json({ message: "เกิดข้อผิดพลาดในการแก้ไขชั้น" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "ไม่พบชั้นที่ต้องการแก้ไข" });
        }
        res.json({ message: "แก้ไขชั้นสำเร็จ" });
      });
    });
  });
});

app.put("/rooms/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  const { room_name, room_fl_id } = req.body;

  if (!room_name || !room_name.trim() || !room_fl_id) {
    return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
  }

  // ตรวจสอบว่าชั้นมีอยู่จริง
  const checkFloorQuery = "SELECT COUNT(*) as count FROM floor WHERE fl_id = ?";

  db.query(checkFloorQuery, [room_fl_id], (err, results) => {
    if (err) {
      console.error("Error checking floor:", err);
      return res
        .status(500)
        .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
    }

    if (results[0].count === 0) {
      return res.status(400).json({ message: "ไม่พบชั้นที่ระบุ" });
    }

    // ตรวจสอบชื่อซ้ำในชั้นเดียวกัน (ยกเว้น record ปัจจุบัน)
    const checkQuery =
      "SELECT COUNT(*) as count FROM room WHERE LOWER(room_name) = LOWER(?) AND room_fl_id = ? AND room_id != ?";

    db.query(
      checkQuery,
      [room_name.trim(), room_fl_id, id],
      (err2, results2) => {
        if (err2) {
          console.error("rror checking duplicate room:", err2);
          return res
            .status(500)
            .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
        }

        if (results2[0].count > 0) {
          return res
            .status(400)
            .json({ message: "ชื่อห้องนี้มีอยู่ในชั้นนี้แล้ว" });
        }

        const updateQuery =
          "UPDATE room SET room_name = ?, room_fl_id = ? WHERE room_id = ?";

        db.query(
          updateQuery,
          [room_name.trim(), room_fl_id, id],
          (err3, result) => {
            if (err3) {
              console.error("Error updating room:", err3);
              return res
                .status(500)
                .json({ message: "เกิดข้อผิดพลาดในการแก้ไขห้อง" });
            }
            if (result.affectedRows === 0) {
              return res
                .status(404)
                .json({ message: "ไม่พบห้องที่ต้องการแก้ไข" });
            }
            res.json({ message: "แก้ไขห้องสำเร็จ" });
          }
        );
      }
    );
  });
});

app.delete("/floors/:id", authMiddleware, (req, res) => {
  const { id } = req.params;

  // ตรวจสอบว่ามีห้องในชั้นนี้อยู่หรือไม่
  const checkQuery = "SELECT COUNT(*) as count FROM room WHERE room_fl_id = ?";

  db.query(checkQuery, [id], (err, results) => {
    if (err) {
      console.error("Error checking floor usage:", err);
      return res
        .status(500)
        .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
    }

    if (results[0].count > 0) {
      return res.status(400).json({
        message: "ไม่สามารถลบชั้นนี้ได้ เนื่องจากมีห้องที่เชื่อมโยงอยู่",
      });
    }

    const deleteQuery = "DELETE FROM floor WHERE fl_id = ?";

    db.query(deleteQuery, [id], (err2, result) => {
      if (err2) {
        console.error("Error deleting floor:", err2);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบชั้น" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "ไม่พบชั้นที่ต้องการลบ" });
      }
      res.json({ message: "ลบชั้นสำเร็จ" });
    });
  });
});

app.delete("/rooms/:id", authMiddleware, (req, res) => {
  const { id } = req.params;

  // ตรวจสอบว่ามีใบแจ้งซ่อมที่เชื่อมโยงกับห้องนี้หรือไม่
  const checkQuery =
    "SELECT COUNT(*) as count FROM repair_form WHERE rf_room_id = ?";

  db.query(checkQuery, [id], (err, results) => {
    if (err) {
      console.error("Error checking room usage:", err);
      return res
        .status(500)
        .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
    }

    if (results[0].count > 0) {
      return res.status(400).json({
        message: "ไม่สามารถลบห้องนี้ได้ เนื่องจากมีใบแจ้งซ่อมที่เชื่อมโยงอยู่",
      });
    }

    const deleteQuery = "DELETE FROM room WHERE room_id = ?";

    db.query(deleteQuery, [id], (err2, result) => {
      if (err2) {
        console.error("Error deleting room:", err2);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบห้อง" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "ไม่พบห้องที่ต้องการลบ" });
      }
      res.json({ message: "ลบห้องสำเร็จ" });
    });
  });
});



// Modules Technician
app.post("/repair-requests", express.json(), (req, res) => {
  const {
    us_id,
    repair_type_id,
    room_id,
    asset_code,
    problem_detail,
    issue_description,
    urgency,
    phone_number, // ✅ เพิ่มเบอร์โทรมาจากฟอร์ม
    file_paths, // ✅ เพิ่ม file paths สำหรับรูปภาพ/วิดีโอ
  } = req.body;

  if (!us_id || !repair_type_id || !room_id || !problem_detail) {
    return res
      .status(400)
      .json({ message: "ข้อมูลไม่ครบ กรุณากรอกให้ครบทุกช่อง" });
  }

  // สร้างรหัสตามวันที่ เช่น RF20251024-001
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  const countQuery = `
    SELECT COUNT(*) AS count
    FROM repair_form
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

    // ✅ แปลง file_paths เป็น JSON string สำหรับเก็บใน database
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
        imageData, // ✅ เก็บ file paths เป็น JSON
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

// GET /admin/repairs (ดึงรายการแจ้งซ่อมทั้งหมด)
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

// POST /assign-repair (มอบหมายงานให้ช่าง)
app.post("/assign-repair", authMiddleware, (req, res) => {
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

app.get("/my-repairs/:userId", (req, res) => {
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

app.delete("/my-repairs/:code", authMiddleware, (req, res) => {
  const { code } = req.params;
  console.log("ลบฟอร์ม code =", code);

  const sql = `
    DELETE FROM repair_form
    WHERE rf_code = ?
      AND rf_user_status = 'pending'
  `;

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

// ดึงรายละเอียดใบแจ้งซ่อม (เวอร์ชันแก้ไข)
app.get("/repair-requests/:code", (req, res) => {
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

    WHERE rf.rf_code = ?
  `;

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
      rf_image: r.rf_image ? JSON.parse(r.rf_image) : null, // ✅ Parse JSON เป็น array

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

app.put("/repair-requests/:code", (req, res) => {
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
    file_paths, // ✅ เพิ่มรองรับการอัพเดตไฟล์
  } = req.body;

  if (!repair_type_id || !room_id || !problem_detail) {
    return res
      .status(400)
      .json({ message: "ข้อมูลไม่ครบ กรุณากรอกให้ครบทุกช่อง" });
  }

  // ✅ จัดการไฟล์ที่อัพเดต
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
    imageData, // ✅ เพิ่ม image data
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

// ✅ สร้างใบแจ้งซ่อมพร้อมอัพโหลดไฟล์ในคำสั่งเดียว
app.post("/repair-requests-with-files", upload.array('files', 5), (req, res) => {
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
    SELECT COUNT(*) AS count
    FROM repair_form
    WHERE DATE(rf_create_at) = CURDATE()
  `;

  db.query(countQuery, (err, results) => {
    if (err) {
      console.error("❌ Error counting repairs:", err);
      return res.status(500).json({ message: "ไม่สามารถสร้างรหัสฟอร์มได้" });
    }

    const todayCount = results[0].count + 1;
    const runningNumber = String(todayCount).padStart(3, "0");
    const rfCode = `RF${datePart}${runningNumber}`;

    // จัดการไฟล์ที่อัพโหลด
    const filePaths = req.files ? req.files.map(file => `/uploads/repair/${file.filename}`) : [];
    const imageData = filePaths.length > 0 ? JSON.stringify(filePaths) : null;

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
          console.error("❌ Error saving repair form:", err2);
          return res.status(500).json({ message: "บันทึกข้อมูลไม่สำเร็จ" });
        }

        res.json({
          message: "✅ บันทึกฟอร์มแจ้งซ่อมสำเร็จ",
          id: results2.insertId,
          rf_code: rfCode,
          uploaded_files: req.files ? req.files.map(file => ({
            filename: file.filename,
            originalname: file.originalname,
            path: `/uploads/repair/${file.filename}`,
            size: file.size
          })) : []
        });
      }
    );
  });
});

// ✅ อัพเดตใบแจ้งซ่อมพร้อมไฟล์ใหม่
app.put("/repair-requests-with-files/:code", upload.array('files', 5), (req, res) => {
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
  const existingFilePaths = existing_files ? JSON.parse(existing_files) : [];
  const newFilePaths = req.files ? req.files.map(file => `/uploads/repair/${file.filename}`) : [];
  const allFilePaths = [...existingFilePaths, ...newFilePaths];
  const imageData = allFilePaths.length > 0 ? JSON.stringify(allFilePaths) : null;

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
      console.error("❌ Database error (update repair with files):", err);
      return res
        .status(500)
        .json({ message: "อัปเดตข้อมูลไม่สำเร็จ", error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "ไม่พบใบแจ้งซ่อมนี้" });
    }

    res.json({
      message: "✅ อัปเดตข้อมูลใบแจ้งซ่อมสำเร็จ",
      updated: result.affectedRows,
      new_files: req.files ? req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        path: `/uploads/repair/${file.filename}`,
        size: file.size
      })) : []
    });
  });
});

/* =========================
   FILE UPLOAD ENDPOINTS
   ========================= */

// อัพโหลดไฟล์สำหรับใบแจ้งซ่อม
app.post("/upload-repair-files", upload.array('files', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "กรุณาเลือกไฟล์สำหรับอัพโหลด" });
    }

    // สร้าง array ของ file paths
    const filePaths = req.files.map(file => `/uploads/repair/${file.filename}`);

    res.json({
      message: "อัพโหลดไฟล์สำเร็จ",
      files: req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        path: `/uploads/repair/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype
      })),
      filePaths: filePaths // สำหรับเก็บใน database
    });
  } catch (error) {
    console.error("❌ Error uploading files:", error);
    res.status(500).json({ message: "อัพโหลดไฟล์ไม่สำเร็จ", error: error.message });
  }
});

// ลบไฟล์
app.delete("/delete-file/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadDir, filename);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("❌ Error deleting file:", err);
      return res.status(500).json({ message: "ลบไฟล์ไม่สำเร็จ" });
    }
    res.json({ message: "ลบไฟล์สำเร็จ" });
  });
});

/* =========================
   HEALTH CHECK ENDPOINT
   ========================= */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development"
  });
// =========================
// PUT: แก้ไขข้อมูลผู้ใช้
// =========================
app.put("/edit-personal/:id", async (req, res) => {
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
    password, // รหัสผ่านใหม่ (optional)
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
    console.error("❌ Database error:", err);
    res.status(500).json({
      message: "อัปเดตข้อมูลไม่สำเร็จ",
      error: err.message,
    });
  }
});
//ดึงข้อมูลที่แก้ไขไปแล้ว
app.get("/user/:id", async (req, res) => {
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
    console.error("❌ Error GET /user/:id :", err);
    res.status(500).json({
      message: "ดึงข้อมูลผู้ใช้ล้มเหลว",
      error: err.message,
    });
  }

/* =========================
   SERVER START
   ========================= */
// ดึงคำนำหน้าชื่อทั้งหมด
app.get("/titles", authMiddleware, (req, res) => {
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
app.get("/roles", authMiddleware, (req, res) => {
  const sql = `
    SELECT 
      role_id,
      role_name,
      role_name AS role_label_th   -- ถ้าไม่มีคอลัมน์ role_label_th จริง ก็ alias ให้เท่ากันไปก่อน
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

// SERVER START
const PORT = process.env.PORT || 3000;
if (!process.env.JWT_SECRET)
  console.warn("WARNING: JWT_SECRET is not set in .env");

app.listen(PORT, () =>
  console.log(`FixDesk System running on port ${PORT}`)
);

/* ===============================
   GET /technician/repairs
   ดึงรายการแจ้งซ่อมที่มอบหมายให้ช่างที่ล็อกอิน
================================== */
app.get("/technician/repairs", authMiddleware, (req, res) => {
  const techId = req.user && req.user.us_id
  console.debug('GET /technician/repairs - requested by user id=', techId)
  if (!techId) return res.status(401).json({ message: 'ต้องแนบโทเคนที่ถูกต้อง' })

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
      console.error("❌ Error fetching technician repairs:", err)
      return res.status(500).json({
        message: "ดึงข้อมูลรายการแจ้งซ่อมของช่างไม่สำเร็จ",
        error: err.message,
      })
    }
    res.json(results)
  })
})

/* =========================
   GET /stock-forms (ดึงรายการใบเบิกทั้งหมด)
   ========================= */
app.get('/stock-forms', authMiddleware, (req, res) => {
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
      u.us_first_name_th AS requester_first_name,
      u.us_last_name_th AS requester_last_name,
      u.us_department AS requester_department,
      rf.rf_code AS related_rf_code,
      b.bd_name AS building_name,
      f.fl_name AS floor_name,
      r.room_name AS room_name
    FROM stock_form sf
    LEFT JOIN user u ON sf.sf_us_id = u.us_id
    LEFT JOIN repair_form rf ON sf.sf_rf_id = rf.rf_id
    LEFT JOIN room r ON rf.rf_room_id = r.room_id
    LEFT JOIN floor f ON r.room_fl_id = f.fl_id
    LEFT JOIN building b ON f.fl_bd_id = b.bd_id
    ORDER BY sf.sf_create_at DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Error fetching stock forms:', err);
      return res.status(500).json({ message: 'ดึงข้อมูลใบเบิกไม่สำเร็จ', error: err.message });
    }
    res.json(results);
  });
});

/* =========================
   GET /technician/my-stock-forms (ดึงรายการใบเบิกของผู้ใช้งานที่ล็อกอิน)
   ========================= */
app.get('/technician/my-stock-forms', authMiddleware, (req, res) => {
  const techId = req.user && req.user.us_id
  console.debug('GET /technician/my-stock-forms - requested by user id=', techId)
  if (!techId) return res.status(401).json({ message: 'ต้องแนบโทเคนที่ถูกต้อง' })

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
      console.error('❌ Error fetching my stock forms:', err);
      return res.status(500).json({ message: 'ดึงข้อมูลใบเบิกของผู้ใช้ไม่สำเร็จ', error: err.message });
    }
    res.json(results);
  });
});