/**
 * =====================================================================
 * @file            verifyToken.middleware.js
 * @layer           Middleware Layer (Security Middleware)
 * @version         1.0.0
 * @since           2026-02-10
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *
 * @lastModified    2026-02-10
 * @lastModifiedBy  พชร ไพศรีสกุล
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
 *     [2026-02-10, พชร ไพศรีสกุล] V 1.0.0
 *
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
      message: "ไม่พบ Token หรือรูปแบบไม่ถูกต้อง (Bearer <token>)",
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
      message: "Token ไม่ถูกต้องหรือหมดอายุ",
    });
  }
};

module.exports = verifyToken;
