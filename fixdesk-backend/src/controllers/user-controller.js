/**
 * =====================================================================
 * @file            user.controller.js
 * @layer           Controller Layer (Presentation Layer)
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
 *  Controller สำหรับจัดการข้อมูลผู้ใช้งาน (User Management)
 *  ทำหน้าที่รับ request จาก client และเรียกใช้งาน userService
 *
 *  รองรับการทำงาน:
 *    - ดึงข้อมูลผู้ใช้งานทั้งหมด และรายบุคคล
 *    - สร้าง แก้ไข และลบผู้ใช้งาน
 *    - แก้ไขข้อมูลส่วนตัว
 *    - ดึงข้อมูล Titles และ Roles
 *    - Import ผู้ใช้งานจากไฟล์ Excel
 *
 * @usedBy
 *   - user.route.js
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  [2026-02-10, พชร ไพศรีสกุล] V 1.0.0
 *  - Initial implementation User Controller ตาม Layered Architecture
 *  [2026-02-25, พชร ไพศรีสกุล] V 1.1.0
 *  - แก้ไขการสร้างบัญชีผู้ใช้ และ import จากไฟล์ ให้รองรับการสร้าง default รหัสผ่าน
 *
 * =====================================================================
 */
module.exports = (userService) => {
  return {
    // --- USER QUERY CONTROLLER ---
    /**
     * ดึงรายการผู้ใช้งานทั้งหมด
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async getUsers(req, res) {
      try {
        const users = await userService.getAllUsers();
        res.json(users);
      } catch (error) {
        res
          .status(500)
          .json({ message: "ดึงข้อมูลผู้ใช้ไม่สำเร็จ", error: error.message });
      }
    },

    /**
     * ดึงข้อมูลผู้ใช้งานตาม ID
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async getUserById(req, res) {
      try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id))
          return res.status(400).json({ message: "ID ไม่ถูกต้อง" });

        const user = await userService.getUserById(id);
        if (!user)
          return res.status(404).json({ message: "ไม่พบข้อมูลผู้ใช้" });

        res.json(user);
      } catch (error) {
        res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาด", error: error.message });
      }
    },

    // --- USER META DATA CONTROLLER ---
    /**
     * ดึงรายการคำนำหน้า (Titles)
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async getTitles(req, res) {
      try {
        const titles = await userService.getAllTitles();
        res.json(titles);
      } catch (error) {
        res.status(500).json({ message: "ดึงข้อมูลคำนำหน้าไม่สำเร็จ" });
      }
    },

    /**
     * ดึงรายการบทบาทผู้ใช้งาน (Roles)
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async getRoles(req, res) {
      try {
        const roles = await userService.getAllRoles();
        res.json(roles);
      } catch (error) {
        res.status(500).json({ message: "ดึงข้อมูลบทบาทไม่สำเร็จ" });
      }
    },

    // --- USER MANAGEMENT CONTROLLER (ADMIN) ---
    /**
     * สร้างผู้ใช้งานใหม่
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async createUser(req, res) {
      try {
        // รับค่าจาก Body
        const {
          us_user_name,
          us_ttn_id,
          us_first_name_th,
          us_last_name_th,
          us_first_name_en,
          us_last_name_en,
          us_phone,
          us_department,
          us_role_id,
          us_tt_id,
          us_job_title,
        } = req.body;

        // Validation: ตรวจสอบความถูกต้องของข้อมูล
        if (
          !us_user_name ||
          !us_first_name_th ||
          !us_last_name_th ||
          !us_role_id ||
          !us_job_title
        ) {
          return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
        }
        if (
          !/^[ก-๙\s]+$/.test(us_first_name_th) ||
          !/^[ก-๙\s]+$/.test(us_last_name_th)
        ) {
          return res
            .status(400)
            .json({ message: "ชื่อ-นามสกุล (ไทย) ต้องเป็นภาษาไทยเท่านั้น" });
        }
        if (us_phone && !/^[0-9]{9,10}$/.test(us_phone)) {
          return res
            .status(400)
            .json({ message: "เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก" });
        }

        // จัดเตรียม Data object ส่งให้ Service (เปลี่ยนเป็น camelCase)
        const userData = {
          userName: us_user_name,
          titleId: us_ttn_id,
          firstNameTh: us_first_name_th,
          lastNameTh: us_last_name_th,
          firstNameEn: us_first_name_en,
          lastNameEn: us_last_name_en,
          phone: us_phone,
          department: us_department,
          roleId: us_role_id,
          technicianTypeId: us_tt_id,
          jobTitle: us_job_title,
        };

        const newId = await userService.createUser(userData);
        res.status(201).json({ created: 1, us_id: newId });
      } catch (error) {
        if (error.message === "DUPLICATE_USERNAME")
          return res.status(409).json({ message: "ชื่อผู้ใช้ซ้ำในระบบ" });
        res
          .status(500)
          .json({ message: "เพิ่มผู้ใช้ไม่สำเร็จ", error: error.message });
      }
    },

    /**
     * รีเซ็ตรหัสผ่านของผู้ใช้งาน
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async resetPassword(req, res) {
      try {
        // รับ userId จาก URL
        const userId = req.params.id;

        // validation
        if (!userId) {
          return res.status(400).json({
            message: "ไม่พบ userId",
          });
        }

        // เรียก service
        await userService.resetPassword(userId);

        // ส่ง response กลับ
        res.status(200).json({
          message: "รีเซ็ตรหัสผ่านสำเร็จ",
        });
      } catch (error) {
        if (error.message === "USER_NOT_FOUND") {
          return res.status(404).json({
            message: "ไม่พบผู้ใช้งาน",
          });
        }

        if (error.message === "INVALID_DATA_FOR_PASSWORD_GENERATION") {
          return res.status(400).json({
            message: "ข้อมูลผู้ใช้ไม่เพียงพอสำหรับสร้างรหัสผ่าน",
          });
        }

        res.status(500).json({
          message: "รีเซ็ตรหัสผ่านไม่สำเร็จ",
          error: error.message,
        });
      }
    },

    /**
     * แก้ไขข้อมูลผู้ใช้งาน (Admin)
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async updateUser(req, res) {
      try {
        const id = Number(req.params.id);
        // Mapping Data
        const userData = {
          titleId: req.body.us_ttn_id,
          firstNameTh: req.body.us_first_name_th,
          lastNameTh: req.body.us_last_name_th,
          firstNameEn: req.body.us_first_name_en,
          lastNameEn: req.body.us_last_name_en,
          phone: req.body.us_phone,
          department: req.body.us_department,
          roleId: req.body.us_role_id,
          technicianTypeId: req.body.us_tt_id,
          jobTitle: req.body.us_job_title,
          userName: req.body.us_user_name,
          password: req.body.us_user_pass,
        };

        await userService.updateUser(id, userData);
        res.json({ message: "อัปเดตข้อมูลสำเร็จ" });
      } catch (error) {
        if (error.message === "DUPLICATE_USERNAME")
          return res.status(409).json({ message: "ชื่อผู้ใช้ซ้ำในระบบ" });
        res
          .status(500)
          .json({ message: "อัปเดตไม่สำเร็จ", error: error.message });
      }
    },

    /**
     * ลบผู้ใช้งาน
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async deleteUser(req, res) {
      try {
        await userService.deleteUser(Number(req.params.id));
        res.json({ message: "ลบผู้ใช้สำเร็จ" });
      } catch (error) {
        if (error.message === "DEPENDENCY_EXISTS") {
          return res.status(400).json({
            message:
              "ไม่สามารถลบได้ เนื่องจากมีใบแจ้งซ่อมหรือการมอบหมายงานค้างอยู่",
          });
        }
        if (error.message === "USER_NOT_FOUND")
          return res.status(404).json({ message: "ไม่พบผู้ใช้" });
        res.status(500).json({ message: "ลบไม่สำเร็จ", error: error.message });
      }
    },

    // --- USER PERSONAL PROFILE CONTROLLER ---
    /**
     * แก้ไขข้อมูลส่วนตัวของผู้ใช้งาน
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async updatePersonalProfile(req, res) {
      try {
        const id = req.params.id;
        const { oldPassword, password, usActive, isFirstLogin, ...body } = req.body;

        // สำหรับ first login ไม่ต้องตรวจสอบ oldPassword
        // สำหรับการแก้ไขธรรมชาติ ต้องตรวจสอบ oldPassword
        if (!isFirstLogin && !oldPassword) {
          return res.status(400).json({ message: "กรุณากรอกรหัสผ่านเดิม" });
        }

        // ตรวจสอบเฉพาะฟิลด์ที่ส่งมาจริง (ส่งมาแต่เป็นค่าว่าง)
        // service layer รองรับ partial update อยู่แล้ว — ฟิลด์ที่ไม่ส่งมาจะไม่ถูกอัปเดต
        if (!isFirstLogin && !password) {
          const hasEmptyRequired =
            (body.us_phone !== undefined && body.us_phone !== null && !body.us_phone);
          if (hasEmptyRequired) {
            return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบ" });
          }
        }

        const userData = {
          titleId: body.us_ttn_id,
          department: body.us_department,
          phone: body.us_phone,
          firstNameTh: body.us_first_name_th,
          lastNameTh: body.us_last_name_th,
          firstNameEn: body.us_first_name_en,
          lastNameEn: body.us_last_name_en,
          userName: body.us_user_name,
          usActive: usActive,
        };

        await userService.updatePersonalProfile(
          id,
          userData,
          oldPassword || "", // ส่ง empty string ถ้าเป็น first login
          password,
          isFirstLogin || false // ส่ง flag สำหรับการระบุว่าเป็น first login
        );
        res.json({ message: "อัปเดตข้อมูลส่วนตัวสำเร็จ" });
      } catch (error) {
        if (error.message === "USER_NOT_FOUND")
          return res.status(404).json({ message: "ไม่พบผู้ใช้" });
        if (error.message === "INVALID_OLD_PASSWORD")
          return res.status(400).json({ message: "รหัสผ่านเดิมไม่ถูกต้อง" });
        res
          .status(500)
          .json({ message: "อัปเดตข้อมูลไม่สำเร็จ", error: error.message });
      }
    },

    /**
     * Import ข้อมูลผู้ใช้งานจากไฟล์ Excel หรือ JSON
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async importUsers(req, res) {
      try {
        const { users } = req.body;
        if (!Array.isArray(users) || users.length === 0) {
          return res.status(400).json({ message: "ไม่พบข้อมูลสำหรับ Import" });
        }

        const result = await userService.importUsers(users);
        res.json(result);
      } catch (error) {
        console.error("IMPORT SYSTEM ERROR:", error);
        res
          .status(500)
          .json({ message: "Import ล้มเหลว", error: error.message });
      }
    },
  };
};
