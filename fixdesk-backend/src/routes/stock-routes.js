/**
 * =====================================================================
 * @file            stock.route.js
 * @layer           Route Layer (Routing Layer)
 * @version         1.2.0
 * @since           2026-02-10
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *   - นราธิป แสนทวีสุข
 *
 * @lastModified    2026-02-17
 * @lastModifiedBy  พชร ไพศรีสกุล
 * ---------------------------------------------------------------------
 * @description
 *  Route สำหรับจัดการระบบคลังวัสดุ/อุปกรณ์ (Stock Management)
 *  ทำหน้าที่กำหนด endpoint และเชื่อมต่อ Stock Controller กับ Service
 *
 *  รองรับการทำงาน:
 *    - จัดการสินค้า (Products)
 *    - จัดการหมวดหมู่ (Categories)
 *    - แสดงหน่วยนับสินค้า (Units)
 *    - จัดการใบเบิกสินค้า (Stock Forms)
 *    - เบิกสินค้า (Withdraw)
 *    - อนุมัติ/ปฏิเสธสินค้า
 *    - คืนสินค้า (Return Item)
 *    - Import ข้อมูลสินค้า
 *    - Upload รูปภาพสินค้า
 *
 *  ใช้ multer สำหรับ upload รูปภาพสินค้า
 *  และ authMiddleware สำหรับ endpoint ที่ต้องมีการยืนยันตัวตน
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - Initial implementation Repair Controller ตาม Layered Architecture
 *     [2026-02-10, พชร ไพศรีสกุล] V 1.0.0
 *   - Allow approving and rejecting items in same requisition
 *     [2026-02-14, นราธิป แสนทวีสุข] V 1.1.0
 *   - เพิ่มระบบการคืนอุปกรณ์
 *     [2026-02-17, พชร ไพศรีสกุล] V 1.2.0
 *
 * =====================================================================
 */

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authMiddleware = require("../middlewares/auth-middleware");

// --- MULTER CONFIGURATION (PRODUCT IMAGE UPLOAD) ---
/**
 * กำหนด Path สำหรับจัดเก็บรูปภาพสินค้า
 * ตรวจสอบว่า uploads directory มีอยู่หรือไม่
 * หากไม่มี จะสร้างให้อัตโนมัติ
 * @author นราธิป แสนทวีสุข
 * @since 2026-02-10
 */
const uploadDir = path.join(__dirname, "../../uploads"); // Path ออกไปที่ root/uploads
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * กำหนดรูปแบบการจัดเก็บไฟล์ด้วย multer.diskStorage
 * ตั้งค่า:
 *  - destination: uploads directory
 *  - filename: unique filename เพื่อป้องกันชื่อซ้ำ
 * @author นราธิป แสนทวีสุข
 * @since 2026-02-10
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

/**
 * สร้าง multer instance สำหรับ upload รูปภาพสินค้า
 * ใช้ใน addProduct และ updateProduct routes
 */
const upload = multer({ storage: storage });

/**
 * กำหนดเส้นทาง (Routes) สำหรับ Stock Module
 * เชื่อมต่อ Stock Service และ Controller
 *
 * @param {Object} db
 * @returns {import("express").Router}
 */
