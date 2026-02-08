export function formatDateTimeTH(value) {
  if (!value) return null

  const date = new Date(value).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const time = new Date(value).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return `${date} เวลา ${time}`
}

export function buildTimelineFromRepair(repairData) {
  const timelineSteps = []

  const statusConfigs = [
    { key: 'rf_create_at', title: 'รอดำเนินการ', description: 'ระบบได้รับใบแจ้งซ่อมของคุณแล้ว' },
    {
      key: 'rf_in_process_at',
      title: 'กำลังดำเนินการ',
      description: 'เจ้าหน้าที่กำลังดำเนินการซ่อมแซม',
    },
    { key: 'rf_done_at', title: 'ดำเนินการเสร็จสิ้น', description: 'งานซ่อมเสร็จเรียบร้อยแล้ว' },
  ]

  let lastReachedIndex = -1

  statusConfigs.forEach((status, index) => {
    if (repairData[status.key]) lastReachedIndex = index
  })

  statusConfigs.forEach((status, index) => {
    const isReached = index <= lastReachedIndex
    const isCurrent = index === lastReachedIndex
    const isLastStep = index === statusConfigs.length - 1

    let stepState = 'upcoming'

    if (isReached) {
      if (isLastStep) stepState = 'completed'
      else if (isCurrent) stepState = 'current'
      else stepState = 'completed'
    }

    timelineSteps.push({
      displayTime: repairData[status.key] ? formatDateTimeTH(repairData[status.key]) : null,
      title: status.title,
      description: isReached ? status.description : null,
      stepState,
    })
  })

  return timelineSteps
}
