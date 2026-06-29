/**
 * =====================================================================
 * @file            repair.route.js
 * @layer           Route Layer (Routing Layer)
 * @version         1.0.0
 * @since           2026-02-10
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *   - นราธิป แสนทวีสุข
 *
 * @lastModified    2026-02-10
 * @lastModifiedBy  พชร ไพศรีสกุล
 * ---------------------------------------------------------------------
 * @description
 *  Route สำหรับจัดการใบแจ้งซ่อม (Repair Request Management)
 *  ทำหน้าที่กำหนด endpoint และเชื่อมต่อ Repair Controller กับ Service
 *  รองรับการทำงาน:
 *    - Upload และลบไฟล์แนบใบแจ้งซ่อม
 *    - สร้างและแก้ไขใบแจ้งซ่อม (พร้อมไฟล์ หรือ JSON)
 *    - ดึงข้อมูลใบแจ้งซ่อม (Admin, User, Technician)
 *    - มอบหมายงานให้ช่าง (Individual / Team)
 *    - การดำเนินการของช่าง (Accept Job)
 *    - ดูสถิติการแจ้งซ่อม
 *
 *  ใช้ multer สำหรับจัดการ upload ไฟล์
 *  และ authMiddleware สำหรับ endpoint ที่ต้องมีการยืนยันตัวตน
 *
 * @usedBy
 * - app.js (หรือ server.js) เพื่อเชื่อมต่อ Route นี้เข้ากับ Express Application
 * - repair-controller.js เพื่อเชื่อมต่อ Controller กับ Service
 * - repair-service.js เพื่อเชื่อมต่อกับ Service Layer ในการจัดการ Repair Requests
 *  
 * ---------------------------------------------------------------------
 * @changelog
 *   - Initial implementation Repair Route ตาม Layered Architecture
 *     [2026-02-10, พชร ไพศรีสกุล] V 1.0.0
 *
 * =====================================================================
 */

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authMiddleware = require("../middlewares/auth-middleware");

/**
 * กำหนดเส้นทาง (Routes) สำหรับ Repair Module
 * เชื่อมต่อ Repair Service และ Controller
 * และกำหนด endpoint สำหรับจัดการ Repair Requests และ File Upload
 * 
 * @param {Object} db - Database connection instance
 * @returns {import("express").Router}
 */
