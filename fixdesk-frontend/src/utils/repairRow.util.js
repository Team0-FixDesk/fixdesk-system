/**
 * =====================================================================
 * @file            repairRow.util.js
 * @layer           Utility (Presentation Support Layer)
 * @version         1.1.0
 * @since           2026-02-08
 * @author          พชร ไพศรีสกุล
 * @lastModified    2026-03-06
 * @lastModifiedBy  นราธิป แสนทวีสุข
 * ---------------------------------------------------------------------
 * @description
 *  Utility สำหรับสร้างข้อความรายละเอียดการแจ้งซ่อมในรูปแบบ HTML
 *   - จัดรูปแบบวันที่แจ้งซ่อมด้วย formatThaiShortDate
 *   - แสดงประเภทงานซ่อม (tt_name)
 *   - แสดงเรื่องที่แจ้ง (rf_problem) พร้อมตัดข้อความให้สั้นลง
 *   - รวมข้อมูลสถานที่ (ตึก / ชั้น / ห้อง) เป็นข้อความเดียว
 *   - กำหนดค่าเริ่มต้นเป็น "-" หากไม่มีข้อมูล
 *   - คืนค่าเป็น String พร้อมแท็ก <br> สำหรับแสดงผลบนหน้าเว็บ
 *
 * @requires
 *   - @/utils/date.util (formatThaiShortDate)
 *   - @/composables/useTruncateText (useTruncateText)
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - เพิ่มการแสดงประเภทงานซ่อมและเรื่องที่แจ้ง [2026-03-06, นราธิป แสนทวีสุข]
 *   - แก้ไขการใช้สัญลักษณ์ : ในตาราง         [2026-02-21, ปฏิพัทธ์ จงนันทพันธ์กุล]
 * =====================================================================
 */

import { formatThaiShortDate } from '@/utils/date.util'
import { useTruncateText } from '@/composables/useTruncateText'

// สร้าง instance ของ truncate function
const { truncateSentences } = useTruncateText()

// ฟังก์ชันสร้างข้อความรายละเอียดการแจ้งซ่อม (สำหรับแสดงผลหน้าเว็บ)
export function createRepairDescriptionHtml(repairRequestItem) {
  // 1. จัดรูปแบบวันที่แจ้ง
  const formattedDate = formatThaiShortDate(repairRequestItem.rf_create_at)

  // 2. ประเภทงานซ่อม
  const repairType = repairRequestItem.tt_name || '-'

  // 3. เรื่องที่แจ้ง (ตัดให้สั้นลง)
  const problemText = repairRequestItem.rf_problem
    ? truncateSentences(repairRequestItem.rf_problem)
    : '-'

  // 4. สถานที่ (ตึก + ชั้น + ห้อง)
  const fullLocationText = repairRequestItem.bd_name
    ? `${repairRequestItem.bd_name} ${repairRequestItem.fl_name} ${repairRequestItem.room_name}`
    : '-'

  // 5. สร้างข้อความ HTML ที่จะแสดงผล
  return `วันที่แจ้ง : ${formattedDate}<br>ประเภทงานซ่อม : ${repairType}<br>เรื่องที่แจ้ง : ${problemText}<br>สถานที่ : ${fullLocationText}`
}
