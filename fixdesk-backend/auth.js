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
    req.user = decoded // { us_id, us_user_name, role_name }
    next()
  } catch (err) {
    return res.status(401).json({ message: 'โทเคนไม่ถูกต้องหรือหมดอายุ' })
  }
}

// =============================
// สร้าง JWT Token
// =============================
function signToken(user) {
  if (!process.env.JWT_SECRET)
    throw new Error('JWT_SECRET not configured')

  const payload = {
    us_id: user.us_id,
    us_user_name: user.us_user_name,
    role_name: user.role_name,
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '7d',
  })
}

module.exports = { authMiddleware, signToken }
