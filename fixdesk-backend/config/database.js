const mysql = require("mysql2");
require("dotenv").config();

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

// ⭐ ใช้ Pool แทน Connection
const databasePool = mysql.createPool(databaseConfig);

// ทดสอบการเชื่อมต่อครั้งแรก
databasePool.getConnection((error, connection) => {
  if (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
  console.log("Connected to Database successfully");
  connection.release();
});

module.exports = databasePool;
