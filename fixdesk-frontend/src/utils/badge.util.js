const BADGE_BASE_CLASS = 'inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full font-semibold text-xs sm:text-sm'

// ฟังก์ชันสร้างป้ายสถานะการซ่อม
export function getRepairStatusBadge(repairStatus) {
  let badgeColorClass = ''
  let badgeLabel = ''

  // ตรวจสอบสถานะ เพื่อเลือกสีและข้อความภาษาไทย
  switch (repairStatus) {
    case 'pending':
      badgeColorClass = 'bg-amber-50 text-amber-500'
      badgeLabel = 'รอดำเนินการ'
      break // จบเคสนี้

    case 'in_progress':
      badgeColorClass = 'bg-blue-100 text-blue-600'
      badgeLabel = 'กำลังดำเนินการ'
      break

    case 'outsource':
      badgeColorClass = 'bg-purple-100 text-purple-600'
      badgeLabel = 'จ้างช่างภายนอก'
      break

    case 'done':
      badgeColorClass = 'bg-green-100 text-green-600'
      badgeLabel = 'ดำเนินการเสร็จสิ้น'
      break

    default:
      // กรณีสถานะไม่ตรงกับข้างบนเลย หรือถูกยกเลิก
      badgeColorClass = 'bg-gray-100 text-gray-500'
      badgeLabel = 'ยกเลิก'
  }

  // [Standard] นำสีและข้อความที่เลือกได้ มาประกอบเป็น HTML แล้วส่งกลับทีเดียว
  return `<span class="${BADGE_BASE_CLASS} ${badgeColorClass}">${badgeLabel}</span>`
}

// ฟังก์ชันสร้างป้ายความเร่งด่วน
export function getUrgencyLevelBadge(urgencyLevel) {
  let badgeColorClass = ''
  let badgeLabel = ''

  // ตรวจสอบระดับความเร่งด่วน
  switch (urgencyLevel) {
    case 'high':
      badgeColorClass = 'bg-red-100 text-red-600'
      badgeLabel = 'เร่งด่วนมาก'
      break

    case 'medium':
      badgeColorClass = 'bg-amber-50 text-amber-500'
      badgeLabel = 'เร่งด่วน'
      break

    case 'low':
      badgeColorClass = 'bg-green-100 text-green-600'
      badgeLabel = 'ไม่เร่งด่วน'
      break

    default:
      // กรณีไม่มีข้อมูลความเร่งด่วน
      // (หมายเหตุ: เคสนี้มีขนาด Padding ต่างจากเพื่อนเล็กน้อย จึงเขียนแยก Style)
      return `<span class="inline-flex justify-center items-center px-4 py-1.5 rounded-full bg-gray-100 text-gray-500 font-medium text-xs sm:text-sm">-</span>`
  }

  // ส่ง HTML กลับไป
  return `<span class="${BADGE_BASE_CLASS} ${badgeColorClass}">${badgeLabel}</span>`
}
