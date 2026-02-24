/**
 * =====================================================================
 * @file            public.route.js
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
 *  Route สำหรับ Public API
 *  ใช้สำหรับ endpoint ที่ไม่ต้องมีการยืนยันตัวตน (Public Access)
 *
 *  รองรับการทำงาน:
 *    - ค้นหาใบแจ้งซ่อม (Public Search)
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - Initial implementation Public Route ตาม Layered Architecture
 *     [2026-02-10, พชร ไพศรีสกุล] V 1.0.0
 *
 * =====================================================================
 */
const express = require("express");

/**
 * กำหนดเส้นทาง (Routes) สำหรับ Public Module
 * เชื่อมต่อ Public Service และ Controller
 * และกำหนด endpoint สำหรับ Public API
 *
 * @param {Object} db - Database connection instance
 * @returns {import("express").Router}
 */
module.exports = (db) => {
  const router = express.Router();

  // เชื่อม Service และ Controller
  const publicService = require("../services/public-service")(db);
  const publicController = require("../controllers/public-controller")(
    publicService,
  );

  /**
   * GET /search
   * ค้นหาใบแจ้งซ่อมแบบ Public
   * ใช้สำหรับค้นหาข้อมูลโดยไม่ต้อง Login
   * @route GET /search
   */
  router.get("/search", publicController.search);

  return router;
};
