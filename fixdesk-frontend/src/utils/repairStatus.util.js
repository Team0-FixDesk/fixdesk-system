export const STATUS_TEXT_MAP = {
  pending: 'รอดำเนินการ',
  in_progress: 'กำลังดำเนินการ',
  done: 'ดำเนินการเสร็จสิ้น',
}

export const STATUS_BADGE_MAP = {
  pending: 'bg-blue-200 text-blue-600',
  in_progress: 'bg-amber-100 text-amber-600',
  done: 'bg-green-100 text-green-600',
}

export const STATUS_STEP_MAP = {
  pending: 1,
  in_progress: 2,
  done: 3,
}

export const getStatusText = (status) => STATUS_TEXT_MAP[status] || 'ไม่ทราบสถานะ'

export const getStatusBadgeClass = (status) => STATUS_BADGE_MAP[status]

export const convertStatusToStep = (status) => STATUS_STEP_MAP[status] || 1

export const getStepColor = (currentStep, targetStep) =>
  currentStep < targetStep ? 'text-slate-400' : 'text-green-600'

export const mapUrgency = (u) =>
  ({ high: 'เร่งด่วนมาก', medium: 'เร่งด่วน', low: 'ไม่เร่งด่วน' })[u] || 'เร่งด่วน'

export const mapStatus = (s) =>
  ({
    pending: 'รอดำเนินการ',
    in_progress: 'กำลังดำเนินการ',
    done: 'เสร็จสิ้น',
    cancel: 'ยกเลิก',
  })[s] || 'รอดำเนินการ'

export const mapStockStatus = (s) =>
  ({
    waiting: 'รอดำเนินการ',
    approved: 'อนุมัติ',
    rejected: 'ปฏิเสธ',
    completed: 'เสร็จสิ้น',
  })[s] || '-'
