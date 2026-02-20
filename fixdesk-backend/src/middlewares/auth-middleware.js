/**
 * =====================================================================
 * @file            auth-middleware.js
 * @layer           Middleware (Authentication Layer)
 * @version         1.0.0
 * @since           2026-02-10
 * @author          พชร ไพศรีสกุล
 * @lastModified    2026-02-20
 * @lastModifiedBy  ปฏิพัทธ์ จงนันทพันธ์กุล
 * ---------------------------------------------------------------------
 * @description
 *  Middleware สำหรับตรวจสอบความถูกต้องของ JWT Token
 *
 *  ความสามารถ:
 *   - ตรวจสอบ Authorization Header ว่ามีค่าและอยู่ในรูปแบบ "Bearer <token>"
 *   - ตรวจสอบลายเซ็นของ JWT ด้วย JWT_SECRET
 *   - ตรวจจับกรณี Token หมดอายุ หรือถูกปลอมแปลง
 *   - แนบข้อมูลผู้ใช้ (decoded token) ไปที่ req.user
 *   - ส่ง HTTP 401 หาก Token ไม่ถูกต้อง
 *
 * @requires
 *   - jsonwebtoken
 *   - dotenv
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - แก้ไขข้อความแจ้งเตือน Token ไม่ถูกต้อง/หมดอายุ   [2026-02-20, ปฏิพัทธ์ จงนันทพันธ์กุล]
 * =====================================================================
 */

const jwt = require("jsonwebtoken");

require("dotenv").config();

// Middleware: ตรวจสอบว่าผู้ใช้มี Token ที่ถูกต้องหรือไม่
const verifyToken = (req, res, next) => {
  // ดึงค่า Authorization จาก Header
  const authHeader = req.headers.authorization;

  // ตรวจสอบว่ามีค่าส่งมาไหม และต้องขึ้นต้นด้วย "Bearer "
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "เกิดข้อผิดพลาด ข้อมูลยืนยันตัวตนไม่ถูกต้อง กรุณาลงชื่อเข้าสู่ระบบใหม่อีกครั้ง",
    });
  }

  // แยกเอาเฉพาะตัว Token (ตัดคำว่า Bearer ออก)
  const token = authHeader.split(" ")[1];

  try {
    // ตรวจสอบลายเซ็นของ Token ว่าถูกต้องไหม
    const decodedUser = jwt.verify(token, process.env.JWT_SECRET);

    // ถ้าผ่าน แนบข้อมูลผู้ใช้ไปกับ Request เพื่อให้ฟังก์ชันถัดไปใช้ต่อ
    req.user = decodedUser;

    // ไปทำงานต่อ
    next();
  } catch (error) {
    // ถ้า Token หมดอายุ หรือถูกปลอมแปลง
    return res.status(401).json({
      message: "คุณไม่ได้ใช้งานเป็นระยะเวลาหนึ่ง กรุณาลงชื่อเข้าสู่ระบบใหม่อีกครั้ง",
    });
  }
};

module.exports = verifyToken;
