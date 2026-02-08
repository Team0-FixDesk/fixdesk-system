export function formatDateTH(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('th-TH')
}

export function extractThaiDateFromCell(cell) {
  const match = String(cell).match(/วันที่แจ้ง:\s*([\d/]+)/)
  return match ? match[1] : null
}

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

export function formatFullThaiDate(dateValue) {
  if (!dateValue) return '-'

  return new Date(dateValue).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

