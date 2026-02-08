export function getUserStatusBadge(status) {
  switch (status) {
    case 'pending':
      return `<span class="inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full bg-amber-50 text-amber-500 font-semibold text-xs sm:text-sm">รอดำเนินการ</span>`

    case 'in_progress':
      return `<span class="inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full bg-blue-100 text-blue-600 font-semibold text-xs sm:text-sm">กำลังดำเนินการ</span>`

    case 'outsource':
      return `<span class="inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full bg-purple-100 text-purple-600 font-semibold text-xs sm:text-sm">จ้างช่างภายนอก</span>`

    case 'done':
      return `<span class="inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full bg-green-100 text-green-600 font-semibold text-xs sm:text-sm">ดำเนินการเสร็จสิ้น</span>`

    default:
      return `<span class="inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full bg-gray-100 text-gray-500 font-semibold text-xs sm:text-sm">ยกเลิก</span>`
  }
}

export function getUrgencyBadge(urgency) {
  switch (urgency) {
    case 'high':
      return `<span class="inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full bg-red-100 text-red-600 font-semibold text-xs sm:text-sm">เร่งด่วนมาก</span>`

    case 'medium':
      return `<span class="inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full bg-amber-50 text-amber-500 font-semibold text-xs sm:text-sm">เร่งด่วน</span>`

    case 'low':
      return `<span class="inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full bg-green-100 text-green-600 font-semibold text-xs sm:text-sm">ไม่เร่งด่วน</span>`

    default:
      return `<span class="inline-flex justify-center items-center px-4 py-1.5 rounded-full bg-gray-100 text-gray-500 font-medium text-xs sm:text-sm">-</span>`
  }
}
