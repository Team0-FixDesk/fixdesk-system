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

// 4. ฟังก์ชันคำนวณสีของ Progress Bar
// (เช็คว่าขั้นตอนปัจจุบัน ถึงเป้าหมายหรือยัง)
export function getProgressBarColor(currentStep, stepTarget) {
  // ถ้าขั้นตอนปัจจุบัน (Current) น้อยกว่าเป้าหมาย (Target) แปลว่า "ยังทำไม่ถึง" -> สีเทา
  if (currentStep < stepTarget) {
    return 'text-slate-400'
  }

  // ถ้าถึงแล้ว หรือเลยไปแล้ว -> สีเขียว
  return 'text-green-600'
}

// 5. ฟังก์ชันแปลง "ระดับความเร่งด่วน" เป็นภาษาไทย
export function getUrgencyLabel(urgencyLevel) {
  return URGENCY_LABELS[urgencyLevel] || 'เร่งด่วน'
}

// 6. ฟังก์ชันแปลง "สถานะสต็อก" เป็นภาษาไทย
export function getStockStatusLabel(stockStatusKey) {
  return STOCK_STATUS_LABELS[stockStatusKey] || '-'
}
