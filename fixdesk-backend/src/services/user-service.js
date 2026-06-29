/**
 * =====================================================================
 * @file            user.route.js
 * @layer           Route Layer (Routing Layer)
 * @version         1.1.0
 * @since           2026-02-10
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *
 * @lastModified    2026-02-25
 * @lastModifiedBy  พชร ไพศรีสกุล
 * ---------------------------------------------------------------------
 * @description
 *  Route สำหรับจัดการระบบผู้ใช้งาน (User Management)
 *  ทำหน้าที่กำหนด endpoint และเชื่อมต่อ Controller กับ Service Layer
 *
 *  รองรับการทำงาน:
 *    - ดึงข้อมูล Titles และ Roles
 *    - จัดการผู้ใช้งาน (Create, Read, Update, Delete)
 *    - จัดการข้อมูลส่วนตัว (Personal Profile)
 *    - Reset รหัสผ่านผู้ใช้งาน
 *    - Import ผู้ใช้งานจากไฟล์ Excel
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  [2026-02-10, พชร ไพศรีสกุล] V 1.0.0
 *  - Initial implementation User Route ตาม Layered Architecture
 *  [2026-02-25, พชร ไพศรีสกุล] V 1.1.0
 *  - เพิ่มการ generate default password จาก FirstNameEn + Last4Phone + LastInitial
 *  - รองรับการ reset password โดยใช้รูปแบบ default password
 *  - ปรับปรุงการ import ผู้ใช้งานให้รองรับ default password
 *
 *
 * =====================================================================
 */

const bcrypt = require("bcrypt");

function generateDefaultPassword(userData) {
  const firstName = (userData.firstNameEn || "").trim();
  const lastName = (userData.lastNameEn || "").trim();
  const phone = (userData.phone || "").trim();

  if (!firstName || !lastName || phone.length < 4) {
    throw new Error("INVALID_DATA_FOR_PASSWORD_GENERATION");
  }

  const last4Phone = phone.slice(-4);
  const lastInitial = lastName[0].toUpperCase();

  return `${firstName}@${last4Phone}${lastInitial}`;
}

