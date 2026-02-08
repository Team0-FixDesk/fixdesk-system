import { formatDateTH } from '@/utils/date.util'

export function buildRepairDescription(repair) {
  const location = repair.bd_name ? `${repair.bd_name} ${repair.fl_name} ${repair.room_name}` : '-'

  return 'วันที่แจ้ง: ' + formatDateTH(repair.rf_create_at) + '<br>' + 'สถานที่: ' + location
}
