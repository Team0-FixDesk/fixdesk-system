/**
 * =====================================================================
 * @file            tech.controller.js
 * @layer           Controller Layer (Presentation Layer)
 * @version         1.1.4
 * @since           2026-02-10
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *   - ปฏิพัทธ์ จงนันทพันธ์กุล
 *
 * @lastModified    2026-03-21
 * @lastModifiedBy  นราธิป แสนทวีสุข
 * ---------------------------------------------------------------------
 * @description
 *  Controller สำหรับจัดการข้อมูลและการทำงานของช่าง (Technician Management)
 *  ทำหน้าที่รับ request จาก client และเรียกใช้งาน techService
 *
 *  รองรับการทำงาน:
 *    - ดึงข้อมูลช่าง
 *    - จัดการประเภทงานของช่าง
 *    - ดึงรายการงานซ่อมและประวัติ
 *    - ปิดงานซ่อม
 *    - เบิกสินค้าโดยช่าง
 *    - ดึงข้อมูลใบเบิกของช่าง
 *
 * @usedBy
 *   - technician-route.js
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  [2026-02-10, พชร ไพศรีสกุล] V1.0.0
 *   - Initial implementation Technician Controller ตาม Layered Architecture
 *  [2026-02-12, พชร ไพศรีสกุล] V1.1.0
 *   - แก้ไขเรื่องประเภทงานซ่อม
 *  [2026-02-20, นราธิป แสนทวีสุข] V1.1.1
 *   - เพิ่ม logging ใน withdrawStock เพื่อติดตาม transactionแสดงข้อมูล techId, repair_code, itemCount เมื่อเบิกของ
 *  [2026-02-21, ปฏิพัทธ์ จงนันทพันธ์กุล] V1.1.2  
 *   - แก้ไขข้อความแจ้งเตือน  
 *  [2026-03-17, นราธิป แสนทวีสุข] V1.1.3
 *   - เพิ่มระบบอัปโหลดรูปภาพหลังซ่อม (after-repair image upload)
 *     - แก้ไข closeJob() รองรับการส่ง FormData พร้อมไฟล์
 *     - Extract file path จาก multer req.file
 *     - Fallback: ใช้ tech_image_after จาก body ถ้าไม่มี file upload
 *     [2026-03-21, นราธิป แสนทวีสุข] V1.1.4
 *   - ปรับปรุงการ Logging แจ้งเตือน Error กรณีปิดงานในฐานข้อมูลไม่สำเร็จ
 *     
 * =====================================================================
 */

