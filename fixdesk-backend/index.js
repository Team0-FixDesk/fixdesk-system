require('dotenv').config()
const express = require('express')
const mysql = require('mysql2')
const cors = require('cors')
const bcrypt = require('bcrypt') // ✅ เพิ่มเข้ามา
const { authMiddleware, signToken } = require('./auth')

const app = express()
app.use(cors())
app.use(express.json())

/* =========================
   Database Connection
   ========================= */
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fixdesk_db',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
})

db.connect((err) => {
  if (err) {
    console.error('❌ MySQL connection failed:', err)
    process.exit(1)
  }
  console.log('✅ Connected to MySQL')
})

/* =========================
   LOGIN (with bcrypt)
   ========================= */
app.post('/auth/login', (req, res) => {
  const { user_name, password } = req.body
  if (!user_name || !password)
    return res.status(400).json({ message: 'กรุณากรอก user_name และ password' })

  const query = `
    SELECT u.us_id, u.us_user_name, u.us_user_pass, r.role_name
    FROM user u
    LEFT JOIN role r ON u.us_role_id = r.role_id
    WHERE u.us_user_name=? LIMIT 1
  `
  db.query(query, [user_name], async (err, results) => {
    if (err) return res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message })
    if (!results.length) return res.status(401).json({ message: 'ชื่อผู้ใช้ไม่ถูกต้อง' })

    const user = results[0]
    const match = await bcrypt.compare(password, user.us_user_pass) // ✅ ตรวจรหัสผ่านแบบเข้ารหัส

    if (!match) return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' })

    const payload = {
      us_id: user.us_id,
      us_user_name: user.us_user_name,
      role_name: user.role_name,
    }

    const token = signToken(payload)
    res.json({ token })
  })
})

/* =========================
   POST /users (add user) — with bcrypt
   ========================= */
app.post('/users', async (req, res) => {
  const { us_user_name, us_user_pass, us_name, us_phone, us_department, us_role_id, us_tt_id } = req.body

  if (!us_user_name || !us_user_pass || !us_name || !us_role_id)
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' })

  try {
    const hashedPassword = await bcrypt.hash(us_user_pass, 10) // ✅ เข้ารหัสก่อนบันทึก

    const query = `
      INSERT INTO user (us_user_name, us_user_pass, us_name, us_phone, us_department, us_role_id, us_tt_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    const params = [us_user_name, hashedPassword, us_name, us_phone, us_department, us_role_id, us_tt_id ?? null]

    db.query(query, params, (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY')
          return res.status(409).json({ message: 'ชื่อผู้ใช้ซ้ำในระบบ' })
        return res.status(500).json({ message: 'เพิ่มผู้ใช้ไม่สำเร็จ', error: err.message })
      }
      res.status(201).json({ created: 1, us_id: result.insertId })
    })
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเข้ารหัสรหัสผ่าน', error: err.message })
  }
})

/* =========================
   GET /users
   ========================= */
app.get('/users', (req, res) => {
  const query = `
    SELECT u.us_id, u.us_user_name, u.us_name, u.us_phone,
           u.us_department, r.role_name, t.tt_name
    FROM user u
    LEFT JOIN role r ON u.us_role_id = r.role_id
    LEFT JOIN technician_type t ON u.us_tt_id = t.tt_id
    ORDER BY u.us_id ASC
  `
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: 'ดึงข้อมูลผู้ใช้ไม่สำเร็จ', error: err.message })
    res.json(results)
  })
})

/* =========================
   PUT /users/:id
   ========================= */
app.put('/users/:id', (req, res) => {
  const id = Number(req.params.id)
  const { us_name, us_phone, us_department, us_role_id, us_tt_id } = req.body
  if (!Number.isFinite(id)) return res.status(400).json({ message: 'id ไม่ถูกต้อง' })

  const query = `
    UPDATE user
    SET us_name=?, us_phone=?, us_department=?, us_role_id=?, us_tt_id=?
    WHERE us_id=?
  `
  db.query(query, [us_name, us_phone, us_department, us_role_id, us_tt_id, id], (err, result) => {
    if (err) return res.status(500).json({ message: 'อัปเดตไม่สำเร็จ', error: err.message })
    res.json({ updated: result.affectedRows })
  })
})

/* =========================
   DELETE /users/:id
   ========================= */
app.delete('/users/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ message: 'id ไม่ถูกต้อง' })

  db.query('DELETE FROM user WHERE us_id=?', [id], (err, result) => {
    if (err) return res.status(500).json({ message: 'ลบไม่สำเร็จ', error: err.message })
    res.json({ deleted: result.affectedRows })
  })
})

/* =========================
   SERVER START
   ========================= */
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`🚀 FixDesk User API running on port ${PORT}`))
