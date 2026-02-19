/**
 * =====================================================================
 * @file            auth.controller.js
 * @layer           Controller Layer (Presentation Layer)
 * @version         1.1.0
 * @since           2026-02-10
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *
 * @lastModified    2026-02-18
 * @lastModifiedBy  ปฏิพัทธ์ จงนันทพันธ์กุล
 * ---------------------------------------------------------------------
 * @description
 *  Controller สำหรับจัดการการยืนยันตัวตน (Authentication)
 *  ทำหน้าที่รับ request จาก client และเรียกใช้งาน authService
 *
 *  รองรับการทำงาน:
 *    - Login ผู้ใช้งาน
 *    - ตรวจสอบความถูกต้องของข้อมูลที่ส่งมา
 *    - ส่ง JWT Token กลับไปยัง client
 *    - จัดการ error และ response status
 *
 * @usedBy
 *   - auth.route.js
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - Refactor แยกการทำงาน logic ออกมาเป็นโครงสร้างมาตรฐาน Layered Architecture
 *     [2026-02-10, พชร ไพศรีสกุล] V 1.0.0
 *   - แก้ไขเรื่อง Decode Token
 *     [2026-02-10, พชร ไพศรีสกุล] V 1.1.0
 *
 * =====================================================================
 */

module.exports = (authService) => {
  return {
    /**
     * Controller สำหรับ Login ผู้ใช้งาน
     * รับ request จาก client และเรียก authService เพื่อสร้าง JWT Token
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     * @contributors
     *  - พชร ไพศรีสกุล
     *
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {Promise<void>}
     */
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

/**
 * สร้าง JWT Token จากข้อมูลผู้ใช้งาน
 * ใช้สำหรับยืนยันตัวตนและส่งกลับไปยัง client
 *
 * @author พชร ไพศรีสกุล
 * @since 2026-02-10
 * @lastModified 2026-02-18
 * @lastModifiedBy พชร ไพศรีสกุล
 * @contributors
 *  - พชร ไพศรีสกุล
 *
 * @param {Object} user - ข้อมูลผู้ใช้งานจาก database
 * @returns {string} JWT Token
 */
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