module.exports = (techService) => {
  return {
    /* --- TECHNICIAN DATA CONTROLLER --- */
    /**
     * ดึงรายการช่างทั้งหมด
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     * @contributors
     *  - พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async getTechnicians(req, res) {
      try {
        const techs = await techService.getAllTechnicians();
        res.json(techs);
      } catch (err) {
        res
          .status(500)
          .json({ message: "ดึงข้อมูลช่างไม่สำเร็จ", error: err.message });
      }
    },

    /* --- TECHNICIAN TYPE CONTROLLER --- */
    /**
     * ดึงรายการประเภทงานของช่าง
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-12
     * @lastModifiedBy พชร ไพศรีสกุล
     * @contributors
     *  - พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async getTypes(req, res) {
      try {
        const types = await techService.getAllTechnicianTypes();
        res.json(types);
      } catch (err) {
        res.status(500).json({ message: "ดึงข้อมูลไม่สำเร็จ" });
      }
    },

    /**
     * เพิ่มประเภทงานของช่าง
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-12
     * @lastModifiedBy พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async createType(req, res) {
      try {
        const { tt_name } = req.body;
        if (!tt_name?.trim())
          return res.status(400).json({ message: "กรุณากรอกชื่อประเภทงาน" });

        const newId = await techService.createTechnicianType(tt_name.trim());
        res.status(201).json({
          message: "เพิ่มประเภทงานสำเร็จ",
          tt_id: newId,
          tt_name: tt_name.trim(),
        });
      } catch (err) {
        if (err.message === "DUPLICATE_NAME")
          return res.status(400).json({ message: "ชื่อซ้ำในระบบ" });
        res.status(500).json({ message: "เพิ่มข้อมูลไม่สำเร็จ" });
      }
    },

    /**
     * แก้ไขประเภทงานของช่าง
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
    async updateType(req, res) {
      try {
        const { tt_name } = req.body;

        if (!tt_name?.trim())
          return res.status(400).json({ message: "กรุณากรอกชื่อประเภทงาน" });

        await techService.updateTechnicianType(req.params.id, tt_name.trim());

        res.json({ message: "แก้ไขข้อมูลสำเร็จ" });
      } catch (err) {
        if (err.message === "DEPENDENCY_EXISTS")
          return res
            .status(400)
            .json({ message: "ประเภทนี้ถูกใช้งานอยู่ แก้ไขไม่ได้" });

        if (err.message === "DUPLICATE_NAME")
          return res.status(400).json({ message: "ชื่อซ้ำในระบบ" });

        if (err.message === "NOT_FOUND")
          return res.status(404).json({ message: "ไม่พบข้อมูล" });

        res.status(500).json({ message: "แก้ไขข้อมูลไม่สำเร็จ" });
      }
    },

    /**
     * ลบประเภทงานของช่าง
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-12
     * @lastModifiedBy พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async deleteType(req, res) {
      try {
        await techService.deleteTechnicianType(req.params.id);
        res.json({ message: "ลบข้อมูลสำเร็จ" });
      } catch (err) {
        if (err.message === "DEPENDENCY_EXISTS")
          return res
            .status(400)
            .json({ message: "ลบไม่ได้ มีการใช้งานอยู่ในแบบฟอร์ม" });
        if (err.message === "NOT_FOUND")
          return res.status(404).json({ message: "ไม่พบข้อมูล" });
        res.status(500).json({ message: "ลบข้อมูลไม่สำเร็จ" });
      }
    },

    /* --- TECHNICIAN JOB CONTROLLER --- */
    /**
     * ดึงรายการงานซ่อมของช่าง (Current Jobs)
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
    async getMyRepairs(req, res) {
      try {
        const techId = req.user.us_id;
        const jobs = await techService.getTechnicianRepairs(techId);
        res.json(jobs);
      } catch (err) {
        res.status(500).json({ message: "ดึงงานซ่อมไม่สำเร็จ" });
      }
    },

    /**
     * ดึงประวัติการทำงานของช่าง
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
    async getHistory(req, res) {
      try {
        const techId = req.user.us_id;
        const jobs = await techService.getTechnicianHistory(techId);
        res.json(jobs);
      } catch (err) {
        res.status(500).json({ message: "ดึงประวัติไม่สำเร็จ" });
      }
    },

    /**
     * ดึงรายการใบเบิกสินค้าของช่าง
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
    async getMyStockForms(req, res) {
      try {
        const techId = req.user.us_id;
        const forms = await techService.getMyStockForms(techId);
        res.json(forms);
      } catch (err) {
        res.status(500).json({ message: "ดึงใบเบิกไม่สำเร็จ" });
      }
    },

    /**
     * ปิดงานซ่อมหรือส่งต่อ Outsource / อื่นๆ
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-22
     * @lastModifiedBy นราธิป แสนทวีสุข
     * @contributors
     *  - พชร ไพศรีสกุล
     *  - นราธิป แสนทวีสุข
     *
     * @param {Object} req - { status, tech_summary, tech_image_after, repair_method, repair_method_remark, result_status, result_remark }
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async closeJob(req, res) {
      try {
        const techId = req.user.us_id;
        const { rf_code } = req.params;
        const {
          status,
          tech_summary,
          tech_image_after,
          rf_tech_image_after,
          repair_method,
          repair_method_remark,
          result_status,
          result_remark
        } = req.body;

        let techImageAfterPath = tech_image_after || rf_tech_image_after || null;
        if (req.files && req.files.length > 0) {
          const paths = req.files.map((f) => `/uploads/repair/${f.filename}`);
          techImageAfterPath = JSON.stringify(paths);
        }

        // Default status = done
        const targetStatus = status || "done";

        await techService.closeJob(
          techId,
          rf_code,
          targetStatus,
          tech_summary,
          techImageAfterPath,
          repair_method,
          repair_method_remark,
          result_status,
          result_remark
        );

        const statusMessages = {
          done: "ปิดงานสำเร็จ",
          outsource: "ส่ง Outsource สำเร็จ",
          other: "บันทึกข้อมูลสำเร็จ"
        };

        res.json({
          message: statusMessages[targetStatus] || "บันทึกข้อมูลสำเร็จ",
        });
      } catch (err) {
        if (err.message === "PENDING_STOCK_APPROVAL")
          return res.status(400).json({
            message: "ไม่สามารถปิดงานได้ มีใบเบิกที่รออนุมัติอยู่",
          });

        if (err.message === "JOB_NOT_FOUND_OR_INVALID_STATUS")
          return res
            .status(400)
            .json({ message: "ไม่พบงานซ่อม หรือสถานะไม่ถูกต้อง" });
          
        console.error("Close job error:", err);
        res.status(500).json({ message: "ดำเนินการไม่สำเร็จ", error: err.message });
      }
    },
     /* เบิกสินค้าโดยช่าง
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
    async withdrawStock(req, res) {
      try {
        const { repair_code, items } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
          return res.status(400).json({ message: "ไม่พบรายการวัสดุ/อุปกรณ์" });
        }

        const techId = req.user.us_id;
        
        console.log("🛍️ [Technician withdrawStock] Starting:", { techId, repair_code, itemCount: items.length });
        
        const result = await techService.withdrawStock(
          techId,
          repair_code,
          items,
        );

        res.json({ message: "ส่งแบบฟอร์มขอเบิกเรียบร้อย", sf_code: result.sfCode });
      } catch (err) {
        if (err.message.startsWith("INSUFFICIENT_STOCK"))
          return res
            .status(400)
            .json({ message: "จำนวนวัสดุ/อุปกรณ์ไม่เพียงพอ : " + err.message.split(":")[1] });
        if (err.message.startsWith("PRODUCT_NOT_FOUND"))
          return res
            .status(404)
            .json({ message: "ไม่พบรายการวัสดุ/อุปกรณ์ที่ต้องการ : " + err.message.split(":")[1] });
        res
          .status(500)
          .json({ message: "ส่งแบบฟอร์มขอเบิกไม่สำเร็จ", error: err.message });
      }
    },
  };
};
