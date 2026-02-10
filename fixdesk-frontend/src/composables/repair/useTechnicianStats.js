import { computed } from 'vue'

export function useTechnicianStats(repairRequests) {
  function isToday(date) {
    if (!date) return false

    return new Date(date).toDateString() === new Date().toDateString()
  }

  const statItems = computed(() => [
    {
      value: repairRequests.value.filter((r) => isToday(r.rawDate)).length,
      label: 'งานมอบหมายใหม่วันนี้',
      colorClass: 'text-amber-500',
      filterStatus: 'today',
    },
    {
      value: repairRequests.value.filter((r) => r.rf_user_status === 'in_progress').length,
      label: 'กำลังดำเนินการ',
      colorClass: 'text-blue-600',
      filterStatus: 'in_progress',
    },
    {
      value: repairRequests.value.filter((r) => r.rf_user_status === 'done').length,
      label: 'ดำเนินการเสร็จสิ้นทั้งหมด',
      colorClass: 'text-green-600',
      filterStatus: 'done',
    },
    {
      value: repairRequests.value.filter((r) => r.rf_user_status === 'cancel').length,
      label: 'งานที่ยกเลิก',
      colorClass: 'text-red-600',
      filterStatus: 'cancel',
    },
  ])

  return {
    statItems,
  }
}
