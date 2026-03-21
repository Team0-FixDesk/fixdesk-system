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
 *  Route สำหรับ Public Module ในระบบ FixDesk
 *  ทำหน้าที่:
 * - กำหนดเส้นทาง (Endpoints) สำหรับ Public API
 * - เชื่อมต่อกับ Controller เพื่อจัดการคำขอที่เกี่ยวข้องกับ Public API
 * - โครงสร้างเป็นแบบ Layered Architecture เพื่อแยกความรับผิดชอบอย่างชัดเจน
 * - รองรับการค้นหาใบแจ้งซ่อมแบบ Public โดยไม่ต้อง Login
 * 
 * @usedBy
 * - app.js (หรือ server.js) เพื่อเชื่อมต่อ Route นี้เข้ากับ Express Application
 * - public-controller.js เพื่อเชื่อมต่อ Controller กับ Service
 * - public-service.js เพื่อเชื่อมต่อกับ Service Layer ในการจัดการ Public API
 * - location-route.js เพื่อเชื่อมต่อกับ Route ที่เกี่ยวข้องกับการค้นหาข้อมูลสถานที่แบบ Public
 * - repair-route.js เพื่อเชื่อมต่อกับ Route ที่เกี่ยวข้องกับการค้นหาใบแจ้งซ่อมแบบ Public
 * - stock-route.js เพื่อเชื่อมต่อกับ Route ที่เกี่ยวข้องกับการค้นหาข้อมูลสต็อกแบบ Public
 * - user-route.js เพื่อเชื่อมต่อกับ Route ที่เกี่ยวข้องกับการค้นหาข้อมูลผู้ใช้งานแบบ Public
 * - tech-route.js เพื่อเชื่อมต่อกับ Route ที่เกี่ยวข้องกับการค้นหาข้อมูลช่างแบบ Public
 * 
 * ---------------------------------------------------------------------
 * @changelog
 *  [2026-02-10, พชร ไพศรีสกุล] V 1.0.0
 *   - Initial implementation Public Route ตาม Layered Architecture
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
