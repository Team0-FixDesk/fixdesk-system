const bcrypt = require("bcrypt");

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
          role.role_name, tech.tt_name AS technician_type,
          title.ttn_title_th AS title_name
        FROM user AS user
        LEFT JOIN role AS role ON user.us_role_id = role.role_id
        LEFT JOIN technician_type AS tech ON user.us_tt_id = tech.tt_id
        LEFT JOIN title_name AS title ON user.us_ttn_id = title.ttn_id
        WHERE user.us_id = ?
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
      const sql =
        "SELECT role_id, role_name, role_name AS role_label_th FROM role ORDER BY role_id ASC";
      return new Promise((resolve, reject) => {
        db.query(sql, (err, res) => (err ? reject(err) : resolve(res)));
      });
    },

    /* ================== ACTION (เพิ่ม/ลบ/แก้ไข) ================== */

    // สร้างผู้ใช้ใหม่
    async createUser(userData) {
      // เข้ารหัสรหัสผ่านก่อนลงฐานข้อมูล
      const hashedPassword = await bcrypt.hash(userData.password, 10);

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

    // แก้ไขข้อมูลผู้ใช้ (สำหรับ Admin)
    async updateUser(id, userData) {
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
    async updatePersonalProfile(id, userData, oldPassword, newPassword) {
      // 1. เช็คว่า User มีอยู่จริงไหม และดึงรหัสผ่านเก่ามาเทียบ
      const currentUser = await this.getUserById(id);
      if (!currentUser) throw new Error("USER_NOT_FOUND");

      // 2. ตรวจสอบรหัสผ่านเดิม (Required)
      const isMatch = await bcrypt.compare(
        oldPassword,
        currentUser.us_user_pass,
      );
      if (!isMatch) throw new Error("INVALID_OLD_PASSWORD");

      // 3. เตรียมรหัสผ่านใหม่ (ถ้ามี)
      let finalPassword = currentUser.us_user_pass;
      if (newPassword) {
        finalPassword = await bcrypt.hash(newPassword, 10);
      }

      // 4. อัปเดตข้อมูล
      const sql = `
        UPDATE user SET 
            us_ttn_id = ?, us_department = ?, us_phone = ?,
            us_first_name_th = ?, us_last_name_th = ?,
            us_first_name_en = ?, us_last_name_en = ?,
            us_user_name = ?, us_user_pass = ?
        WHERE us_id = ?
      `;
      const params = [
        userData.titleId,
        userData.department,
        userData.phone,
        userData.firstNameTh,
        userData.lastNameTh,
        userData.firstNameEn,
        userData.lastNameEn,
        userData.userName,
        finalPassword,
        id,
      ];

      const [result] = await db.promise().query(sql, params);
      return result.affectedRows;
    },

    // ลบผู้ใช้
    async deleteUser(id) {
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
          // 1. ตรวจสอบข้อมูลเบื้องต้น
          if (
            !user.username ||
            !user.password ||
            !user.first_name_th ||
            !user.role_name
          ) {
            throw new Error("ข้อมูลไม่ครบถ้วน");
          }

          // 2. เตรียมข้อมูล (Hash Pass, Map Position)
          const hashedPassword = await bcrypt.hash(user.password, 10);

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
