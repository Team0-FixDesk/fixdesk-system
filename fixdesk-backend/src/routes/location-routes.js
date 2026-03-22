/**
 * =====================================================================
 * @file            location.route.js
 * @layer           Route Layer (Routing Layer)
 * @version         1.1.0
 * @since           2026-02-10
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *   - นราธิป แสนทวีสุข
 *
 * @lastModified    2026-03-03
 * @lastModifiedBy  นราธิป แสนทวีสุข
 * ---------------------------------------------------------------------
 * @description
 *  Route สำหรับ Location Module ในระบบ FixDesk
 *  ทำหน้าที่:
 *  - กำหนดเส้นทาง (Endpoints) สำหรับการจัดการสถานที่ เช่น อาคาร ชั้น และห้อง
 *  - เชื่อมต่อกับ Controller เพื่อจัดการคำขอที่เกี่ยวข้องกับ Location
 *  - โครงสร้างเป็นแบบ Layered Architecture เพื่อแยกความรับผิดชอบอย่างชัดเจน
 *  - รองรับการทำงาน:
 *    - CRUD สำหรับ Buildings, Floors และ Rooms
 *    - Import ข้อมูลสถานที่แบบ Bulk
 *    - ตรวจสอบการใช้งานสถานที่ในใบแจ้งซ่อมก่อนแก้ไข/ลบ
 * 
 * @usedBy
 *  - app.js (หรือ server.js) เพื่อเชื่อมต่อ Route นี้เข้ากับ Express Application
 *  - location-controller.js เพื่อเชื่อมต่อ Controller กับ Service
 *  - location-service.js เพื่อเชื่อมต่อกับ Service Layer ในการจัดการ Location
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  [2026-02-18, พชร ไพศรีสกุล] V 1.0.0
 *  - Initial implementation Location Route ตาม Layered Architecture 
 *  [2026-03-03, นราธิป แสนทวีสุข] V 1.1.0
 *  - เพิ่ม endpoint GET /locations/check-usage/:type/:id
 *  - เพื่อตรวจสอบการใช้งานสถานที่ในใบแจ้งซ่อมก่อนแก้ไข/ลบ
 *
 * =====================================================================
 */

const express = require("express");
const authMiddleware = require("../middlewares/auth-middleware"); // เรียกใช้ Middleware ที่แยกไฟล์ไปแล้ว

/**
 * กำหนดเส้นทาง (Routes) สำหรับ Location Module
 * เชื่อมต่อ Location Service และ Controller
 * และกำหนด endpoint สำหรับจัดการ Buildings, Floors และ Rooms
 *
 * @param {Object} db - Database connection instance
 * @returns {import("express").Router}
 */
module.exports = (db) => {
  const router = express.Router();
  const locationService = require("../services/location-service")(db);
  const locationController = require("../controllers/location-controller")(
    locationService,
  );

  // --- BUILDING ROUTES ---
  /**
   * GET /buildings
   * ดึงรายการอาคารทั้งหมด
   * @route GET /buildings
   */
  router.get("/buildings", locationController.getBuildings);

  /**
   * POST /buildings
   * สร้างอาคารใหม่
   * @route POST /buildings
   * @middleware authMiddleware
   */
  router.post("/buildings", authMiddleware, locationController.createBuilding);

  /**
   * PUT /buildings/:id
   * แก้ไขข้อมูลอาคาร
   * @route PUT /buildings/:id
   * @middleware authMiddleware
   */
  router.put(
    "/buildings/:id",
    authMiddleware,
    locationController.updateBuilding,
  );

  /**
   * DELETE /buildings/:id
   * ลบอาคาร
   * @route DELETE /buildings/:id
   * @middleware authMiddleware
   */
  router.delete(
    "/buildings/:id",
    authMiddleware,
    locationController.deleteBuilding,
  );

  // --- FLOOR ROUTES ---
  /**
   * GET /floors
   * ดึงรายการชั้นทั้งหมด
   * @route GET /floors
   */
  router.get("/floors", locationController.getFloors);

  /**
   * GET /floors/:buildingId
   * ดึงรายการชั้นตามอาคาร
   * @route GET /floors/:buildingId
   */
  router.get("/floors/:buildingId", locationController.getFloors);

  /**
   * POST /floors
   * สร้างชั้นใหม่
   * @route POST /floors
   * @middleware authMiddleware
   */
  router.post("/floors", authMiddleware, locationController.createFloor);

  /**
   * PUT /floors/:id
   * แก้ไขข้อมูลชั้น
   * @route PUT /floors/:id
   * @middleware authMiddleware
   */
  router.put("/floors/:id", authMiddleware, locationController.updateFloor);

  /**
   * DELETE /floors/:id
   * ลบชั้น
   * @route DELETE /floors/:id
   * @middleware authMiddleware
   */
  router.delete("/floors/:id", authMiddleware, locationController.deleteFloor);

  // --- ROOM ROUTES ---
  /**
   * GET /rooms
   * ดึงรายการห้องทั้งหมด
   * @route GET /rooms
   */
  router.get("/rooms", locationController.getRooms);

  /**
   * GET /rooms/:floorId
   * ดึงรายการห้องตามชั้น
   * @route GET /rooms/:floorId
   */
  router.get("/rooms/:floorId", locationController.getRooms);

  /**
   * POST /rooms
   * สร้างห้องใหม่
   * @route POST /rooms
   * @middleware authMiddleware
   */
  router.post("/rooms", authMiddleware, locationController.createRoom);

  /**
   * PUT /rooms/:id
   * แก้ไขข้อมูลห้อง
   * @route PUT /rooms/:id
   * @middleware authMiddleware
   */
  router.put("/rooms/:id", authMiddleware, locationController.updateRoom);

  /**
   * DELETE /rooms/:id
   * ลบห้อง
   * @route DELETE /rooms/:id
   * @middleware authMiddleware
   */
  router.delete("/rooms/:id", authMiddleware, locationController.deleteRoom);

  // --- IMPORT ROUTES ---
  /**
   * POST /locations/import
   * Import ข้อมูลสถานที่แบบ Bulk
   * @route POST /locations/import
   * @middleware authMiddleware
   */
  router.post(
    "/locations/import",
    authMiddleware,
    locationController.importLocations,
  );

  // --- USAGE CHECK ROUTES ---
  /**
   * GET /locations/check-usage/:type/:id
   * เช็คการใช้งานในรายการแจ้งซ่อม
   * @route GET /locations/check-usage/:type/:id
   * @param {string} type - building, floor หรือ room
   * @param {number} id - ID ของสถานที่
   */
  router.get(
    "/locations/check-usage/:type/:id",
    locationController.checkUsageInRepairs,
  );

  return router;
};
