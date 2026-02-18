/**
 * =====================================================================
 * @file            repairStatus.util.js
 * @layer           Utility (Shared Logic Layer)
 * @version         1.0.0
 * @since           2026-02-08
 * @author          พชร ไพศรีสกุล
 * @lastModified    2026-02-17
 * @lastModifiedBy  ปฏิพัทธ์ จงนันทพันธ์กุล
 * ---------------------------------------------------------------------
 * @description
 *  ชุดฟังก์ชันและค่าคงที่สำหรับจัดการข้อมูลสถานะงานซ่อม
 *  ใช้สำหรับ:
 *    - แปลงรหัสสถานะเป็นข้อความภาษาไทย
 *    - กำหนดสีของสถานะ (CSS Class)
 *    - คืนค่าสีของลำดับความคืบหน้า (Progress Step)
 *    - แปลงระดับความเร่งด่วน
 *    - แปลงสถานะของ Stock
 *
 * @usedBy
 *  - home.view.vue
 *  - repairDetail.view.vue
 *  - repairList.view.vue
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  - ปรับปรุงฟังก์ชันคืนค่าสีของลำดับความคืบหน้า (getProgressBarColor)  [2026-02-17, ปฏิพัทธ์ จงนันทพันธ์กุล]
 * =====================================================================
 */

// เก็บข้อความภาษาไทยของสถานะการซ่อม (รวมทุกสถานะไว้ที่เดียว)
const REPAIR_STATUS_LABELS = {
  pending: 'รอดำเนินการ',
  in_progress: 'กำลังดำเนินการ',
  done: 'ดำเนินการเสร็จสิ้น',
  cancel: 'ยกเลิก',
}

// เก็บสี (CSS Class) ของแต่ละสถานะ
const REPAIR_STATUS_COLORS = {
  pending: 'bg-blue-200 text-blue-600',
  in_progress: 'bg-amber-100 text-amber-600',
  done: 'bg-green-100 text-green-600',
  cancel: 'bg-gray-100 text-gray-600', // เพิ่มสีสำหรับยกเลิกให้ครบ
}

// เก็บข้อมูลลำดับขั้นตอน (Step) เพื่อใช้ทำ Progress Bar
const REPAIR_STEP_NUMBERS = {
  pending: 1,
  in_progress: 2,
  done: 3,
  cancel: 0, // ยกเลิกไม่มีลำดับ
}

// เก็บข้อความระดับความเร่งด่วน
const URGENCY_LABELS = {
  high: 'เร่งด่วนมาก',
  medium: 'เร่งด่วน',
  low: 'ไม่เร่งด่วน',
}

// เก็บข้อความสถานะสต็อกสินค้า
const STOCK_STATUS_LABELS = {
  waiting: 'รอดำเนินการ',
  approved: 'อนุมัติ',
  rejected: 'ปฏิเสธ',
  completed: 'เสร็จสิ้น',
}

// 1. ฟังก์ชันแปลง "รหัสสถานะ" เป็น "ข้อความภาษาไทย"
export function getRepairStatusLabel(statusKey) {
  // ไปค้นหาในพจนานุกรม REPAIR_STATUS_LABELS
  // ถ้าไม่เจอ ให้คืนค่าว่า 'รอดำเนินการ' (ค่าเริ่มต้น)
  return REPAIR_STATUS_LABELS[statusKey] || 'รอดำเนินการ'
}

// 2. ฟังก์ชันดึง "สีป้าย" ตามสถานะ
export function getRepairStatusColorClass(statusKey) {
  // ค้นหาสี ถ้าไม่เจอให้คืนค่าว่าง
  return REPAIR_STATUS_COLORS[statusKey] || ''
}

// 3. ฟังก์ชันแปลงสถานะเป็น "ตัวเลขลำดับ" (ใช้กับ Progress Bar)
export function getRepairStepNumber(statusKey) {
  // ถ้าไม่เจอสถานะนี้ ให้ถือว่าเป็นขั้นตอนที่ 1
  return REPAIR_STEP_NUMBERS[statusKey] || 1
}

/**
 * 4. ฟังก์ชันคืนค่าสีของลำดับความคืบหน้า (getProgressBarColor) 
 * @description
 *  ตรวจสอบว่าขั้นตอนปัจจุบัน ถึงเป้าหมายหรือยัง โดยคืนค่า class สีของลำดับความคืบหน้า (Progress Step) ตามสถานะปัจจุบัน
 * 
 * @author
 *  พชร ไพศรีสกุล
 * 
 * @changelog
 *  - แก้ไขเงื่อนไขการคืนค่าสี text-slate   [2026-02-17, ปฏิพัทธ์ จงนันทพันธ์กุล]
 *  
 * @param {string} statusKey - สถานะของงานซ่อม (เช่น 'pending', 'in_progress', 'done')
 * @param {number} stepTarget - ลำดับของความคืบหน้า (1-3)
 * @returns {string} Tailwind CSS class สำหรับกำหนดสีของลำดับความคืบหน้า
 */
export function getProgressBarColor(statusKey, stepTarget) {
  // แปลงสถานะ (String) ให้เป็นตัวเลข (Number) ก่อน
  // โดยใช้ REPAIR_STEP_NUMBERS ที่เราประกาศไว้ข้างบน
  const currentStepNumber = REPAIR_STEP_NUMBERS[statusKey] || 0

  // ถ้าขั้นตอนปัจจุบัน น้อยกว่า ขั้นตอนเป้าหมาย -> สีเทา (ยังไม่ถึง)
  if (currentStepNumber < stepTarget) {
    return 'text-slate-300'
  }

  // ถ้าถึงแล้ว หรือเลยไปแล้ว -> สีเขียว
  return 'text-green-600 font-bold' // เพิ่มตัวหนาให้ดูชัดเจนขึ้น
}

// 5. ฟังก์ชันแปลง "ระดับความเร่งด่วน" เป็นภาษาไทย
export function getUrgencyLabel(urgencyLevel) {
  return URGENCY_LABELS[urgencyLevel] || 'เร่งด่วน'
}

// 6. ฟังก์ชันแปลง "สถานะสต็อก" เป็นภาษาไทย
export function getStockStatusLabel(stockStatusKey) {
  return STOCK_STATUS_LABELS[stockStatusKey] || '-'
}