module.exports = (db) => {
  const router = express.Router();
  const repairService = require("../services/repair-service")(db);
  const repairController = require("../controllers/repair-controller")(
    repairService,
  );

  // --- Multer Config ---
  /**
   * กำหนด Path สำหรับจัดเก็บไฟล์แนบใบแจ้งซ่อม
   * ตรวจสอบว่าโฟลเดอร์ uploads/repair มีอยู่หรือไม่
   * หากไม่มี จะสร้างโฟลเดอร์อัตโนมัติ
   * @author นราธิป แสนทวีสุข
   * @since 2026-02-10
   */
  const repairUploadPath = path.join(__dirname, "../../uploads/repair");
  if (!fs.existsSync(repairUploadPath)) {
    fs.mkdirSync(repairUploadPath, { recursive: true });
  }

  /**
   * กำหนดรูปแบบการจัดเก็บไฟล์ด้วย multer.diskStorage
   * ตั้งค่า:
   *  - destination: โฟลเดอร์ปลายทาง
   *  - filename: รูปแบบชื่อไฟล์ (RF_YYYYMMDDHHMMSS_RANDOM.ext)
   * เพื่อป้องกันชื่อไฟล์ซ้ำกัน
   * @author พชร ไพศรีสกุล
   * @since 2026-02-10
   */
  const storage = multer.diskStorage({
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
      cb(null, `RF_${dateTimeStamp}_${randomSuffix}${ext}`);
    },
  });

  /**
   * ตรวจสอบประเภทไฟล์ก่อนอนุญาตให้อัพโหลด
   * รองรับ:
   *  - รูปภาพ: jpg, jpeg, png, gif, webp
   *  - วิดีโอ: mp4, avi, mov, wmv
   * ป้องกันการ upload ไฟล์ที่ไม่ปลอดภัย
   * @author นราธิป แสนทวีสุข
   * @since 2026-02-10
   *
   * @param {Object} req
   * @param {Object} file
   * @param {Function} cb
   */
  const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|avi|mov|wmv/;
    if (
      allowedTypes.test(path.extname(file.originalname).toLowerCase()) &&
      allowedTypes.test(file.mimetype)
    ) {
      return cb(null, true);
    }
    cb(new Error("รองรับเฉพาะไฟล์รูปภาพและวิดีโอเท่านั้น"));
  };

  /**
   * สร้าง multer instance สำหรับจัดการ upload ไฟล์
   * ตั้งค่า:
   *  - storage: รูปแบบการจัดเก็บ
   *  - fileSize limit: 50 MB ต่อไฟล์
   *  - files limit: สูงสุด 5 ไฟล์
   *  - fileFilter: ตรวจสอบประเภทไฟล์
   * ใช้ใน Repair Upload Routes
   */
  const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024, files: 5 },
    fileFilter,
  });

  // --- FILE UPLOAD ROUTES ---
  /**
   * POST /upload-repair-files
   * อัพโหลดไฟล์แนบสำหรับใบแจ้งซ่อม
   * @route POST /upload-repair-files
   */
  router.post(
    "/upload-repair-files",
    upload.array("files", 5),
    repairController.uploadFiles,
  );

  /**
   * DELETE /delete-file/:filename
   * ลบไฟล์แนบใบแจ้งซ่อม
   * @route DELETE /delete-file/:filename
   */
  router.delete("/delete-file/:filename", repairController.deleteFile);

  // --- REPAIR REQUEST CREATION ROUTES ---
  /**
   * POST /repair-requests-with-files
   * สร้างใบแจ้งซ่อมพร้อมไฟล์แนบ
   * @route POST /repair-requests-with-files
   */
  router.post(
    "/repair-requests-with-files",
    upload.array("files", 5),
    repairController.createRepair,
  );

  /**
   * POST /repair-requests
   * สร้างใบแจ้งซ่อมแบบ JSON
   * @route POST /repair-requests
   */
  router.post(
    "/repair-requests",
    express.json(),
    repairController.createRepair,
  );

  // --- REPAIR REQUEST UPDATE ROUTES ---
  /**
   * PUT /repair-requests-with-files/:code
   * แก้ไขใบแจ้งซ่อมพร้อมไฟล์แนบ
   * @route PUT /repair-requests-with-files/:code
   */
  router.put(
    "/repair-requests-with-files/:code",
    upload.array("files", 5),
    repairController.updateRepair,
  );

  /**
   * PUT /repair-requests/:code
   * แก้ไขใบแจ้งซ่อมแบบ JSON
   * @route PUT /repair-requests/:code
   */
  router.put("/repair-requests/:code", repairController.updateRepair);

  // --- REPAIR VIEW ROUTES ---
  /**
   * GET /admin/repairs
   * ดึงรายการใบแจ้งซ่อมทั้งหมดสำหรับ Admin
   * @route GET /admin/repairs
   * @middleware authMiddleware
   */
  router.get(
    "/admin/repairs",
    authMiddleware,
    repairController.getAdminRepairs,
  );

  /**
   * GET /my-repairs/:userId
   * ดึงรายการใบแจ้งซ่อมของผู้ใช้งาน
   * @route GET /my-repairs/:userId
   */
  router.get("/my-repairs/:userId", repairController.getUserRepairs);

  /**
   * DELETE /my-repairs/:code
   * ลบใบแจ้งซ่อมของผู้ใช้งาน
   * @route DELETE /my-repairs/:code
   * @middleware authMiddleware
   */
  router.delete(
    "/my-repairs/:code",
    authMiddleware,
    repairController.deleteRepair,
  );

  // --- REPAIR DETAIL ROUTES ---
  /**
   * GET /repair-requests/:code
   * ดึงรายละเอียดใบแจ้งซ่อม
   * @route GET /repair-requests/:code
   */
  router.get("/repair-requests/:code", repairController.getRepairDetail);

  // --- ASSIGNMENT ROUTES ---
  /**
   * POST /assign-repair
   * มอบหมายงานให้ช่างรายบุคคล
   * @route POST /assign-repair
   * @middleware authMiddleware
   */
  router.post(
    "/assign-repair",
    authMiddleware,
    repairController.assignIndividual,
  );

  /**
   * POST /assign-repair-team
   * มอบหมายงานให้ทีมช่าง
   * @route POST /assign-repair-team
   * @middleware authMiddleware
   */
  router.post(
    "/assign-repair-team",
    authMiddleware,
    repairController.assignTeam,
  );

  // --- TECHNICIAN ROUTES ---
  /**
   * PUT /technician/accept-job/:code
   * ช่างรับงานซ่อม
   * @route PUT /technician/accept-job/:code
   * @middleware authMiddleware
   */
  router.put(
    "/technician/accept-job/:code",
    authMiddleware,
    repairController.acceptJob,
  );

  /**
   * GET /technician/repairs
   * ดึงรายการงานซ่อมของช่าง
   * @route GET /technician/repairs
   * @middleware authMiddleware
   */
  router.get(
    "/technician/repairs",
    authMiddleware,
    repairController.getTechRepairs,
  );

  // --- STATISTICS ROUTES ---
  /**
   * GET /repair-stats/:userId
   * ดึงสถิติใบแจ้งซ่อม
   * @route GET /repair-stats/:userId
   */
  router.get("/repair-stats/:userId", repairController.getStats);

  return router;
};
