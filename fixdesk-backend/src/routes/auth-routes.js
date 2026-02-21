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
 *  Route สำหรับจัดการ Authentication
 *  ทำหน้าที่กำหนด endpoint และเชื่อมต่อ Controller กับ Service
 *
 *  รองรับการทำงาน:
 *    - Login ผู้ใช้งาน
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - Initial implementation Auth Route ตาม Layered Architecture
 *     [2026-02-18, พชร ไพศรีสกุล] V 1.0.0
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
