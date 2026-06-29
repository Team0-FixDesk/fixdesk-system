/**
 * =====================================================================
 * @file            auth.controller.js
 * @layer           Controller Layer (Presentation Layer)
 * @version         1.1.1
 * @since           2026-02-10
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *   - ปฏิพัทธ์ จงนันทพันธ์กุล
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
 *   - auth-route.js
 * 
 * ---------------------------------------------------------------------
 * @changelog
 *  [2026-02-10, พชร ไพศรีสกุล] V 1.0.0
 *   - Refactor แยกการทำงาน logic ออกมาเป็นโครงสร้างมาตรฐาน Layered Architecture
 *  [2026-02-10, พชร ไพศรีสกุล] V 1.1.0
 *   - แก้ไขเรื่อง Decode Token
 *  [2026-02-18, ปฏิพัทธ์ จงนันทพันธ์กุล] V 1.1.1
 *   - ปรับปรุงการจัดการ Token และเพิ่มการตรวจสอบความถูกต้องของข้อมูลที่ส่งมา
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
     * @return {Promise<void>} ส่ง response กลับไปยัง client พร้อม JWT Token หรือ error message
     */
    async login(req, res) {
      try {
        /**
         * รับข้อมูล userName และ password จาก request body
         * ตรวจสอบว่าข้อมูลครบถ้วนหรือไม่
         * @author พชร ไพศรีสกุล
         * @since 2026-02-10
         * @param {Object} req - userName จาก request body
         * @param {Object} res - password จาก request body
         * @return {Promise<void>} ถ้าข้อมูลไม่ครบถ้วนจะส่ง response กลับไปทันที
         */
        const { userName, password } = req.body;

        /**
         * ตรวจสอบความถูกต้องของข้อมูลที่ส่งมา
         * ถ้าข้อมูลไม่ครบถ้วนให้ส่ง response status 400 พร้อมข้อความแจ้งเตือน
         * @returns {Promise<void>} ถ้าข้อมูลไม่ครบถ้วนจะส่ง response กลับไปทันที
         */
        if (!userName || !password) {
          return res.status(400).json({ message: "ข้อมูลที่ส่งมาไม่ถูกต้อง" });
        }

        /**
         * เรียก authService เพื่อทำการยืนยันตัวตนและสร้าง JWT Token
         * ถ้าข้อมูลไม่ถูกต้องจะมีการ throw error ที่ authService และถูกดักจับใน catch block ด้านล่าง
         * @author พชร ไพศรีสกุล
         * @since 2026-02-10
         * @param {Object} req - userName จาก request body
         * @param {Object} res - password จาก request body
         * @return {Promise<void>} JWT Token ถ้าข้อมูลถูกต้อง
         */
        const token = await authService.authenticateUser(userName, password);
        return res.json({ token });

        /**
         * ดัก Error ที่เกิดขึ้นจาก authService และส่ง response กลับไปยัง client พร้อมข้อความที่เหมาะสม
         * - ถ้า error เป็น USER_NOT_FOUND หรือ INVALID_PASSWORD ให้ส่ง status 401 พร้อมข้อความแจ้งเตือน
         * - ถ้าเป็น error อื่นๆ ให้ส่ง status 500 พร้อมข้อความ "Internal Server Error"
         * @author พชร ไพศรีสกุล
         * @since 2026-02-10
         * @param {Object} error - Error object ที่เกิดขึ้นจาก authService
         * @return {Promise<void>} ส่ง response กลับไปยัง client พร้อม status และ message ที่เหมาะสม
         */
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
