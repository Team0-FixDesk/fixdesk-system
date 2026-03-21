/**
 * =====================================================================
 * @file            server.js
 * @layer           Application Layer (Entry Point)
 * @version         1.0.1
 * @since           2026-02-10
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *
 * @lastModified    2026-02-10
 * @lastModifiedBy  พชร ไพศรีสกุล
 * ---------------------------------------------------------------------
 * @description
 *  ไฟล์หลักสำหรับเริ่มต้นระบบ FixDesk Backend
 *  ทำหน้าที่:
 *    - โหลด Environment Variables
 *    - ตั้งค่า Middleware
 *    - เชื่อมต่อฐานข้อมูล
 *    - ลงทะเบียน Routes
 *    - เปิดใช้งาน HTTP Server
 *
 *  โครงสร้างเป็นแบบ Layered Architecture
 * 
 * @useby
 *  - เป็นจุดเริ่มต้นของแอปพลิเคชัน ใช้สำหรับรันเซิร์ฟเวอร์และจัดการการเชื่อมต่อกับฐานข้อมูล รวมถึงการลงทะเบียน Route Modules ต่างๆ ที่จะให้บริการ API สำหรับระบบ FixDesk
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  [2026-02-18, พชร ไพศรีสกุล] V 1.0.0
 *   - Initial implementation Application Entry Point
 *  [2026-03-21, พชร ไพศรีสกุล] V 1.0.1
 *   - เพิ่ม templateRoutes และเชื่อมต่อกับ databaseConnection
 *
 * =====================================================================
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

// นำเข้าตัวเชื่อมต่อฐานข้อมูลจากไฟล์ config
const databaseConnection = require("./config/database");

const app = express();

// --- MIDDLEWARE CONFIGURATION ---
// เปิดใช้งาน CORS อนุญาตให้ Frontend หรือ Domain อื่นเรียกใช้ API
app.use(cors());

// รองรับการรับส่งข้อมูลแบบ JSON
app.use(express.json());

/**
 * เปิดให้เข้าถึงไฟล์ในโฟลเดอร์ uploads แบบ Static
 * @route GET /uploads/*
 */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- ROUTE REGISTRATION ---
/**
 * โหลด Route Modules
 * และส่ง databaseConnection เข้าไปในแต่ละ Route
 */
const authRoutes = require("./src/routes/auth-routes")(databaseConnection);
const publicRoutes = require("./src/routes/public-routes")(databaseConnection);
const userRoutes = require("./src/routes/user-routes")(databaseConnection);
const technicianRoutes = require("./src/routes/technician-routes")(
  databaseConnection,
);
const locationRoutes = require("./src/routes/location-routes")(
  databaseConnection,
);
const repairFormRoutes = require("./src/routes/repair-routes")(
  databaseConnection,
);
const stockRoutes = require("./src/routes/stock-routes")(databaseConnection);

const templateRoutes = require("./src/routes/template-routes")(
  databaseConnection,
);
// --- Register Routes (เปิดใช้งานเส้นทาง | ลงทะเบียน Route กับ Express Application) ---
app.use(authRoutes);
app.use("/public", publicRoutes);
app.use(userRoutes);
app.use(technicianRoutes);
app.use(locationRoutes);
app.use(repairFormRoutes);
app.use(stockRoutes);
app.use(templateRoutes);

// --- System Health Check (เช็คสถานะเซิร์ฟเวอร์) ---
/**
 * GET /health
 * ใช้ตรวจสอบสถานะของเซิร์ฟเวอร์
 * @route GET /health
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// --- SERVER INITIALIZATION ---
// กำหนด Port สำหรับรันเซิร์ฟเวอร์
const serverPort = process.env.PORT || 3000;

// แจ้งเตือนถ้าลืมใส่ Secret Key ใน .env
if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET is not set in .env");
}

// เริ่มรันเซิร์ฟเวอร์
app.listen(serverPort, () => {
  console.log(`FixDesk System running on port ${serverPort}`);
});
