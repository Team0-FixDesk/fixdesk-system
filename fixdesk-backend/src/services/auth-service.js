/**
 * =====================================================================
 * @file            auth.service.js
 * @layer           Service Layer (Business Logic Layer)
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
 *  Service สำหรับจัดการ Authentication Logic
 *  ทำหน้าที่ตรวจสอบข้อมูลผู้ใช้งาน และสร้าง JWT Token
 *
 *  รองรับการทำงาน:
 *    - ตรวจสอบ username และ password
 *    - เปรียบเทียบ password ที่เข้ารหัสด้วย bcrypt
 *    - สร้าง JWT Token สำหรับยืนยันตัวตน
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - Initial implementation Auth Service ตาม Layered Architecture
 *     [2026-02-10, พชร ไพศรีสกุล] V 1.0.0
 *
 * =====================================================================
 */

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

/**
 * Authentication Service Module
 * จัดการ Business Logic ที่เกี่ยวข้องกับการเข้าสู่ระบบ
 *
 * @param {Object} db - Database connection instance
 * @returns {Object} Authentication Service Functions
 */
module.exports = (db) => {
  return {
    /**
     * ตรวจสอบข้อมูลผู้ใช้งาน และสร้าง JWT Token
     * ขั้นตอน:
     *   1. ตรวจสอบ username จากฐานข้อมูล
     *   2. เปรียบเทียบ password ด้วย bcrypt
     *   3. สร้าง JWT Token หากข้อมูลถูกต้อง
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     *
     * @param {string} userName - ชื่อผู้ใช้งาน
     * @param {string} password - รหัสผ่าน
     *
     * @throws {Error} USER_NOT_FOUND
     * @throws {Error} INVALID_PASSWORD
     *
     * @returns {Promise<string>} JWT Token
     */
    async authenticateUser(userName, password) {
      // คำสั่ง SQL (เปลี่ยนชื่อย่อ u, t, r เป็นชื่อเต็มให้อ่านง่าย)
      const sqlStatement = `
        SELECT 
            user.us_id, user.us_user_name, user.us_user_pass,
            title.ttn_title_th, user.us_first_name_th, user.us_last_name_th,
            user.us_first_name_en, user.us_last_name_en,
            user.us_phone, user.us_department, user.us_job_title,
            user.us_active,
            role.role_name
        FROM user AS user
        LEFT JOIN title_name AS title ON user.us_ttn_id = title.ttn_id
        LEFT JOIN role AS role ON user.us_role_id = role.role_id
        WHERE user.us_user_name = ? 
        LIMIT 1
      `;

      // ดึงข้อมูลจากฐานข้อมูล (ใช้ Promise เพื่อให้รอผลลัพธ์ได้)
      const userList = await new Promise((resolve, reject) => {
        db.query(sqlStatement, [userName], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });

      // ถ้าหา User ไม่เจอ
      if (userList.length === 0) {
        throw new Error("USER_NOT_FOUND");
      }

      const currentUser = userList[0];

      // ตรวจสอบรหัสผ่านว่าตรงกันไหม
      const isPasswordMatch = await bcrypt.compare(
        password,
        currentUser.us_user_pass,
      );
      if (!isPasswordMatch) {
        throw new Error("INVALID_PASSWORD");
      }

      let roleName = currentUser.role_name || "";

      if (roleName.toLowerCase() === "superadmin") {
        roleName = "Admin";
      }

      // เตรียมข้อมูลใส่ใน Token (Payload)
      const tokenPayload = {
        us_id: currentUser.us_id,
        us_user_name: currentUser.us_user_name,
        us_prefix_th: currentUser.ttn_title_th || "",
        us_first_name_th: currentUser.us_first_name_th || "",
        us_last_name_th: currentUser.us_last_name_th || "",
        us_first_name_en: currentUser.us_first_name_en || "",
        us_last_name_en: currentUser.us_last_name_en || "",
        us_tel: currentUser.us_phone || "",
        us_department: currentUser.us_department || "",
        us_job_title: currentUser.us_job_title || "",
        us_active: currentUser.us_active || 0,
        role_name: roleName,
      };

      // สร้าง Token (อายุ 8 ชั่วโมง)
      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
        expiresIn: "8h",
      });

      return token;
    },
  };
};
