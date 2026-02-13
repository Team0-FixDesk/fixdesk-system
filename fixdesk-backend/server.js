require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

// นำเข้าตัวเชื่อมต่อฐานข้อมูลจากไฟล์ config
const databaseConnection = require("./config/database");

const app = express();

// --- Middleware Setup ---
// อนุญาตให้เว็บอื่นเรียกใช้ API ได้
app.use(cors());
// รองรับการรับส่งข้อมูลแบบ JSON
app.use(express.json());
// เปิดให้เข้าถึงไฟล์ในโฟลเดอร์ uploads ได้โดยตรง
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- Routes Setup (โหลดไฟล์เส้นทางต่างๆ) ---
// ส่ง databaseConnection เข้าไปในแต่ละ Route (ตามโครงสร้างเดิมของคุณ)
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

// --- Register Routes (เปิดใช้งานเส้นทาง) ---
app.use(authRoutes);
app.use("/public", publicRoutes);
app.use(userRoutes);
app.use(technicianRoutes);
app.use(locationRoutes);
app.use(repairFormRoutes);
app.use(stockRoutes);

// --- System Health Check (เช็คสถานะเซิร์ฟเวอร์) ---
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// --- Server Start ---
const serverPort = process.env.PORT || 3000;

// แจ้งเตือนถ้าลืมใส่ Secret Key ใน .env
if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET is not set in .env");
}

// เริ่มรันเซิร์ฟเวอร์
app.listen(serverPort, () => {
  console.log(`FixDesk System running on port ${serverPort}`);
});
