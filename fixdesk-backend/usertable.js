require('dotenv').config()
const mysql = require('mysql2')

// =============================
// CONFIG
// =============================
const DB_NAME = process.env.DB_NAME || 'fixdesk_db'
const RESET_DB = true // ถ้า true จะลบแล้วสร้างใหม่ (เหมาะกับทดสอบ)
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

  // 1️⃣ INIT DATABASE
  const initDbSQL = `
${RESET_DB ? `DROP DATABASE IF EXISTS \`${DB_NAME}\`;` : ``}
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;
USE \`${DB_NAME}\`;
SET NAMES utf8mb4 COLLATE utf8mb4_general_ci;
`

  // 2️⃣ CREATE TABLES + INSERTS
  const createAndSeedSQL = `
-- ===================================
-- DATABASE STRUCTURE : FIX SYSTEM (UTF8MB4 Ready + Sample Data)
-- ===================================

-- 1. Technician Type
CREATE TABLE technician_type (
    tt_id INT AUTO_INCREMENT PRIMARY KEY,
    tt_name VARCHAR(100) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

INSERT INTO technician_type (tt_name) VALUES
('ไฟฟ้า'),
('ประปา');

-- 2. Role
CREATE TABLE role (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

INSERT INTO role (role_name) VALUES
('Admin'),
('Technician'),
('Stock'),
('Manager'),
('User');

-- 3. Building
CREATE TABLE building (
    bd_id INT AUTO_INCREMENT PRIMARY KEY,
    bd_name VARCHAR(100) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

INSERT INTO building (bd_name) VALUES ('อาคาร 1');

-- 4. Floor
CREATE TABLE floor (
    fl_id INT AUTO_INCREMENT PRIMARY KEY,
    fl_name VARCHAR(100) NOT NULL,
    fl_bd_id INT,
    FOREIGN KEY (fl_bd_id) REFERENCES building(bd_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

INSERT INTO floor (fl_name, fl_bd_id) VALUES ('ชั้น 1', 1);

-- 5. Room
CREATE TABLE room (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    room_name VARCHAR(100) NOT NULL,
    room_fl_id INT,
    FOREIGN KEY (room_fl_id) REFERENCES floor(fl_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

INSERT INTO room (room_name, room_fl_id) VALUES ('ห้อง 101', 1);

-- 6. User
CREATE TABLE user (
    us_id INT AUTO_INCREMENT PRIMARY KEY,
    us_user_name VARCHAR(255) NOT NULL,
    us_user_pass VARCHAR(255) NOT NULL,
    us_name VARCHAR(100) NOT NULL,
    us_phone VARCHAR(15),
    us_department VARCHAR(255),
    us_role_id INT,
    us_tt_id INT,
    FOREIGN KEY (us_role_id) REFERENCES role(role_id),
    FOREIGN KEY (us_tt_id) REFERENCES technician_type(tt_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- 7. Repair Form
CREATE TABLE repair_form (
    rf_id INT AUTO_INCREMENT PRIMARY KEY,
    rf_code VARCHAR(100) NOT NULL,
    rf_us_id INT,
    rf_phone VARCHAR(15),
    rf_tt_id INT,
    rf_prop_number VARCHAR(100),
    rf_problem VARCHAR(255),
    rf_room_id INT,
    rf_detail VARCHAR(255),
    rf_image VARCHAR(255),
    rf_user_status ENUM('pending','in_progress','done','cancel') DEFAULT 'pending',
    rf_tech_status ENUM('working','waiting_stock','hire_outsource','closed','paused_or_canceled') DEFAULT 'working',
    rf_urgency ENUM('low','medium','high') DEFAULT 'medium',
    rf_create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rf_update_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rf_us_id) REFERENCES user(us_id),
    FOREIGN KEY (rf_tt_id) REFERENCES technician_type(tt_id),
    FOREIGN KEY (rf_room_id) REFERENCES room(room_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- 8. Stock Form
CREATE TABLE stock_form (
    sf_id INT AUTO_INCREMENT PRIMARY KEY,
    sf_code VARCHAR(100) NOT NULL,
    sf_us_id INT,
    sf_rf_id INT,
    sf_urgency ENUM('low','medium','high') DEFAULT 'medium',
    sf_status ENUM('waiting','approved','rejected','completed') DEFAULT 'waiting',
    sf_bd_id INT,
    sf_create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sf_update_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sf_us_id) REFERENCES user(us_id),
    FOREIGN KEY (sf_rf_id) REFERENCES repair_form(rf_id),
    FOREIGN KEY (sf_bd_id) REFERENCES building(bd_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
`

  // 3️⃣ EXECUTE
  db.query(initDbSQL + createAndSeedSQL, (err) => {
    if (err) {
      console.error('❌ Failed to create database/tables:', err)
    } else {
      console.log('✅ Database, tables, and seed data created successfully!')
    }
    db.end()
  })
})
