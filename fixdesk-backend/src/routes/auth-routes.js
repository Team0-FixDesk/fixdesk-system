/**
 * =====================================================================
 * @file            auth.route.js
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
 *  Route สำหรับ Authentication Module ในระบบ FixDesk
 *  ทำหน้าที่:
 *  - กำหนดเส้นทาง (Endpoints) สำหรับการเข้าสู่ระบบ (Login)
 *  - เชื่อมต่อกับ Controller เพื่อจัดการคำขอที่เกี่ยวข้องกับ Authentication
 *  - โครงสร้างเป็นแบบ Layered Architecture เพื่อแยกความรับผิดชอบอย่างชัดเจน
 * 
 * @usedBy
 *  - app.js (หรือ server.js) เพื่อเชื่อมต่อ Route นี้เข้ากับ Express Application
 *  - auth-controller.js เพื่อเชื่อมต่อ Controller กับ Service
 *  - auth-service.js เพื่อเชื่อมต่อกับ Service Layer ในการจัดการ Authentication
 *  - auth-middleware.js เพื่อใช้ Middleware ในการป้องกันเส้นทางที่ต้องการการยืนยันตัวตน
 *  - repair-route.js เพื่อเชื่อมต่อกับ Route ที่เกี่ยวข้องกับการจัดการใบแจ้งซ่อมที่ต้องมีการยืนยันตัวตน
 *  - location-route.js เพื่อเชื่อมต่อกับ Route ที่เกี่ยวข้องกับการจัดการสถานที่ที่ต้องมีการยืนยันตัวตน
 *  - template-route.js เพื่อเชื่อมต่อกับ Route ที่เกี่ยวข้องกับการดาวน์โหลด Template Excel ที่ต้องมีการยืนยันตัวตน
 *  - stock-route.js เพื่อเชื่อมต่อกับ Route ที่เกี่ยวข้องกับการจัดการสต็อกที่ต้องมีการยืนยันตัวตน
 *  - user-route.js เพื่อเชื่อมต่อกับ Route ที่เกี่ยวข้องกับการจัดการผู้ใช้งานที่ต้องมีการยืนยันตัวตน
 *  - tech-route.js เพื่อเชื่อมต่อกับ Route ที่เกี่ยวข้องกับการจัดการช่างที่ต้องมีการยืนยันตัวตน
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  [2026-02-18, พชร ไพศรีสกุล] V 1.0.0
 *   - Initial implementation Auth Route ตาม Layered Architecture
 *
 * =====================================================================
 */

const express = require("express");

/**
 * กำหนดเส้นทาง (Routes) สำหรับ Authentication Module
 * เชื่อมต่อ Service และ Controller เข้าด้วยกัน
 * และกำหนด endpoint สำหรับการเข้าสู่ระบบ
 *
 * @param {Object} db - Database connection instance
 * @returns {import("express").Router}
 */
module.exports = (db) => {
  const router = express.Router();

  // เชื่อม Service และ Controller เข้าด้วยกัน
  const authService = require("../services/auth-service")(db);
  const authController = require("../controllers/auth-controller")(authService);

  /* ===================== LOGIN ROUTES ===================== */
  /**
   * POST /login
   * ใช้สำหรับเข้าสู่ระบบ และรับ JWT Token
   *
   * @route POST /login
   */
  router.post("/login", authController.login);

  return router;
};
