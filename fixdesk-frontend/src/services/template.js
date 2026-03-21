/**
 * =====================================================================
 * @file            template.js
 * @layer           Application Layer (Service)
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
 *  Service สำหรับจัดการการดาวน์โหลดไฟล์ Template Excel
 *  ทำหน้าที่:
 *  - ประสานงานกับ Database เพื่อดึงข้อมูลที่จำเป็นสำหรับสร้าง Template
 *  - ใช้ไลบรารี ExcelJS ในการสร้างไฟล์ Excel ตามโครงสร้างที่กำหนด
 *  - รองรับการสร้าง Template สำหรับ Users, Locations และ Stocks
 *  - โครงสร้างเป็นแบบ Layered Architecture
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  [2026-03-21, พชร ไพศรีสกุล] V 1.0.0
 *  - เพิ่มฟังก์ชัน generateUserTemplate, generateLocationTemplate และ generateStockTemplate
 *  - Initial implementation Template Excel Generation Service
 *
 * =====================================================================
*/

const API_BASE_URL = import.meta.env.VITE_API_BASE

export const templateService = {
  downloadTemplate: async (templateType) => {
    // 1. ตั้งค่า Path ปลายทาง (มี /api นำหน้า ตามที่เราตั้งไว้ใน backend)
    // templateType ที่รับมาจะเป็นคำว่า 'users' อัตโนมัติ
    const endpoint = `/api/download-template/${templateType}`

    // 2. ยิง Request ไปที่ Backend (เอา Base URL มาต่อด้วย Path)
    // ผลลัพธ์: http://localhost:3000/api/download-template/users
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error('ไม่สามารถดาวน์โหลดไฟล์ Template ได้')
    }

    // 3. คืนค่าไฟล์กลับไปให้หน้าเว็บ
    return await response.blob()
  },
}
