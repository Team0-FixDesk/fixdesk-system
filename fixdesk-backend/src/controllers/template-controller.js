/**
 * =====================================================================
 * @file            template-controller.js
 * @layer           Application Layer (Controller)
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
 *  Controller สำหรับจัดการการดาวน์โหลดไฟล์ Template Excel
 *  ทำหน้าที่:
 *  - รับคำขอจาก Route ที่เกี่ยวข้องกับการดาวน์โหลด Template
 *  - ประสานงานกับ Service Layer เพื่อสร้างไฟล์ Excel ตามประเภทที่ร้องขอ
 *  - ส่งไฟล์ Excel กลับไปยัง Client พร้อม Header ที่เหมาะสม
 *  - รองรับการดาวน์โหลด Template สำหรับ Users, Locations และ Stocks
 *  - โครงสร้างเป็นแบบ Layered Architecture
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  [2026-03-21, พชร ไพศรีสกุล] V 1.0.0
 *  - เพิ่มฟังก์ชัน downloadTemplate รองรับการดาวน์โหลด Template Excel
 *  - Initial implementation Template Download Controller
 *
 * =====================================================================
 */

const templateService = require("../services/template-service");

exports.downloadTemplate = async (req, res, db) => {
  try {
    const type = req.params.type; // รับค่า type มาจาก URL (เช่น users, stocks)
    let workbook;
    let filename = "Template.xlsx";

    // แยกเคสตามประเภทที่ขอมา
    if (type === "users") {
      workbook = await templateService.generateUserTemplate(db);
      filename = "TemplateExcelUsers.xlsx";
    } else if (type === "locations") {
      workbook = await templateService.generateLocationTemplate(db);
      filename = "TemplateExcelLocation.xlsx";
    } else if (type === "stocks") {
      workbook = await templateService.generateStockTemplate(db);
      filename = "TemplateExcelStock.xlsx";
    }
    // อนาคตถ้ามีของคลังสินค้า ก็มาเพิ่ม else if (type === "stocks") ตรงนี้
    else {
      return res.status(404).json({ message: "ไม่พบ Template ที่ต้องการ" });
    }

    // กำหนด Header สำหรับไฟล์ Excel
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // เขียนไฟล์และส่งกลับไปที่ Client
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(`Error generating ${req.params.type} template:`, error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการสร้างไฟล์ Template" });
  }
};
