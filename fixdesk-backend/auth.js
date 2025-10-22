const jwt = require('jsonwebtoken')

// Middleware ตรวจสอบ Token
function authMiddleware(req, res, next) {
  const h = req.headers.authorization || ''
  const [type, token] = h.split(' ')
  if (type !== 'Bearer' || !token)
    return res.status(401).json({ message: 'ต้องแนบโทเคน (Bearer <token>)' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret')
    req.user = decoded // { users_id, user_name, role_user }
    next()
  } catch {
    return res.status(401).json({ message: 'โทเคนไม่ถูกต้องหรือหมดอายุ' })
  }
}

// สร้าง JWT Token
function signToken(user) {
  const payload = {
    us_id: user.us_id,
    us_user_name: user.us_user_name,
    role_name: user.role_name,
  }
  return jwt.sign(payload, process.env.JWT_SECRET || 'devsecret', {
    expiresIn: process.env.JWT_EXPIRES || '7d',
  })
}

module.exports = { authMiddleware, signToken }
