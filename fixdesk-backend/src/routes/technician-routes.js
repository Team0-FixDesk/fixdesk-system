/**
 * =====================================================================
 * @file            technician.route.js
 * @layer           Route Layer (Routing Layer)
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
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - Initial implementation Technician Route ตาม Layered Architecture
 *     [2026-02-10, พชร ไพศรีสกุล] V 1.0.0
 *
 * =====================================================================
 */
const express = require("express");
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
