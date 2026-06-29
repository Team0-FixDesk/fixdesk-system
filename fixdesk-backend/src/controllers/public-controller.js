/**
 * =====================================================================
 * @file            public.controller.js
 * @layer           Controller Layer (Presentation Layer)
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
 *  Controller สำหรับจัดการ Public API
 *  ทำหน้าที่รับ request จาก client และเรียกใช้งาน publicService
 *
 *  รองรับการทำงาน:
 *    - ค้นหาใบแจ้งซ่อมแบบ Public
 *    - รองรับ pagination
 *    - ส่งข้อมูลผลลัพธ์กลับไปยัง client
 *
 * @usedBy
 *   - public-route.js
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - Initial implementation Public Controller ตาม Layered Architecture
 *     [2026-02-18, พชร ไพศรีสกุล] V 1.0.0
 *
 * =====================================================================
 */
module.exports = (publicService) => {
  return {
    /**
     * ค้นหาใบแจ้งซ่อมจากคำค้นหา (Keyword Search)
     * รองรับ pagination และส่งผลลัพธ์กลับไปยัง client
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-18
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     * @contributors
     *  - พชร ไพศรีสกุล
     *
     * @param {Object} req - Express request object
     * @param {Object} req.query - Query parameters จาก client
     * @param {string} req.query.keyword - คำค้นหา
     * @param {number} req.query.page - หมายเลขหน้า
     * @param {number} req.query.limit - จำนวนข้อมูลต่อหน้า
     *
     * @param {Object} res - Express response object
     *
     * @returns {Promise<void>}
     */ async search(req, res) {
      try {
        // รับค่าจาก URL Query (เช่น ?keyword=คอม&page=1&limit=10)
        const keyword = req.query.keyword || "";
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // คำนวณจุดเริ่มต้นข้อมูล (Offset)
        const offset = (page - 1) * limit;

        // ถ้าไม่ได้กรอกคำค้นหา ให้ส่ง Array เปล่ากลับไปเลย (ไม่เปลือง Database)
        if (!keyword.trim()) {
          return res.json({
            data: [],
            total: 0,
          });
        }

        // เรียก Service เพื่อไปดึงข้อมูลจาก Database
        const result = await publicService.searchRepairForms(
          keyword,
          limit,
          offset,
        );

        // ส่งข้อมูลกลับไปให้หน้าบ้าน
        return res.json({
          data: result.data,
          total: result.total,
        });
      } catch (error) {
        // กรณีเกิด Error (เช่น Database หลุด)
        console.error("[PUBLIC][SEARCH]", error);
        return res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
      }
    },
  };
};
