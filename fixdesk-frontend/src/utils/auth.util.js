/**
 * =====================================================================
 * @file            utils/auth.util.js
 * @layer           Utils
 * @version         1.0.0
 * @since           2026-03-16 ยังไม่แน่ใจว่าใช้วันไหนเป็นวันแรกของการสร้างไฟล์นี้
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *
 * @lastModified    2026-03-16
 * @lastModifiedBy  พชร ไพศรีสกุล
 * ---------------------------------------------------------------------
 * @description
 *  Authentication Utilities for the Application
 *
 *  ทำหน้าที่:
 *    - ตรวจสอบสถานะการเข้าสู่ระบบ
 *    - จัดการ token สำหรับการยืนยันตัวตน
 *    - ตรวจสอบสิทธิ์การเข้าถึงตามบทบาทผู้ใช้
 *
 * @usedBy
 *  - router/index.js (สำหรับการกำหนดเส้นทางและการตรวจสอบสิทธิ์การเข้าถึง)
 *
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  [2026-03-16, พชร ไพศรีสกุล] V 1.0.0  วันที่ยังไม่แน่ใจว่าใช้วันไหนเป็นวันแรกของการสร้างไฟล์นี้
 *   - สร้างไฟล์ใหม่สำหรับการตั้งค่าเส้นทางของระบบ
 *  [2026-03-16, พชร ไพศรีสกุล] V 1.0.1
 *  - เพิ่ม roleRouteMapping สำหรับ Technician Lead ในฟังก์ชัน getRoutePathByUserRole
 *
 * =====================================================================
 */

// ฟังก์ชันสำหรับหาว่า User ตำแหน่งนี้ ต้องเด้งไปที่หน้าไหน
export function getRoutePathByUserRole(userRoleName) {
  // สร้างรายการจับคู่ไว้ว่า "ตำแหน่งไหน" คู่กับ "หน้าไหน"
  const roleRouteMapping = {
    Admin: '/main/admin-home',
    Technician: '/main/technician-home',
    TechnicianLead: '/main/technicianlead-home',
    Stock: '/main/stock-home',
    Manager: '/main/dashboard',
  }

  // ถ้าเจอชื่อตำแหน่งในรายการ ให้ส่งลิ้งค์หน้านั้นกลับไป
  // แต่ถ้าหาไม่เจอ (หรือเป็น User ทั่วไป) ให้ส่งไปหน้า "user-home" แทน
  return roleRouteMapping[userRoleName] || '/main/user-home'
}
