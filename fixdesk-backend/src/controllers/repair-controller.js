/**
 * =====================================================================
 * @file            repair-controller.js
 * @layer           Controller (Repair Management Layer)
 * @version         1.0.0
 * @since           2026-02-10
 * @author          พชร ไพศรีสกุล
 * @lastModified    2026-02-20
 * @lastModifiedBy  ปฏิพัทธ์ จงนันทพันธ์กุล
 * ---------------------------------------------------------------------
 * @description
 *  Controller สำหรับจัดการระบบแจ้งซ่อม
 *   - อัปโหลดไฟล์ประกอบการแจ้งซ่อม
 *   - ลบไฟล์ที่อัปโหลด
 *   - สร้างใบแจ้งซ่อมใหม่
 *   - แก้ไขข้อมูลใบแจ้งซ่อม
 *   - ลบใบแจ้งซ่อม
 *   - ดึงรายการแจ้งซ่อมสำหรับผู้ดูแลระบบ
 *   - ดึงรายการแจ้งซ่อมของผู้ใช้
 *   - ดึงรายละเอียดใบแจ้งซ่อมรายรายการ
 *   - มอบหมายช่างรายบุคคล
 *   - มอบหมายช่างเป็นทีม
 *   - ช่างกดรับงาน
 *   - ดึงรายการงานของช่าง
 *   - ดึงข้อมูลสถิติการแจ้งซ่อม
 *
 * @requires
 *   - repairService
 *   - fs
 *   - path
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - แก้ไขข้อความแจ้งเตือน  [2026-02-20, ปฏิพัทธ์ จงนันทพันธ์กุล]
 * =====================================================================
 */

