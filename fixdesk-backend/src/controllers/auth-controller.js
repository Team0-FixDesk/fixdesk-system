module.exports = (authService) => {
  return {
    // ฟังก์ชัน Login
    async login(req, res) {
      try {
        // รับค่า userName และ password (เปลี่ยนจาก user_name เป็น userName ตาม Standard)
        const { userName, password } = req.body;

        // เช็คว่ากรอกข้อมูลครบไหม
        if (!userName || !password) {
          return res.status(400).json({ message: "ข้อมูลที่ส่งมาไม่ถูกต้อง" });
        }

        // เรียก Service ให้ทำงาน
        const token = await authService.authenticateUser(userName, password);

        // ส่ง Token กลับไป
        return res.json({ token });
      } catch (error) {
        // ดัก Error กรณีต่างๆ เพื่อแจ้งเตือนให้ถูก
        if (error.message === "USER_NOT_FOUND") {
          return res.status(401).json({ message: "ชื่อผู้ใช้ไม่ถูกต้อง" });
        }
        if (error.message === "INVALID_PASSWORD") {
          return res.status(401).json({ message: "รหัสผ่านไม่ถูกต้อง" });
        }

        // Error อื่นๆ ที่เกี่ยวกับระบบ
        console.error("[AUTH][LOGIN]", error);
        return res.status(500).json({ message: "Internal Server Error" });
      }
    },
  };
};

function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET not configured");
  }
  const payload = {
    us_id: user.us_id,
    us_user_name: user.us_user_name,
    us_prefix_th: user.us_prefix_th || "",
    us_first_name_th: user.us_first_name_th || "",
    us_last_name_th: user.us_last_name_th || "",
    us_first_name_en: user.us_first_name_en || "",
    us_last_name_en: user.us_last_name_en || "",
    us_tel: user.us_tel || "",
    us_department: user.us_department || "",
    role_name: user.role_name || "",
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || "1d",
    issuer: "fixdesk-api",
    audience: "fixdesk-client",
  });
}