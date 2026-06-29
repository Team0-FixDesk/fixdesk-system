const BADGE_BASE_STYLE_CLASS = 'inline-flex items-center justify-center h-8 font-medium rounded-full w-28'

// ฟังก์ชันสร้าง HTML สำหรับแสดงป้าย (Badge)
export function createBadgeHtml(labelText, badgeCategory) {
  // กำหนดสีเริ่มต้นเป็น "สีเทา" ไว้ก่อน (กันพลาดกรณีไม่ตรงเงื่อนไขไหนเลย)
  let badgeColorClass = 'bg-gray-100 text-gray-600'

  // 1. ตรวจสอบว่าเป็นป้ายหมวด "ความเร่งด่วน" หรือไม่?
  if (badgeCategory === 'urgency') {
    if (labelText === 'เร่งด่วนมาก') {
      badgeColorClass = 'bg-red-100 text-red-700'     // แดงเข้ม
    } else if (labelText === 'เร่งด่วน') {
      badgeColorClass = 'bg-amber-100 text-amber-700' // ส้ม
    } else {
      badgeColorClass = 'bg-green-100 text-green-700' // เขียว (ปกติ)
    }

  // 2. ตรวจสอบว่าเป็นป้ายหมวด "สถานะ" หรือไม่?
  } else if (badgeCategory === 'status') {
    // ใช้ switch เช็คข้อความ (เขียนแบบนี้จะดูง่ายกว่า if-else ยาวๆ)
    switch (labelText) {
      case 'รอดำเนินการ':
      case 'waiting':
        badgeColorClass = 'bg-amber-100 text-amber-700' // ส้ม
        break

      case 'กำลังดำเนินการ':
        badgeColorClass = 'bg-blue-100 text-blue-700'  // ฟ้า
        break

      case 'เสร็จสิ้น':
      case 'อนุมัติ':
        badgeColorClass = 'bg-green-100 text-green-700' // เขียว
        break

      case 'ยกเลิก':
      case 'ปฏิเสธ':
        badgeColorClass = 'bg-red-100 text-red-700'    // แดง
        break
    }
  }

  // ประกอบร่าง HTML: เอา "ทรงป้าย" + "สีที่เลือกได้" + "ข้อความ" มารวมกัน
  return `
    <span class="${BADGE_BASE_STYLE_CLASS} ${badgeColorClass}">
      ${labelText}
    </span>
  `
}
