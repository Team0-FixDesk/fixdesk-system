require('dotenv').config()
const mysql = require('mysql2')

// =============================
// CONFIGURATION
// =============================
const DB_NAME = process.env.DB_NAME || 'fixdesk_db'
const RESET_DB = true // ⚠️ true = ล้าง DB เดิมก่อนสร้างใหม่ (ใช้เฉพาะตอนทดสอบ)

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'dekdee2.informatics.buu.ac.th',
  user: process.env.DB_USER || 'teamzero',
  password: process.env.DB_PASSWORD || 'team0root0',
  port: Number(process.env.DB_PORT) || 3306,
  multipleStatements: true,
  charset: 'utf8mb4',
})

// =============================
// CONNECT DATABASE
// =============================
db.connect((err) => {
  if (err) {
    console.error('❌ MySQL connection error:', err)
    return
  }
  console.log('✅ Connected to MySQL Server')

  // =============================
  // INIT DATABASE
  // =============================
  const initDbSQL = `
${RESET_DB ? `DROP DATABASE IF EXISTS \`${DB_NAME}\`;` : ``}
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;
USE \`${DB_NAME}\`;
SET NAMES utf8mb4 COLLATE utf8mb4_general_ci;
`

  // =============================
  // CREATE TABLES (FULL STRUCTURE)
  // =============================
  const createTablesSQL = `
-- ===================================
-- DATABASE STRUCTURE : FIXDESK SYSTEM (UTF8MB4)
-- Version: 2.0.1  (2025-10-23)
-- ===================================
-- ✔ Compliant with FixDesk Coding Standard v1.5.2
-- ✔ Aligned with DGA 4-2565 (Mapping-ready)

-- 1️⃣ Title Name (Reference / Mapping: cr:PersonNameTitle)
CREATE TABLE title_name (
  ttn_id INT AUTO_INCREMENT PRIMARY KEY,
  ttn_title_th VARCHAR(50) NOT NULL,       -- ชื่อคำนำหน้า (ไทย)
  ttn_title_en VARCHAR(50),                -- ชื่อคำนำหน้า (อังกฤษ)
  ttn_sex ENUM('M','F','O') DEFAULT 'O'    -- เพศของคำนำหน้า (M=ชาย, F=หญิง, O=อื่นๆ)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

INSERT INTO title_name (ttn_title_th, ttn_title_en, ttn_sex) VALUES
('นาย', 'Mr.', 'M'),
('นาง', 'Mrs.', 'F'),
('นางสาว', 'Ms.', 'F'),
('อื่นๆ', 'Other', 'O');

-- 2️⃣ Technician Type (Reference)
CREATE TABLE technician_type (
  tt_id INT AUTO_INCREMENT PRIMARY KEY,
  tt_name VARCHAR(100) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

INSERT INTO technician_type (tt_name) VALUES ('ไฟฟ้า'), ('ประปา');

-- 3️⃣ Role (System Reference)
CREATE TABLE role (
  role_id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

INSERT INTO role (role_name)
VALUES ('Admin'), ('Technician'), ('Stock'), ('Manager'), ('User');

-- 4️⃣ Building (Reference)
CREATE TABLE building (
  bd_id INT AUTO_INCREMENT PRIMARY KEY,
  bd_name VARCHAR(100) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

INSERT INTO building (bd_name) VALUES ('อาคาร 1');

-- 5️⃣ Floor (Reference)
CREATE TABLE floor (
  fl_id INT AUTO_INCREMENT PRIMARY KEY,
  fl_name VARCHAR(100) NOT NULL,
  fl_bd_id INT,
  FOREIGN KEY (fl_bd_id) REFERENCES building(bd_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

INSERT INTO floor (fl_name, fl_bd_id) VALUES ('ชั้น 1', 1);

-- 6️⃣ Room (Reference)
CREATE TABLE room (
  room_id INT AUTO_INCREMENT PRIMARY KEY,
  room_name VARCHAR(100) NOT NULL,
  room_fl_id INT,
  FOREIGN KEY (room_fl_id) REFERENCES floor(fl_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

INSERT INTO room (room_name, room_fl_id) VALUES ('ห้อง 101', 1);

-- 7️⃣ User (Core Data / Mapping: cd:Person, cd:PersonNameType)
CREATE TABLE user (
  us_id INT AUTO_INCREMENT PRIMARY KEY,
  us_user_name VARCHAR(255) NOT NULL,       -- ชื่อผู้ใช้เข้าสู่ระบบ
  us_user_pass VARCHAR(255) NOT NULL,       -- รหัสผ่าน (เข้ารหัสผ่านระบบ)
  us_ttn_id INT,                            -- FK → title_name (cr:PersonNameTitle)
  us_first_name_th VARCHAR(100) NOT NULL,   -- ชื่อ (ไทย)
  us_last_name_th VARCHAR(100) NOT NULL,    -- นามสกุล (ไทย)
  us_first_name_en VARCHAR(100),            -- ชื่อ (อังกฤษ)
  us_last_name_en VARCHAR(100),             -- นามสกุล (อังกฤษ)
  us_phone VARCHAR(15),                     -- เบอร์โทรศัพท์ (Mapping: contactFormat:telNumberTH)
  us_department VARCHAR(255),               -- หน่วยงาน
  us_role_id INT,                           -- บทบาทผู้ใช้
  us_tt_id INT,                             -- ประเภทช่าง (ถ้ามี)
  FOREIGN KEY (us_ttn_id) REFERENCES title_name(ttn_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  FOREIGN KEY (us_role_id) REFERENCES role(role_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  FOREIGN KEY (us_tt_id) REFERENCES technician_type(tt_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- ⚠️ ข้อมูลผู้ใช้จะถูกเพิ่มผ่านระบบ (เข้ารหัสผ่าน Backend)

-- 8️⃣ Repair Form (Transaction Data)
CREATE TABLE repair_form (
  rf_id INT AUTO_INCREMENT PRIMARY KEY,
  rf_code VARCHAR(100) NOT NULL,             -- รหัสใบแจ้งซ่อม
  rf_us_id INT,                              -- ผู้แจ้งซ่อม
  rf_phone VARCHAR(15),                      -- เบอร์ผู้แจ้ง
  rf_tt_id INT,                              -- ประเภทช่างที่รับผิดชอบ
  rf_prop_number VARCHAR(100),               -- หมายเลขครุภัณฑ์
  rf_problem VARCHAR(255),                   -- ปัญหาที่แจ้ง
  rf_room_id INT,                            -- ห้องที่แจ้งซ่อม
  rf_detail VARCHAR(255),                    -- รายละเอียดเพิ่มเติม
  rf_image VARCHAR(255),                     -- รูปภาพแนบ

  -- สถานะฝั่งผู้ใช้ (ใช้ 3 สถานะหลัก + cancel เผื่อในอนาคต)
  rf_user_status ENUM('pending','in_progress','done','cancel')
    DEFAULT 'pending',

  -- สถานะฝั่งช่าง (ถ้ายังไม่ใช้มาก ปล่อยไว้ก่อนได้)
  rf_tech_status ENUM('working','waiting_stock','hire_outsource','closed','paused_or_canceled')
    DEFAULT 'working',

  rf_urgency ENUM('low','medium','high') DEFAULT 'medium',

  -- เวลาเกี่ยวกับใบแจ้งซ่อม
  rf_create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,           -- เวลาสร้างใบแจ้งซ่อม
  rf_update_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,                              -- เวลาอัปเดตครั้งล่าสุด

  -- เวลาอิงตามสถานะ
  rf_in_process_at DATETIME NULL,                             -- เวลาเปลี่ยนเป็น "กำลังดำเนินการ"
  rf_done_at DATETIME NULL,                                   -- เวลาเปลี่ยนเป็น "ดำเนินการเสร็จสิ้น"

  FOREIGN KEY (rf_us_id) REFERENCES user(us_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  FOREIGN KEY (rf_tt_id) REFERENCES technician_type(tt_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  FOREIGN KEY (rf_room_id) REFERENCES room(room_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;


-- 9️⃣ Stock Form (Transaction Data)
CREATE TABLE stock_form (
  sf_id INT AUTO_INCREMENT PRIMARY KEY,
  sf_code VARCHAR(100) NOT NULL,              -- รหัสใบเบิกของ
  sf_us_id INT,                               -- ผู้เบิกของ
  sf_rf_id INT,                               -- ใบแจ้งซ่อมที่เกี่ยวข้อง
  sf_urgency ENUM('low','medium','high') DEFAULT 'medium',
  sf_status ENUM('waiting','approved','rejected','completed') DEFAULT 'waiting',
  sf_create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,    -- Mapping: DateFormat:basicDateTH
  sf_update_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sf_us_id) REFERENCES user(us_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  FOREIGN KEY (sf_rf_id) REFERENCES repair_form(rf_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
`

  // =============================
  // EXECUTE
  // =============================
  db.query(initDbSQL + createTablesSQL, (err) => {
    if (err) {
      console.error('❌ Failed to create database/tables:', err)
    } else {
      console.log('✅ Database and tables created successfully!')
      console.log('📘 Schema is fully compliant with FixDesk v2.0.1 (no building link in stock_form).')
    }
    db.end()
  })
})
