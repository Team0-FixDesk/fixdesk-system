/**
 * =====================================================================
 * @file            user.route.js
 * @layer           Route Layer (Routing Layer)
 * @version         1.1.0
 * @since           2026-02-10
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *
 * @lastModified    2026-02-25
 * @lastModifiedBy  พชร ไพศรีสกุล
 * ---------------------------------------------------------------------
 * @description
 *  Route สำหรับจัดการระบบผู้ใช้งาน (User Management)
 *  ทำหน้าที่กำหนด endpoint และเชื่อมต่อ Controller กับ Service
 *
 *  รองรับการทำงาน:
 *    - ดึงข้อมูล Titles และ Roles
 *    - จัดการผู้ใช้งาน (CRUD)
 *    - จัดการข้อมูลส่วนตัว
 *    - Import ผู้ใช้งาน
 *
 * @useby
 * - Frontend Application ที่ต้องการจัดการผู้ใช้งาน (User Management)
 * 
 * ---------------------------------------------------------------------
 * @changelog
 *  [2026-02-10, พชร ไพศรีสกุล] V 1.0.0
 *  - Initial implementation User Route ตาม Layered Architecture
 *  [2026-02-25, พชร ไพศรีสกุล] V 1.1.0
 *  - แก้ไขการสร้างบัญชีผู้ใช้ และ import จากไฟล์ ให้รองรับการสร้าง default รหัสผ่าน
 *  
 * =====================================================================
 */

const express = require("express");
const authMiddleware = require("../middlewares/auth-middleware");

/**
 * กำหนดเส้นทาง (Routes) สำหรับ User Module
 * เชื่อมต่อ Service และ Controller เข้าด้วยกัน
 *
 * @param {Object} db - Database connection instance
 * @returns {import("express").Router}
 */
module.exports = (db) => {
  const router = express.Router();
  const userService = require("../services/user-service")(db);
  const userController = require("../controllers/user-controller")(userService);

  // --- GENERAL DATA ROUTES ---
  /**
   * GET /titles
   * ดึงรายการคำนำหน้าชื่อ
   * @route GET /titles
   * @middleware authMiddleware
   */
  router.get("/titles", authMiddleware, userController.getTitles);

  /**
   * GET /roles
   * ดึงรายการบทบาทผู้ใช้งาน
   * @route GET /roles
   * @middleware authMiddleware
   */
  router.get("/roles", authMiddleware, userController.getRoles);

  // --- USER MANAGEMENT ROUTES ---
  /**
   * GET /users
   * ดึงรายการผู้ใช้งานทั้งหมด
   * @route GET /users
   * @middleware authMiddleware
   */
  router.get("/users", authMiddleware, userController.getUsers);

  /**
   * POST /users
   * สร้างผู้ใช้งานใหม่
   * @route POST /users
   */
  router.post("/users", userController.createUser);

  /**
   * GET /users/:id
   * ดึงข้อมูลผู้ใช้งานตาม ID
   * @route GET /users/:id
   * @middleware authMiddleware
   */
  router.get("/users/:id", authMiddleware, userController.getUserById);

  /**
   * PUT /users/:id
   * แก้ไขข้อมูลผู้ใช้งาน (Admin)
   * @route PUT /users/:id
   * @middleware authMiddleware
   */
  router.put("/users/:id", authMiddleware, userController.updateUser);

  /**
   * POST /users/:id/reset-password
   * รีเซ็ตรหัสผ่านผู้ใช้งาน
   * @route POST /users/:id/reset-password
   * @middleware authMiddleware
   */
  router.post(
    "/users/:id/reset-password",
    authMiddleware,
    userController.resetPassword,
  );

  /**
   * DELETE /users/:id
   * ลบผู้ใช้งาน
   * @route DELETE /users/:id
   * @middleware authMiddleware
   */
  router.delete("/users/:id", authMiddleware, userController.deleteUser);

  // --- PERSONAL PROFILE ROUTES ---
  /**
   * GET /user/:id
   * ดึงข้อมูลส่วนตัวของผู้ใช้งาน
   * @route GET /user/:id
   */
  router.get("/user/:id", userController.getUserById);

  /**
   * PUT /edit-personal/:id
   * แก้ไขข้อมูลส่วนตัวของผู้ใช้งาน
   * @route PUT /edit-personal/:id
   */
  router.put("/edit-personal/:id", userController.updatePersonalProfile);

  // --- IMPORT ROUTES ---
  /**
   * POST /users/import
   * Import ข้อมูลผู้ใช้งานแบบ batch
   * @route POST /users/import
   * @middleware authMiddleware
   */
  router.post("/users/import", authMiddleware, userController.importUsers);

  return router;
};
