export function getBadgeHtml(text, type) {
  let colorClass = 'bg-gray-100 text-gray-600'

  if (type === 'urgency') {
    if (text === 'เร่งด่วนมาก') colorClass = 'bg-red-100 text-red-700'
    else if (text === 'เร่งด่วน') colorClass = 'bg-amber-100 text-amber-700'
    else colorClass = 'bg-green-100 text-green-700'
  }

  if (type === 'status') {
    if (text === 'รอดำเนินการ' || text === 'waiting') colorClass = 'bg-amber-100 text-amber-700'
    else if (text === 'กำลังดำเนินการ') colorClass = 'bg-blue-100 text-blue-700'
    else if (text === 'เสร็จสิ้น' || text === 'อนุมัติ') colorClass = 'bg-green-100 text-green-700'
    else if (text === 'ยกเลิก' || text === 'ปฏิเสธ') colorClass = 'bg-red-100 text-red-700'
  }

  return `
    <span class="inline-flex items-center justify-center h-8 font-medium rounded-full w-28 ${colorClass}">
      ${text}
    </span>
  `
}
