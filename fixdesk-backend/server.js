/**
 * =====================================================================
 * @file            server.js
 * @layer           Application Layer (Entry Point)
 * @version         1.0.0
 * @since           2026-02-10
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *
 * @lastModified    2026-03-21
 * @lastModifiedBy  นราธิป แสนทวีสุข
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
 * ---------------------------------------------------------------------
 * @changelog
 *   - Initial implementation Application Entry Point
 *     [2026-02-18, พชร ไพศรีสกุล] V 1.0.0
 *   - เพิ่ม Global Error Handler ช่วยดักจับและแสดงข้อผิดพลาดจาก Multer
 *     [2026-03-21, นราธิป แสนทวีสุข]
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

// --- Register Routes (เปิดใช้งานเส้นทาง | ลงทะเบียน Route กับ Express Application) ---
app.use(authRoutes);
app.use("/public", publicRoutes);
app.use(userRoutes);
app.use(technicianRoutes);
app.use(locationRoutes);
app.use(repairFormRoutes);
app.use(stockRoutes);

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

app.use((err, req, res, next) => {
  console.error("Global Error:", err);
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "File too large. Max 50MB." });
  }
  if (err instanceof require("multer").MulterError) {
    return res.status(400).json({ message: `Multer Error: ${err.message}` });
  }
  return res.status(500).json({ message: "Internal Server Error", error: err.message });
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
