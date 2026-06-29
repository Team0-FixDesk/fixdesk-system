/**
 * =====================================================================
 * @file            technician.route.js
 * @layer           Route Layer (Routing Layer)
 * @version         1.1.1
 * @since           2026-02-10
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *   - นราธิป แสนทวีสุข
 *
 * @lastModified    2026-03-21
 * @lastModifiedBy  นราธิป แสนทวีสุข
 * ---------------------------------------------------------------------
 * @description
 *  Route สำหรับจัดการระบบช่าง (Technician Management)
 *  ทำหน้าที่กำหนด endpoint และเชื่อมต่อ Controller กับ Service
 *
 *  รองรับการทำงาน:
 *    - ดึงข้อมูลช่าง
 *    - จัดการประเภทงานของช่าง
 *    - ดึงรายการงานซ่อม
 *    - ดึงประวัติการทำงาน
 *    - ดึงใบเบิกสินค้าของช่าง
 *    - ปิดงานซ่อม
 *    - เบิกสินค้าโดยช่าง
 *    - อัปโหลดรูปภาพหลังซ่อม
 * 
 *  ใช้ multer สำหรับจัดการ upload ไฟล์รูปภาพหลังซ่อม (after-repair image upload)
 * 
 * @usedBy
 *  - app.js (หรือ server.js) เพื่อเชื่อมต่อ Route นี้เข้ากับ Express Application
 *  - technician-controller.js เพื่อเชื่อมต่อ Controller กับ Service
 *  - technician-service.js เพื่อเชื่อมต่อกับ Service Layer ในการจัดการ Technician
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  [2026-02-10, พชร ไพศรีสกุล] V 1.0.0
 *   - Initial implementation Technician Route ตาม Layered Architecture
 *  [2026-03-17, นราธิป แสนทวีสุข] V 1.1.0
 *   - เพิ่มระบบอัปโหลดรูปภาพหลังซ่อม (after-repair image upload)
 *     - เพิ่ม Multer middleware สำหรับการจัดการไฟล์
 *     - กำหนด diskStorage ที่ /uploads/repair/
 *     - ชื่อไฟล์: RF_AFTER_YYYYMMDDHHMMSS_RANDOM.ext
 *     - Validation: image/* มีข้อจำกัดไฟล์ 50MB เท่านั้น
 *     [2026-03-17, นราธิป แสนทวีสุข] V 1.1.1
 *   - ขยายเพดาน Middleware ของ Multer ให้รองรับไฟล์ภาพ 10 ไฟล์ได้โดยไม่ Error
 *
 * =====================================================================
 */
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authMiddleware = require("../middlewares/auth-middleware");

/**
 * กำหนดเส้นทาง (Routes) สำหรับ Technician Module
 * เชื่อมต่อ Service และ Controller เข้าด้วยกัน
 *
 * @param {Object} db - Database connection instance
 * @returns {import("express").Router}
 */
module.exports = (db) => {
  const router = express.Router();
  const techService = require("../services/technician-service")(db);
  const techController = require("../controllers/technician-controller")(
    techService,
  );

  const repairUploadPath = path.join(__dirname, "../../uploads/repair");
  if (!fs.existsSync(repairUploadPath)) {
    fs.mkdirSync(repairUploadPath, { recursive: true });
  }

  const closeJobStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, repairUploadPath),
    filename: (req, file, cb) => {
      const dateTimeStamp = new Date()
        .toISOString()
        .replace(/[:.-]/g, "")
        .slice(0, 15);
      const randomSuffix = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");
      const ext = path.extname(file.originalname);
      cb(null, `RF_AFTER_${dateTimeStamp}_${randomSuffix}${ext}`);
    },
  });

  const closeJobFileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    if (
      allowedTypes.test(path.extname(file.originalname).toLowerCase()) &&
      allowedTypes.test(file.mimetype)
    ) {
      return cb(null, true);
    }
    cb(new Error("รองรับเฉพาะไฟล์รูปภาพเท่านั้น"));
  };

  const closeJobUpload = multer({
    storage: closeJobStorage,
    limits: { fileSize: 50 * 1024 * 1024, files: 10 },
    fileFilter: closeJobFileFilter,
  });

  // --- TECHNICIAN MANAGEMENT ROUTES ---
  /**
   * GET /technicians
   * ดึงรายการช่างทั้งหมด
   * @route GET /technicians
   * @middleware authMiddleware
   */
  router.get("/technicians", authMiddleware, techController.getTechnicians);

  // --- TECHNICIAN TYPES ROUTES---
  /**
   * GET /technician-types
   * ดึงรายการประเภทงานของช่าง
   * @route GET /technician-types
   */
  router.get("/technician-types", techController.getTypes);

  /**
   * POST /technician-types
   * เพิ่มประเภทงานของช่าง
   * @route POST /technician-types
   */
  router.post("/technician-types", techController.createType);

  /**
   * PUT /technician-types/:id
   * แก้ไขประเภทงานของช่าง
   * @route PUT /technician-types/:id
   */
  router.put("/technician-types/:id", techController.updateType);

  /**
   * DELETE /technician-types/:id
   * ลบประเภทงานของช่าง
   * @route DELETE /technician-types/:id
   */
  router.delete("/technician-types/:id", techController.deleteType);

  // --- TECHNICIAN TASKS ROUTES ---
  /**
   * GET /technician/repairs
   * ดึงรายการงานซ่อมของช่าง
   * @route GET /technician/repairs
   * @middleware authMiddleware
   */
  router.get(
    "/technician/repairs",
    authMiddleware,
    techController.getMyRepairs,
  );

  /**
   * GET /technician/history
   * ดึงประวัติการทำงานของช่าง
   * @route GET /technician/history
   * @middleware authMiddleware
   */
  router.get("/technician/history", authMiddleware, techController.getHistory);

  /**
   * GET /technician/my-stock-forms
   * ดึงรายการใบเบิกสินค้าของช่าง
   * @route GET /technician/my-stock-forms
   * @middleware authMiddleware
   */
  router.get(
    "/technician/my-stock-forms",
    authMiddleware,
    techController.getMyStockForms,
  );

  // --- TECHNICIAN ACTIONS ROUTES ---
  /**
   * PUT /technician/close-job/:rf_code
   * ปิดงานซ่อม
   * @route PUT /technician/close-job/:rf_code
   * @middleware authMiddleware
   */
  router.put(
    "/technician/close-job/:rf_code",
    authMiddleware,
    closeJobUpload.array("tech_image_after", 10),
    techController.closeJob,
  );

  /**
   * POST /withdraw
   * เบิกสินค้าโดยช่าง
   * @route POST /withdraw
   * @middleware authMiddleware
   */
  router.post("/withdraw", authMiddleware, techController.withdrawStock); // *ชื่อ Path ซ้ำกับ stock-routes แต่ Logic แยกกันตามบริบทของ User*

  return router;
};
