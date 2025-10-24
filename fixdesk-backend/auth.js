require('dotenv').config()
const jwt = require('jsonwebtoken')

// =============================
// Middleware ตรวจสอบ Token
// =============================
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  const [type, token] = header.split(' ')

  if (type?.toLowerCase() !== 'bearer' || !token)
    return res.status(401).json({ message: 'ต้องแนบโทเคน (Bearer <token>)' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded // เก็บข้อมูลผู้ใช้ไว้ใน req.user
    next()
  } catch (err) {
    return res.status(401).json({ message: 'โทเคนไม่ถูกต้องหรือหมดอายุ' })
  }
}

// =============================
// สร้าง JWT Token พร้อมข้อมูลผู้ใช้
// =============================
function signToken(user) {
  if (!process.env.JWT_SECRET)
    throw new Error('JWT_SECRET not configured')

  // ✅ เพิ่มข้อมูลที่ต้องการให้ฝั่ง Frontend ใช้
  const payload = {
    us_id: user.us_id,
    us_user_name: user.us_user_name,
    us_prefix_th: user.us_prefix_th || '',        // คำนำหน้า (นาย/นาง/นางสาว)
    us_first_name_th: user.us_first_name_th || '', // ชื่อ
    us_last_name_th: user.us_last_name_th || '',   // นามสกุล
    us_tel: user.us_tel || '',                     // เบอร์โทรศัพท์
    us_department: user.us_department || '',       // หน่วยงาน
    role_name: user.role_name || '',               // บทบาท
  }

  // 🔐 เซ็น token
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '7d',
  })
}

module.exports = { authMiddleware, signToken }