module.exports = (repairService) => {
  return {
    // --- File Upload Helper ---
    async uploadFiles(req, res) {
      try {
        if (!req.files || req.files.length === 0)
          return res.status(400).json({ message: "กรุณาเลือกไฟล์" });

        const filePaths = req.files.map(
          (file) => `/uploads/repair/${file.filename}`,
        );
        res.json({
          message: "อัพโหลดไฟล์สำเร็จ",
          files: req.files.map((file) => ({
            filename: file.filename,
            originalname: file.originalname,
            path: `/uploads/repair/${file.filename}`,
            size: file.size,
            mimetype: file.mimetype,
          })),
          filePaths,
        });
      } catch (err) {
        res.status(500).json({ message: "อัพโหลดล้มเหลว", error: err.message });
      }
    },

    async deleteFile(req, res) {
      const fs = require("fs");
      const path = require("path");
      const filePath = path.join(
        __dirname,
        "../../uploads/repair",
        req.params.filename,
      ); // ปรับ Path ให้ตรงโครงสร้าง
      fs.unlink(filePath, (err) => {
        if (err) return res.status(500).json({ message: "ลบไฟล์ไม่สำเร็จ" });
        res.json({ message: "ลบไฟล์สำเร็จ" });
      });
    },

    // --- Repair Actions ---
    async createRepair(req, res) {
      try {
        const { us_id, repair_type_id, room_id, problem_detail } = req.body;
        if (!us_id || !repair_type_id || !room_id || !problem_detail) {
          return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
        }

        // รองรับทั้งแบบ upload ไฟล์พร้อม submit และแบบส่ง path มาเป็น array
        let filePaths = [];
        if (req.files && req.files.length > 0) {
          filePaths = req.files.map((f) => `/uploads/repair/${f.filename}`);
        } else if (req.body.file_paths) {
          filePaths = req.body.file_paths; // กรณีส่งมาเป็น JSON
        }

        const data = {
          usId: us_id,
          repairTypeId: repair_type_id,
          roomId: room_id,
          assetCode: req.body.asset_code,
          problemDetail: problem_detail,
          issueDescription: req.body.issue_description,
          phoneNumber: req.body.phone_number,
          urgency: req.body.urgency,
          filePaths,
        };

        const result = await repairService.createRepair(data);
        res.json({
          message: "บันทึกฟอร์มแจ้งซ่อมสำเร็จ",
          id: result.insertId,
          rf_code: result.rfCode,
          uploaded_files: req.files
            ? req.files.map((f) => ({ filename: f.filename }))
            : [],
        });
      } catch (err) {
        res
          .status(500)
          .json({ message: "บันทึกข้อมูลไม่สำเร็จ", error: err.message });
      }
    },

    async updateRepair(req, res) {
      try {
        const { code } = req.params;
        const { repair_type_id, room_id, problem_detail, existing_files } =
          req.body;

        if (!repair_type_id || !room_id || !problem_detail)
          return res.status(400).json({ message: "ข้อมูลไม่ครบ" });

        // จัดการไฟล์ (รวมของเก่า + ของใหม่)
        const existingPaths = existing_files ? JSON.parse(existing_files) : [];
        const newPaths = req.files
          ? req.files.map((f) => `/uploads/repair/${f.filename}`)
          : [];
        // *หมายเหตุ: ถ้าใช้ endpoint /repair-requests (JSON) req.body.file_paths จะถูกใช้แทน logic นี้
        const finalPaths = req.body.file_paths || [
          ...existingPaths,
          ...newPaths,
        ];

        const data = {
          usId: req.body.us_id,
          repairTypeId: repair_type_id,
          roomId: room_id,
          assetCode: req.body.asset_code,
          problemDetail: problem_detail,
          issueDescription: req.body.issue_description,
          phoneNumber: req.body.phone_number,
          urgency: req.body.urgency,
          filePaths: finalPaths,
        };

        const affected = await repairService.updateRepair(code, data);
        if (affected === 0)
          return res
            .status(404)
            .json({ message: "ไม่พบรายการแจ้งซ่อมที่ต้องการแก้ไข กรุณาโหลดหน้าใหม่ และลองอีกครั้ง" });

        res.json({ message: "แก้ไขข้อมูลเรียบร้อยแล้ว", updated: affected });
      } catch (err) {
        res
          .status(500)
          .json({ message: "แก้ไขข้อมูลไม่สำเร็จ", error: err.message });
      }
    },

    async deleteRepair(req, res) {
      try {
        const affected = await repairService.deleteRepair(req.params.code);
        if (affected === 0)
          return res
            .status(400)
            .json({ message: "ไม่พบรายการแจ้งซ่อมที่ต้องการลบ กรุณาโหลดหน้าใหม่ และลองอีกครั้ง" });
        res.json({ message: "ลบข้อมูลเรียบร้อยแล้ว" });
      } catch (err) {
        res.status(500).json({ message: "ลบข้อมูลไม่สำเร็จ", error: err.message });
      }
    },

    // --- Query Actions ---
    async getAdminRepairs(req, res) {
      try {
        const results = await repairService.getAdminRepairs();
        res.json(results);
      } catch (err) {
        res.status(500).json({ message: "ดึงข้อมูลไม่สำเร็จ" });
      }
    },

    async getUserRepairs(req, res) {
      try {
        const results = await repairService.getUserRepairs(req.params.userId);
        res.json(results);
      } catch (err) {
        res.status(500).json({ message: "ดึงข้อมูลไม่สำเร็จ" });
      }
    },

    async getRepairDetail(req, res) {
      try {
        const result = await repairService.getRepairDetail(req.params.code);
        if (!result)
          return res.status(404).json({ message: "ไม่พบใบแจ้งซ่อม" });
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
      }
    },

    // --- Assignments ---
    async assignIndividual(req, res) {
      try {
        const { rf_code, technician_id, is_lead, assigned_by, ra_assigned_by } =
          req.body;
        if (!rf_code || !technician_id)
          return res.status(400).json({ message: "ข้อมูลไม่ครบ" });

        // Logic Flag: default true if not provided or truthy
        const isLeadFlag = is_lead === true || is_lead === "1" || is_lead === 1;
        const assigner =
          ra_assigned_by || assigned_by || (req.user ? req.user.us_id : null);

        const result = await repairService.assignIndividual(
          rf_code,
          Number(technician_id),
          isLeadFlag,
          assigner,
        );

        if (result.status === "ALREADY_ASSIGNED")
          return res.json({ message: "ช่างนี้มอบหมายแล้วอยู่ในทีม" });

        res.json({ message: "มอบหมายช่างสำเร็จ", assigned_to: technician_id });
      } catch (err) {
        if (
          err.message === "TECH_NOT_FOUND" ||
          err.message === "NOT_A_TECHNICIAN"
        )
          return res.status(400).json({ message: "ผู้ใช้ไม่ใช่ช่าง" });
        if (err.message === "REPAIR_NOT_FOUND")
          return res.status(404).json({ message: "ไม่พบใบแจ้งซ่อม" });
        res
          .status(500)
          .json({ message: "มอบหมายงานไม่สำเร็จ", error: err.message });
      }
    },

    async assignTeam(req, res) {
      try {
        console.log('🔍 assignTeam - Request body:', req.body);
        const { rf_code, technician_ids, lead_id } = req.body;
        if (!rf_code || !Array.isArray(technician_ids))
          return res.status(400).json({ message: "ข้อมูลไม่ครบ" });

        const techIds = technician_ids.map(Number).filter(Number.isFinite);
        const leadIdNum = lead_id ? Number(lead_id) : techIds[0];
        console.log('🔍 assignTeam - Parsed data:', { rf_code, techIds, leadIdNum });

        if (techIds.length === 0)
          return res
            .status(400)
            .json({ message: "ต้องระบุช่างอย่างน้อย 1 คน" });

        const result = await repairService.assignTeam(
          rf_code,
          techIds,
          leadIdNum,
        );
        res.json({
          message: "มอบหมายเป็นทีมสำเร็จ",
          assigned_count: result.assignedCount,
          lead_id: leadIdNum,
        });
      } catch (err) {
        console.error('❌ assignTeam error:', err);
        res
          .status(500)
          .json({ message: "มอบหมายทีมไม่สำเร็จ", error: err.message });
      }
    },

    // --- Tech Features ---
    async acceptJob(req, res) {
      try {
        const techId = req.user.us_id || req.user.id;
        const affected = await repairService.acceptJob(req.params.code, techId);

        if (affected === 0)
          return res
            .status(400)
            .json({ message: "รับงานไม่ได้ (สถานะอาจเปลี่ยนไปแล้ว)" });
        res.json({ message: "รับงานเรียบร้อยแล้ว", rf_code: req.params.code });
      } catch (err) {
        res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
      }
    },

    async getTechRepairs(req, res) {
      try {
        const techId = req.user.us_id || req.user.id;
        const results = await repairService.getTechRepairs(techId);
        res.json(results);
      } catch (err) {
        res.status(500).json({ message: "ดึงข้อมูลงานซ่อมไม่สำเร็จ" });
      }
    },

    async getStats(req, res) {
      try {
        const stats = await repairService.getStats(req.params.userId);
        res.json(stats);
      } catch (err) {
        res.status(500).json({ message: "ดึงสถิติไม่สำเร็จ" });
      }
    },
  };
};
