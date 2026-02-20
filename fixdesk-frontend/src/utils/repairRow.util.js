/**
 * =====================================================================
 * @file            repairRow.util.js
 * @layer           Utility (Presentation Support Layer)
 * @version         1.0.0
 * @since           2026-02-08
 * @author          พชร ไพศรีสกุล
 * @lastModified    2026-02-21
 * @lastModifiedBy  ปฏิพัทธ์ จงนันทพันธ์กุล
 * ---------------------------------------------------------------------
 * @description
 *  Utility สำหรับสร้างข้อความรายละเอียดการแจ้งซ่อมในรูปแบบ HTML
 *   - จัดรูปแบบวันที่แจ้งซ่อมด้วย formatThaiShortDate
 *   - รวมข้อมูลสถานที่ (ตึก / ชั้น / ห้อง) เป็นข้อความเดียว
 *   - กำหนดค่าเริ่มต้นเป็น "-" หากไม่มีข้อมูลสถานที่
 *   - คืนค่าเป็น String พร้อมแท็ก <br> สำหรับแสดงผลบนหน้าเว็บ
 *
 * @requires
 *   - @/utils/date.util (formatThaiShortDate)
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - แก้ไขการใช้สัญลักษณ์ : ในตาราง  [2026-02-21, ปฏิพัทธ์ จงนันทพันธ์กุล]
 * =====================================================================
 */

import { formatThaiShortDate } from '@/utils/date.util'

// ฟังก์ชันสร้างข้อความรายละเอียดการแจ้งซ่อม (สำหรับแสดงผลหน้าเว็บ)
export function createRepairDescriptionHtml(repairRequestItem) {
  // 1. ตรวจสอบและเตรียมข้อมูลสถานที่:
  // ถ้ามีข้อมูลตึก (bd_name) ให้เอา "ชื่อตึก + ชั้น + ห้อง" มาต่อกัน
  // แต่ถ้าไม่มีข้อมูล (เป็นค่าว่าง) ให้ใส่เครื่องหมายขีด (-) แทน
  const fullLocationText = repairRequestItem.bd_name ? `${repairRequestItem.bd_name} ${repairRequestItem.fl_name} ${repairRequestItem.room_name}` : '-'

  // 2. จัดรูปแบบข้อความเพื่อส่งกลับไปแสดงผล:
  // เอา "วันที่แจ้ง" มาต่อกับ "สถานที่" โดยคั่นบรรทัดด้วย <br>
  // (ใช้ Backticks `...` ช่วยให้ใส่ตัวแปรลงในข้อความได้เลย ไม่ต้องใช้เครื่องหมาย + เชื่อม)
  return `วันที่แจ้ง : ${formatThaiShortDate(repairRequestItem.rf_create_at)}<br>สถานที่ : ${fullLocationText}`
}
