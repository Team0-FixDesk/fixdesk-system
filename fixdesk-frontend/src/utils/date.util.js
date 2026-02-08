export function formatDateTH(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('th-TH')
}

export function extractThaiDateFromCell(cell) {
  const match = String(cell).match(/วันที่แจ้ง:\s*([\d/]+)/)
  return match ? match[1] : null
}

