const mysql = require("mysql2");

require("dotenv").config();

// กำหนดค่าการเชื่อมต่อฐานข้อมูล
const databaseConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "fixdesk_db",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  charset: "utf8mb4",
};

// สร้างการเชื่อมต่อ
const databaseConnection = mysql.createConnection(databaseConfig);

// เริ่มเชื่อมต่อและตรวจสอบ Error
databaseConnection.connect((error) => {
  if (error) {
    console.error("Database connection failed:", error);
    process.exit(1); // จบการทำงานทันทีถ้าต่อไม่ได้
  }
  console.log("Connected to Database successfully");
});

module.exports = databaseConnection;
