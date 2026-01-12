require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const path = require("path");

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

const authRoutes = require("./src/auth")(db);
const publicRoutes = require("./src/public")(db);
const userRoutes = require("./src/user")(db);
const technicianRoutes = require("./src/technician")(db);
const locationRoutes = require("./src/location")(db);
const repairFormRoutes = require("./src/repairform")(db);
const stockRoutes = require("./src/stock")(db);

app.use(authRoutes);
app.use("/public", publicRoutes);
app.use(userRoutes);
app.use(technicianRoutes);
app.use(locationRoutes);
app.use(repairFormRoutes);
app.use(stockRoutes);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET)
  console.warn("WARNING: JWT_SECRET is not set in .env");

app.listen(PORT, () => console.log(`FixDesk System running on port ${PORT}`));
