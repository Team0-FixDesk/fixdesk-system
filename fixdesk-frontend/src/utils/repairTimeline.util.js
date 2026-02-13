import { formatThaiDateTime } from './date.util'

// เพื่อให้ดูแลรักษาง่าย (ถ้าจะแก้คำพูด ก็แก้ที่นี่จบ)
const TIMELINE_STEPS_CONFIG = [
  {
    dataKey: 'rf_create_at', // ชื่อ Key ใน Database
    title: 'รอดำเนินการ',
    description: 'ระบบได้รับใบแจ้งซ่อมของคุณแล้ว',
  },
  {
    dataKey: 'rf_in_process_at',
    title: 'กำลังดำเนินการ',
    description: 'เจ้าหน้าที่กำลังดำเนินการซ่อมแซม',
  },
  {
    dataKey: 'rf_done_at',
    title: 'ดำเนินการเสร็จสิ้น',
    description: 'งานซ่อมเสร็จเรียบร้อยแล้ว',
  },
]

// ฟังก์ชันสร้างข้อมูล Timeline จากใบแจ้งซ่อม
export function createRepairTimelineData(repairRequestData) {
  // 1. หาว่าตอนนี้ "เดินเรื่อง" ไปถึงขั้นตอนไหนแล้ว?
  // (วนลูปเช็คว่ามีวันที่ในขั้นตอนนั้นๆ หรือไม่ ถ้ามีให้จำลำดับไว้)
  let currentStepIndex = -1

  TIMELINE_STEPS_CONFIG.forEach((step, index) => {
    if (repairRequestData[step.dataKey]) {
      currentStepIndex = index
    }
  })

  // 2. สร้างรายการ Timeline เพื่อส่งกลับไปแสดงผล
  const formattedTimelineList = TIMELINE_STEPS_CONFIG.map((step, index) => {
    // ตรวจสอบเงื่อนไขของแต่ละขั้นตอน
    const isStepReached = index <= currentStepIndex // ถึงขั้นตอนนี้หรือยัง?
    const isCurrentStep = index === currentStepIndex // คือขั้นตอนปัจจุบันใช่ไหม?
    const isFinalStep = index === TIMELINE_STEPS_CONFIG.length - 1 // คือขั้นตอนสุดท้ายใช่ไหม?

    // กำหนดสถานะของขั้นตอน (stepState) เพื่อนำไปเลือกสีปุ่ม/ไอคอน
    let displayState = 'upcoming' // ค่าเริ่มต้น: ยังมาไม่ถึง (สีเทา)

    if (isStepReached) {
      if (isFinalStep) {
        displayState = 'completed' // ถ้าเป็นขั้นตอนสุดท้ายและถึงแล้ว = เสร็จสมบูรณ์ (สีเขียว)
      } else if (isCurrentStep) {
        displayState = 'current' // ถ้าเป็นขั้นตอนปัจจุบัน = กำลังทำ (สีส้ม/ฟ้า)
      } else {
        displayState = 'completed' // ถ้าเป็นขั้นตอนที่ผ่านมาแล้ว = เสร็จแล้ว (สีเขียว)
      }
    }

    return {
      title: step.title,
      // แสดงคำอธิบายเฉพาะขั้นตอนที่ "มาถึงแล้ว" เท่านั้น
      description: isStepReached ? step.description : null,
      // แปลงวันที่เป็นรูปแบบไทย (ถ้ามีข้อมูล)
      displayTime: repairRequestData[step.dataKey] ? formatThaiDateTime(repairRequestData[step.dataKey]) : null,
      stepState: displayState,
    }
  })

  return formattedTimelineList
}
