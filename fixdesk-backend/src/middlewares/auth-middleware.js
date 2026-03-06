/**
 * =====================================================================
 * @file            verifyToken.middleware.js
 * @layer           Middleware Layer (Security Middleware)
 * @version         1.0.2
 * @since           2026-02-10
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *   - ปฏิพัทธ์ จงนันทพันธ์กุล
 *
 * @lastModified    2026-02-20
 * @lastModifiedBy  ปฏิพัทธ์ จงนันทพันธ์กุล
 * ---------------------------------------------------------------------
 * @description
 *  Middleware สำหรับตรวจสอบความถูกต้องของ JWT Token
 *  ใช้เพื่อป้องกันการเข้าถึง API โดยผู้ที่ไม่ได้รับอนุญาต
 *
 *  การทำงาน:
 *    - ตรวจสอบ Authorization Header
 *    - ตรวจสอบรูปแบบ Bearer Token
 *    - Verify JWT Token ด้วย JWT_SECRET
 *    - แนบข้อมูลผู้ใช้งานไว้ใน req.user
 *    - อนุญาตให้ request ไปยัง middleware หรือ controller ถัดไป
 *
 * @usedBy
 *   - repair.route.js
 *   - stock.route.js
 *   - user.route.js
 *   - tech.route.js
 *   - และ protected routes อื่น ๆ
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - Initial implementation JWT Verification Middleware
 *     [2026-02-10, พชร ไพศรีสกุล] V1.0.0
 *   - แก้ไขข้อความแจ้งเตือน Token ไม่ถูกต้อง/หมดอายุ   
 *     [2026-02-20, ปฏิพัทธ์ จงนันทพันธ์กุล] V1.0.1
 *   - แก้ไข alert
 *     [2026-03-06, เศรษฐพงศ์ หอมชื่น] V1.0.2
 * =====================================================================
 */

const jwt = require("jsonwebtoken");

require("dotenv").config();

/**
 * Middleware สำหรับตรวจสอบ JWT Token
 *
 * ตรวจสอบ Authorization Header และ verify Token
 * หากถูกต้อง จะเพิ่มข้อมูลผู้ใช้ใน req.user
 *
 * @author พชร ไพศรีสกุล
 * @since 2026-02-10
 * @lastModified 2026-02-10
 * @lastModifiedBy พชร ไพศรีสกุล
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 *
 * @returns {void}
 */
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
      message: "คุณไม่ได้ใช้งานเป็นระยะเวลาหนึ่ง กรุณาลงชื่อเข้าสู่ระบบใหม่",
    });
  }
};

module.exports = verifyToken;