module.exports = (db) => {
  return {
    /* ================== QUERY DATA (ดึงข้อมูล) ================== */

    // ดึงข้อมูลผู้ใช้ทั้งหมด พร้อมข้อมูลที่เกี่ยวข้องและสถานะการใช้งาน
    async getAllUsers() {
      // ใช้ alias ชื่อเต็ม (user, role, title) เพื่อให้อ่าน SQL ง่ายขึ้น
      const sql = `
        SELECT
          user.us_id, user.us_user_name, user.us_ttn_id,
          title.ttn_title_th AS title_name,
          user.us_first_name_th, user.us_last_name_th,
          user.us_first_name_en, user.us_last_name_en,
          user.us_phone, user.us_department,
          user.us_role_id, role.role_name,
          user.us_tt_id, user.us_job_title,
          user.us_active,
          tech.tt_name AS technician_type,
          CONCAT(title.ttn_title_th, '', user.us_first_name_th, ' ', user.us_last_name_th) AS full_name,
          
          -- นับจำนวนงานที่เกี่ยวข้อง (เพื่อดูว่าลบได้ไหม)
          (SELECT COUNT(*) FROM repair_form WHERE rf_us_id = user.us_id) AS repair_count,
          (SELECT COUNT(*) FROM repair_assignment WHERE ra_us_id = user.us_id) AS assignment_count,
          
          -- สร้าง Flag: 1 = มีงานค้าง (ห้ามลบ), 0 = ลบได้
          CASE WHEN
            (SELECT COUNT(*) FROM repair_form WHERE rf_us_id = user.us_id) +
            (SELECT COUNT(*) FROM repair_assignment WHERE ra_us_id = user.us_id) > 0
          THEN 1 ELSE 0 END AS has_repairs

        FROM user AS user
        LEFT JOIN role AS role ON user.us_role_id = role.role_id
        LEFT JOIN technician_type AS tech ON user.us_tt_id = tech.tt_id
        LEFT JOIN title_name AS title ON user.us_ttn_id = title.ttn_id
        WHERE role.role_name <> 'Superadmin'
        ORDER BY user.us_id ASC
      `;

      return new Promise((resolve, reject) => {
        db.query(sql, (err, res) => (err ? reject(err) : resolve(res)));
      });
    },

    // ดึงข้อมูลผู้ใช้รายบุคคล (By ID)
    async getUserById(userId) {
      const sql = `
        SELECT
          user.us_id, user.us_user_name, user.us_user_pass, user.us_ttn_id,
          user.us_first_name_th, user.us_last_name_th,
          user.us_first_name_en, user.us_last_name_en,
          user.us_phone, user.us_department,
          user.us_role_id, user.us_tt_id, user.us_job_title,
          user.us_active,
          role.role_name, tech.tt_name AS technician_type,
          title.ttn_title_th AS title_name
        FROM user AS user
        LEFT JOIN role AS role ON user.us_role_id = role.role_id
        LEFT JOIN technician_type AS tech ON user.us_tt_id = tech.tt_id
        LEFT JOIN title_name AS title ON user.us_ttn_id = title.ttn_id
        WHERE user.us_id = ?
        AND role.role_name <> 'Superadmin'
        LIMIT 1
      `;
      const [rows] = await db.promise().query(sql, [userId]);
      return rows[0];
    },

    // ดึงคำนำหน้าชื่อทั้งหมด
    async getAllTitles() {
      const sql =
        "SELECT ttn_id, ttn_title_th AS ttn_name_th FROM title_name ORDER BY ttn_id ASC";
      return new Promise((resolve, reject) => {
        db.query(sql, (err, res) => (err ? reject(err) : resolve(res)));
      });
    },

    // ดึงบทบาททั้งหมด
    async getAllRoles() {
      const sql = `
    SELECT role_id, role_name, role_name AS role_label_th
    FROM role
    WHERE role_name <> 'Superadmin'
    ORDER BY role_id ASC
  `;

      return new Promise((resolve, reject) => {
        db.query(sql, (err, res) => (err ? reject(err) : resolve(res)));
      });
    },

    /* ================== ACTION (เพิ่ม/ลบ/แก้ไข) ================== */

    // สร้างผู้ใช้ใหม่
    async createUser(userData) {
      const [role] = await db
        .promise()
        .query("SELECT role_name FROM role WHERE role_id = ?", [
          userData.roleId,
        ]);

      const defaultPassword = generateDefaultPassword(userData);
      // เข้ารหัสรหัสผ่านก่อนลงฐานข้อมูล
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      const sql = `
        INSERT INTO user (
            us_user_name, us_user_pass, us_ttn_id,
            us_first_name_th, us_last_name_th,
            us_first_name_en, us_last_name_en,
            us_phone, us_department,
            us_role_id, us_tt_id, us_job_title
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        userData.userName,
        hashedPassword,
        userData.titleId || null,
        userData.firstNameTh,
        userData.lastNameTh,
        userData.firstNameEn || null,
        userData.lastNameEn || null,
        userData.phone || null,
        userData.department || null,
        userData.roleId,
        userData.technicianTypeId || null,
        userData.jobTitle || null,
      ];

      try {
        const [result] = await db.promise().query(sql, params);
        return result.insertId;
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY") throw new Error("DUPLICATE_USERNAME");
        throw err;
      }
    },

    async resetPassword(userId) {
      const targetUser = await this.getUserById(userId);

      if (targetUser.role_name === "Superadmin") {
        throw new Error("CANNOT_RESET_SUPERADMIN_PASSWORD");
      }
      // ดึงข้อมูล user จาก database
      const sqlSelect = `
    SELECT 
      us_id,
      us_first_name_en,
      us_last_name_en,
      us_phone
    FROM user
    WHERE us_id = ?
    LIMIT 1
  `;

      const [rows] = await db.promise().query(sqlSelect, [userId]);

      if (!rows.length) {
        throw new Error("USER_NOT_FOUND");
      }

      const user = rows[0];

      // generate password ใหม่
      const defaultPassword = generateDefaultPassword({
        firstNameEn: user.us_first_name_en,
        lastNameEn: user.us_last_name_en,
        phone: user.us_phone,
      });

      // hash password
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      // update password ใน database
      const sqlUpdate = `
    UPDATE user
    SET us_user_pass = ?
    WHERE us_id = ?
  `;

      const [result] = await db
        .promise()
        .query(sqlUpdate, [hashedPassword, userId]);

      if (result.affectedRows === 0) {
        throw new Error("USER_NOT_FOUND");
      }

      return true;
    },
    // แก้ไขข้อมูลผู้ใช้ (สำหรับ Admin)
    async updateUser(id, userData) {
      const targetUser = await this.getUserById(id);

      if (targetUser.role_name === "Superadmin") {
        throw new Error("CANNOT_MODIFY_SUPERADMIN");
      }
      // ตรวจสอบ Username ซ้ำ (ยกเว้นตัวเอง)
      if (userData.userName) {
        const [dup] = await db
          .promise()
          .query(
            "SELECT us_id FROM user WHERE us_user_name = ? AND us_id != ?",
            [userData.userName, id],
          );
        if (dup.length > 0) throw new Error("DUPLICATE_USERNAME");
      }

      let sql = `
        UPDATE user SET
          us_ttn_id=?, us_first_name_th=?, us_last_name_th=?,
          us_first_name_en=?, us_last_name_en=?,
          us_phone=?, us_department=?, us_role_id=?, us_tt_id=?, us_job_title=?
      `;

      const params = [
        userData.titleId || null,
        userData.firstNameTh,
        userData.lastNameTh,
        userData.firstNameEn || null,
        userData.lastNameEn || null,
        userData.phone || null,
        userData.department || null,
        userData.roleId,
        userData.technicianTypeId || null,
        userData.jobTitle || null,
      ];

      // ถ้ามีการแก้ Username
      if (userData.userName) {
        sql += `, us_user_name=?`;
        params.push(userData.userName);
      }

      // ถ้ามีการแก้ Password (ต้อง Hash ใหม่)
      if (userData.password) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        sql += `, us_user_pass=?`;
        params.push(hashedPassword);
      }

      sql += ` WHERE us_id=?`;
      params.push(id);

      const [result] = await db.promise().query(sql, params);
      return result.affectedRows;
    },

    // แก้ไขข้อมูลส่วนตัว (สำหรับ User แก้เอง)
    async updatePersonalProfile(
      id,
      userData,
      oldPassword,
      newPassword,
      isFirstLogin = false,
    ) {
      // 1. เช็คว่า User มีอยู่จริงไหม
      const currentUser = await this.getUserById(id);
      if (!currentUser) throw new Error("USER_NOT_FOUND");

      // 2. ตรวจสอบรหัสผ่านเดิม (ข้ามถ้าเป็นครั้งแรก-first login)
      if (!isFirstLogin) {
        const isMatch = await bcrypt.compare(
          oldPassword,
          currentUser.us_user_pass,
        );
        if (!isMatch) throw new Error("INVALID_OLD_PASSWORD");
      }

      // 3. เตรียมรหัสผ่านใหม่ (ถ้ามี)
      let finalPassword = currentUser.us_user_pass;
      let usActive =
        userData.usActive !== undefined
          ? userData.usActive
          : currentUser.us_active;

      if (newPassword) {
        finalPassword = await bcrypt.hash(newPassword, 10);
        // ถ้ามีการเปลี่ยนรหัสผ่าน และ us_active=0 ให้ตั้งเป็น 1
        if (currentUser.us_active === 0) {
          usActive = 1;
        }
      }

      // 4. อัปเดตข้อมูล (มีเงื่อนไขว่าจะอัปเดตเฉพาะฟิลด์ที่มีข้อมูล)
      // สำหรับ first-login อาจมีฟิลด์บางฟิลด์เป็น null
      let updateFields = ["us_user_pass = ?"];
      let params = [finalPassword];

      // ถ้า titleId มีค่า ให้อัปเดต
      if (userData.titleId !== undefined && userData.titleId !== null) {
        updateFields.push("us_ttn_id = ?");
        params.push(userData.titleId);
      }

      if (userData.department !== undefined && userData.department !== null) {
        updateFields.push("us_department = ?");
        params.push(userData.department);
      }

      if (userData.phone !== undefined && userData.phone !== null) {
        updateFields.push("us_phone = ?");
        params.push(userData.phone);
      }

      if (userData.firstNameTh !== undefined && userData.firstNameTh !== null) {
        updateFields.push("us_first_name_th = ?");
        params.push(userData.firstNameTh);
      }

      if (userData.lastNameTh !== undefined && userData.lastNameTh !== null) {
        updateFields.push("us_last_name_th = ?");
        params.push(userData.lastNameTh);
      }

      if (userData.firstNameEn !== undefined && userData.firstNameEn !== null) {
        updateFields.push("us_first_name_en = ?");
        params.push(userData.firstNameEn);
      }

      if (userData.lastNameEn !== undefined && userData.lastNameEn !== null) {
        updateFields.push("us_last_name_en = ?");
        params.push(userData.lastNameEn);
      }

      if (userData.userName !== undefined && userData.userName !== null) {
        updateFields.push("us_user_name = ?");
        params.push(userData.userName);
      }

      // ทำการ update us_active เสมอ
      updateFields.push("us_active = ?");
      params.push(usActive);

      // เพิ่ม ID ที่สุดท้าย
      params.push(id);

      const sql = `UPDATE user SET ${updateFields.join(", ")} WHERE us_id = ?`;
      const [result] = await db.promise().query(sql, params);
      return result.affectedRows;
    },

    // ลบผู้ใช้
    async deleteUser(id) {
      const targetUser = await this.getUserById(id);

      if (targetUser.role_name === "Superadmin") {
        throw new Error("CANNOT_DELETE_SUPERADMIN");
      }
      // เช็คก่อนว่า User นี้เคย แจ้งซ่อม หรือ รับงานซ่อม ไหม
      const checkSql = `
            SELECT (SELECT COUNT(*) FROM repair_form WHERE rf_us_id = ?) + 
                   (SELECT COUNT(*) FROM repair_assignment WHERE ra_us_id = ?) AS total_usage
        `;
      const [checkResult] = await db.promise().query(checkSql, [id, id]);

      if (checkResult[0].total_usage > 0) {
        throw new Error("DEPENDENCY_EXISTS");
      }

      const [result] = await db
        .promise()
        .query("DELETE FROM user WHERE us_id = ?", [id]);
      if (result.affectedRows === 0) throw new Error("USER_NOT_FOUND");

      return true;
    },

    /* ================== IMPORT (Excel) ================== */

    // Import ผู้ใช้จำนวนมาก (Logic เดิมจากไฟล์ user.js)
    async importUsers(userList) {
      const results = [];
      const errors = [];

      for (const [index, user] of userList.entries()) {
        try {
          if (user.role_name === "Superadmin") {
            throw new Error("CANNOT_IMPORT_SUPERADMIN");
          }
          // 1. ตรวจสอบข้อมูลเบื้องต้น
          if (
            !user.username ||
            !user.first_name_th ||
            !user.first_name_en ||
            !user.last_name_en ||
            !user.phone ||
            !user.role_name
          ) {
            throw new Error("ข้อมูลไม่ครบถ้วน");
          }

          // 2. เตรียมข้อมูล (Hash Pass, Map Position)
          const defaultPassword = generateDefaultPassword({
            firstNameEn: user.first_name_en,
            lastNameEn: user.last_name_en,
            phone: user.phone,
          });

          const hashedPassword = await bcrypt.hash(defaultPassword, 10);
          // 3. หา Role ID
          const [roles] = await db
            .promise()
            .query("SELECT role_id FROM role WHERE role_name = ?", [
              user.role_name,
            ]);
          if (!roles.length) throw new Error("ไม่พบบทบาทที่ระบุ");
          const roleId = roles[0].role_id;

          // 4. หา Title ID
          const [titles] = await db
            .promise()
            .query("SELECT ttn_id FROM title_name WHERE ttn_title_th = ?", [
              user.title_name,
            ]);
          if (!titles.length) throw new Error("ไม่พบคำนำหน้าชื่อ");
          const titleId = titles[0].ttn_id;

          // 5. หา Technician Type (ถ้าเป็นช่าง)
          let techTypeId = null;
          if (user.role_name === "Technician") {
            if (!user.technician_type) throw new Error("ต้องระบุประเภทช่าง");
            const [techs] = await db
              .promise()
              .query("SELECT tt_id FROM technician_type WHERE tt_name = ?", [
                user.technician_type,
              ]);
            if (!techs.length) throw new Error("ไม่พบประเภทช่าง");
            techTypeId = techs[0].tt_id;
          }

          // 6. เช็ค Username ซ้ำ
          const [dup] = await db
            .promise()
            .query("SELECT us_id FROM user WHERE us_user_name = ?", [
              user.username,
            ]);
          if (dup.length) throw new Error("Username ซ้ำในระบบ");

          // 7. บันทึก
          await db.promise().query(
            `INSERT INTO user (
                        us_user_name, us_user_pass, us_ttn_id, us_department, us_phone,
                        us_first_name_th, us_last_name_th, us_first_name_en, us_last_name_en,
                        us_role_id, us_tt_id, us_job_title
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              user.username,
              hashedPassword,
              titleId,
              user.department,
              user.phone,
              user.first_name_th,
              user.last_name_th,
              user.first_name_en,
              user.last_name_en,
              roleId,
              techTypeId,
              user.position,
            ],
          );

          results.push({ index, username: user.username });
        } catch (err) {
          errors.push({ index, username: user.username, message: err.message });
        }
      }

      return { success: results.length, failed: errors.length, errors };
    },
  };
};
