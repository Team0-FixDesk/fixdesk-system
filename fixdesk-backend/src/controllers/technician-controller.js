/**
 * =====================================================================
 * @file            technician.controller.js
 * @layer           Controller (Application Layer)
 * @version         1.0.0
 * @since           2026-02-10
 * @author          พชร ไพศรีสกุล
 * @lastModified    2026-02-21
 * @lastModifiedBy  ปฏิพัทธ์ จงนันทพันธ์กุล
 * ---------------------------------------------------------------------
 * @description
 *  Controller สำหรับจัดการข้อมูลและการทำงานของช่างเทคนิค
 *   - จัดการข้อมูลช่างเทคนิค
 *   - จัดการประเภทงานของช่าง
 *   - แสดงรายการงานซ่อมของตนเอง
 *   - แสดงประวัติงานซ่อม
 *   - แสดงใบเบิกวัสดุ/อุปกรณ์ของตนเอง
 *   - ปิดงานซ่อม / ส่งงาน Outsource
 *   - ส่งคำขอเบิกวัสดุ/อุปกรณ์
 *
 * @requires
 *   - techService
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - แก้ไขข้อความแจ้งเตือน  [2026-02-21, ปฏิพัทธ์ จงนันทพันธ์กุล]
 * =====================================================================
 */

module.exports = (techService) => {
  return {
    /* --- Technician Data --- */
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

    /* --- Technician Types --- */
    async getTypes(req, res) {
      try {
        const types = await techService.getAllTechnicianTypes();
        res.json(types);
      } catch (err) {
        res.status(500).json({ message: "ดึงข้อมูลไม่สำเร็จ" });
      }
    },

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

    /* --- Job & Tasks --- */
    async getMyRepairs(req, res) {
      try {
        const techId = req.user.us_id;
        const jobs = await techService.getTechnicianRepairs(techId);
        res.json(jobs);
      } catch (err) {
        res.status(500).json({ message: "ดึงงานซ่อมไม่สำเร็จ" });
      }
    },

    async getHistory(req, res) {
      try {
        const techId = req.user.us_id;
        const jobs = await techService.getTechnicianHistory(techId);
        res.json(jobs);
      } catch (err) {
        res.status(500).json({ message: "ดึงประวัติไม่สำเร็จ" });
      }
    },

    async getMyStockForms(req, res) {
      try {
        const techId = req.user.us_id;
        const forms = await techService.getMyStockForms(techId);
        res.json(forms);
      } catch (err) {
        res.status(500).json({ message: "ดึงใบเบิกไม่สำเร็จ" });
      }
    },

    async closeJob(req, res) {
      try {
        const techId = req.user.us_id;
        const { rf_code } = req.params;
        const { status, tech_summary, tech_image_after } = req.body;

        // Default status = done
        const targetStatus = status || "done";

        await techService.closeJob(
          techId,
          rf_code,
          targetStatus,
          tech_summary,
          tech_image_after,
        );

        res.json({
          message:
            targetStatus === "done" ? "ปิดงานสำเร็จ" : "ส่ง Outsource สำเร็จ",
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
        res.status(500).json({ message: "ดำเนินการไม่สำเร็จ" });
      }
    },

    async withdrawStock(req, res) {
      try {
        const { repair_code, items } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
          return res.status(400).json({ message: "ไม่พบรายการวัสดุ/อุปกรณ์" });
        }

        const techId = req.user.us_id;
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
