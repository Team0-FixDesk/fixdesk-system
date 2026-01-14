const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

module.exports = function authRoutes(db) {
    const router = express.Router();

  /* ===================== LOGIN ===================== */
    router.post("/login", (req, res) => {
    const { user_name, password } = req.body;

    if (!user_name || !password) {
        return res.status(400).json({ message: "ข้อมูลที่ส่งมาไม่ถูกต้อง" });
    }

    const query = `
        SELECT u.us_id, u.us_user_name, u.us_user_pass,
            t.ttn_title_th, u.us_first_name_th, u.us_last_name_th,
            u.us_first_name_en, u.us_last_name_en,
            u.us_phone, u.us_department,
            r.role_name
        FROM user u
        LEFT JOIN title_name t ON u.us_ttn_id = t.ttn_id
        LEFT JOIN role r ON u.us_role_id = r.role_id
        WHERE u.us_user_name = ? LIMIT 1
    `;

    db.query(query, [user_name], async (err, results) => {
        if (err) {
            console.error("[AUTH][LOGIN]", err.message);
        return res.status(500).json({ message: "Internal Server Error" });
        }

        if (!results.length) {
            return res.status(401).json({ message: "ชื่อผู้ใช้ไม่ถูกต้อง" });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.us_user_pass);

        if (!isMatch) {
        return res.status(401).json({ message: "รหัสผ่านไม่ถูกต้อง" });
    }

    const payload = {
        us_id: user.us_id,
        us_user_name: user.us_user_name,
        us_prefix_th: user.ttn_title_th || "",
        us_first_name_th: user.us_first_name_th || "",
        us_last_name_th: user.us_last_name_th || "",
        us_first_name_en: user.us_first_name_en || "",
        us_last_name_en: user.us_last_name_en || "",
        us_tel: user.us_phone || "",
        us_department: user.us_department || "",
        role_name: user.role_name || "",
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "8h",
    });

    res.json({ token });
    });
    });

    return router;
};
