/**
 * =====================================================================
 * @file            template-routes.js
 * @layer           Application Layer (Route)
 * @version         1.0.0
 * @since           2026-03-21
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *
 * @lastModified    2026-03-21
 * @lastModifiedBy  พชร ไพศรีสกุล
 * ---------------------------------------------------------------------
 * @description
 *  Route สำหรับจัดการการดาวน์โหลดไฟล์ Template Excel
 *  ทำหน้าที่:
 *  - กำหนด Endpoint สำหรับดาวน์โหลด Template Excel
 *  - รับคำขอจาก Client และส่งต่อไปยัง Controller ที่เกี่ยวข้อง
 *  - รองรับการดาวน์โหลด Template สำหรับ Users, Locations และ Stocks
 *  - โครงสร้างเป็นแบบ Layered Architecture
 * 
 * @useby 
 * - Frontend Application ที่ต้องการดาวน์โหลด Template Excel
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  [2026-03-21, พชร ไพศรีสกุล] V 1.0.0
 *  - เพิ่ม Endpoint /api/download-template/:type สำหรับดาวน์โหลด Template Excel
 *  - Initial implementation Template Download Routes
 *
 * =====================================================================
*/

const express = require("express");
const templateController = require("../controllers/template-controller");

module.exports = (databaseConnection) => {
  const router = express.Router();

  // ใช้ :type เพื่อให้ Endpoint ตัวเดียวรองรับได้ทุก Template
  // เช่น /api/download-template/users
  router.get("/api/download-template/:type", (req, res) => {
    templateController.downloadTemplate(req, res, databaseConnection);
  });

  return router;
};
