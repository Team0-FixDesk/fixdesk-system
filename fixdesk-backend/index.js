require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const path = require("path");
const { authMiddleware, signToken } = require("./auth");
const app = express();

app.use(cors());
app.use(express.json());

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "fixdesk_db",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  charset: "utf8mb4",
};

const db = mysql.createConnection(DB_CONFIG);


db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
  console.log("Connected to Database");
});

const publicRoutes = require("./src/public")(db);
const UserRoutes = require("./src/user");
const TechnicianRoutes = require("./src/technician");
const LocationRoutes = require("./src/location");
const RepairFormRoutes = require("./src/repairform");
const StockRoutes = require("./src/stock");

const userRoutes = UserRoutes(db);
const technicianRoutes = TechnicianRoutes(db);
const locationRoutes = LocationRoutes(db);
const repairFormRoutes = RepairFormRoutes(db);
const stockRoutes = StockRoutes(db);

app.use("/public", publicRoutes);
app.use(userRoutes);
app.use(technicianRoutes);
app.use(locationRoutes);
app.use(repairFormRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(stockRoutes);

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
    if (err) {
      console.error("[AUTH][LOGIN]", err.message);
      return res.status(500).json({
        message: "Internal Server Error",
      });
    }

    if (!results.length)
      return res.status(401).json({ message: "ชื่อผู้ใช้ไม่ถูกต้อง" });

    const user = results[0];
    const match = await bcrypt.compare(password, user.us_user_pass);

    if (!match) return res.status(401).json({ message: "รหัสผ่านไม่ถูกต้อง" });

    const payload = {
      us_id: user.us_id,
      us_user_name: user.us_user_name,
      us_prefix_th: user.ttn_title_th || "",
      us_first_name_th: user.us_first_name_th || "",
      us_last_name_th: user.us_last_name_th || "",
      us_first_name_en: user.us_first_name_en || "",
      us_last_name_en: user.us_last_name_en || "",
      us_tel: user.us_phone || "",
      us_department: user.us_department || "",
      role_name: user.role_name || "",
    };

    const token = signToken(payload);
    res.json({ token });
  });
});

// SERVER START
const PORT = process.env.PORT || 3000;
if (!process.env.JWT_SECRET)
  console.warn("WARNING: JWT_SECRET is not set in .env");
app.listen(PORT, () => console.log(`FixDesk System running on port ${PORT}`));

// HEALTH CHECK ENDPOINT
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});