module.exports = (db) => {
  const router = express.Router();
  const stockService = require("../services/stock-service")(db);
  const stockController = require("../controllers/stock-controller")(
    stockService,
  );

  // --- PRODUCT ROUTES ---
  /**
   * GET /show-stock
   * ดึงรายการสินค้าทั้งหมด
   * @route GET /show-stock
   * @middleware authMiddleware
   */
  router.get("/show-stock", authMiddleware, stockController.getAllProducts);

  /**
   * POST /add-stock
   * เพิ่มสินค้าใหม่ พร้อม upload รูปภาพ
   * @route POST /add-stock
   * @middleware authMiddleware
   */
  router.post(
    "/add-stock",
    authMiddleware,
    upload.single("pd_upload_image"),
    stockController.addProduct,
  );

  /**
   * PUT /update-stock/:id
   * แก้ไขข้อมูลสินค้า
   * @route PUT /update-stock/:id
   * @middleware authMiddleware
   */
  router.put(
    "/update-stock/:id",
    authMiddleware,
    upload.single("pd_upload_image"),
    stockController.updateProduct,
  );

  /**
   * DELETE /delete-stock/:id
   * ลบสินค้า
   * @route DELETE /delete-stock/:id
   * @middleware authMiddleware
   */
  router.delete(
    "/delete-stock/:id",
    authMiddleware,
    stockController.deleteProduct,
  );

  // --- CATEGORY ROUTES ---
  /**
   * GET /category
   * ดึงรายการหมวดหมู่สินค้า
   * @route GET /category
   */
  router.get("/category", stockController.getCategories);

  /**
   * POST /category
   * เพิ่มหมวดหมู่สินค้า
   * @route POST /category
   * @middleware authMiddleware
   */
  router.post("/category", authMiddleware, stockController.addCategory);

  /**
   * PUT /category/:id
   * แก้ไขหมวดหมู่สินค้า
   * @route PUT /category/:id
   * @middleware authMiddleware
   */
  router.put("/category/:id", authMiddleware, stockController.updateCategory);

  /**
   * DELETE /category/:id
   * ลบหมวดหมู่สินค้า
   * @route DELETE /category/:id
   * @middleware authMiddleware
   */
  router.delete(
    "/category/:id",
    authMiddleware,
    stockController.deleteCategory,
  );

  // --- UNIT ROUTES ---
  /**
   * GET /units
   * ดึงรายการหน่วยนับสินค้า
   * @route GET /units
   */
  router.get("/units", stockController.getUnits);

  // --- STOCK FORM ROUTES ---
  /**
   * GET /stock-forms
   * ดึงรายการใบเบิกทั้งหมด
   * @route GET /stock-forms
   * @middleware authMiddleware
   */
  router.get("/stock-forms", authMiddleware, stockController.getAllStockForms);

  /**
   * GET /stock-forms/:id
   * ดึงรายการใบเบิกของผู้ใช้งาน
   * @route GET /stock-forms/:id
   * @middleware authMiddleware
   */
  router.get(
    "/stock-forms/:id",
    authMiddleware,
    stockController.getUserStockForms,
  );

  /**
   * GET /stock-forms/detail/:sf_code
   * ดึงรายละเอียดใบเบิก
   * @route GET /stock-forms/detail/:sf_code
   * @middleware authMiddleware
   */
  router.get(
    "/stock-forms/detail/:sf_code",
    authMiddleware,
    stockController.getStockFormDetail,
  );

  /**
   * POST /withdraw
   * สร้างใบเบิกสินค้า
   * @route POST /withdraw
   * @middleware authMiddleware
   */
  router.post("/withdraw", authMiddleware, stockController.withdraw);

  /**
   * PUT /stock-forms/update-status
   * อัปเดตสถานะใบเบิก
   * @route PUT /stock-forms/update-status
   * @middleware authMiddleware
   */
  router.put(
    "/stock-forms/update-status",
    authMiddleware,
    stockController.updateFormStatus,
  );

  /**
   * PUT /stock-forms/detail/update-item-status
   * อัปเดตสถานะสินค้าในใบเบิก
   * @route PUT /stock-forms/detail/update-item-status
   * @middleware authMiddleware
   */
  router.put(
    "/stock-forms/detail/update-item-status",
    authMiddleware,
    stockController.updateItemStatus,
  );

  /**
   * PUT /stock-forms/detail/update-items-status-batch
   * อัปเดตสถานะสินค้าแบบ batch
   * @route PUT /stock-forms/detail/update-items-status-batch
   * @middleware authMiddleware
   */
  router.put(
    "/stock-forms/detail/update-items-status-batch",
    authMiddleware,
    stockController.updateMultipleItemsStatus,
  );

  // --- IMPORT ROUTES ---
  /**
   * POST /stock/import
   * Import ข้อมูลสินค้า
   * @route POST /stock/import
   * @middleware authMiddleware
   */
  router.post("/stock/import", authMiddleware, stockController.importStock);

  // --- RETURN ROUTES ---
  /**
   * PUT /stock-forms/return-item
   * คืนสินค้าเข้าสู่ระบบ
   * @route PUT /stock-forms/return-item
   * @middleware authMiddleware
   */
  router.put(
    "/stock-forms/return-item",
    authMiddleware,
    stockController.returnItem,
  );

  return router;
};
