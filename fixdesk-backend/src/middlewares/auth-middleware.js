const jwt = require("jsonwebtoken");

require("dotenv").config();

// Middleware: ตรวจสอบว่าผู้ใช้มี Token ที่ถูกต้องหรือไม่
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
