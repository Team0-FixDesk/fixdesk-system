/**
 * =====================================================================
 * @file            database.js
 * @layer           Configuration Layer (Database Configuration)
 * @version         1.0.0
 * @since           2026-02-10
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *
 * @lastModified    2026-02-13
 * @lastModifiedBy  พชร ไพศรีสกุล
 * ---------------------------------------------------------------------
 * @description
 *  ไฟล์สำหรับกำหนดค่าและสร้างการเชื่อมต่อฐานข้อมูล MySQL
 *  โดยใช้ mysql2 connection pool เพื่อเพิ่มประสิทธิภาพ
 *  และรองรับการเชื่อมต่อพร้อมกันหลาย request
 *
 *  รองรับการทำงาน:
 *    - โหลดค่าการเชื่อมต่อจาก environment variables
 *    - สร้าง connection pool
 *    - ทดสอบการเชื่อมต่อฐานข้อมูล
 *    - export pool เพื่อให้ module อื่นใช้งาน
 *
 * @requires
 *   - mysql2
 *   - dotenv
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - Initial implementation Database Configuration
 *     [2026-02-18, พชร ไพศรีสกุล] V 1.0.0
 *
 * =====================================================================
 */

const mysql = require("mysql2");
require("dotenv").config();

/**
 * การตั้งค่าการเชื่อมต่อฐานข้อมูล
 * โหลดค่าจาก environment variables
 * และกำหนดค่า default หากไม่ได้ตั้งค่าไว้
 *
 * @type {Object}
 */
const databaseConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "fixdesk_db",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  charset: "utf8mb4",

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

/**
 * สร้าง Connection Pool สำหรับฐานข้อมูล
 * ใช้ Pool แทน Connection ปกติ
 * เพื่อเพิ่ม performance และรองรับ concurrent requests
 *
 * @type {import("mysql2").Pool}
 */
const databasePool = mysql.createPool(databaseConfig);

/**
 * ทดสอบการเชื่อมต่อฐานข้อมูลครั้งแรก
 * หากเชื่อมต่อไม่สำเร็จ จะหยุดการทำงานของ server
 *
 * @function testDatabaseConnection
 */
databasePool.getConnection((error, connection) => {
  if (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
  console.log("Connected to Database successfully");
  connection.release();
});

module.exports = databasePool;
